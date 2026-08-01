import { NextRequest, NextResponse } from 'next/server';
import { scrapeOpenGraph } from '@/lib/opengraph';
import { supabase } from '@/lib/supabase';
import { sendTelegramMessage, editTelegramMessage, answerCallbackQuery, getFallbackUsageGuideMessage } from '@/lib/telegram';
import { generateAIEnrichment, generateTextEmbedding } from '@/lib/ai';
import { triggerAudioExtractionWorker } from '@/lib/github';

export async function POST(req: NextRequest) {
  try {
    // Verify Telegram Webhook Secret Token if configured
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && secretHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
    }

    const update = await req.json();

    // 1. Handle Inline Keyboard Button Callbacks
    if (update.callback_query) {
      const cb = update.callback_query;
      const data: string = cb.data || '';
      const chatId = cb.message.chat.id;
      const messageId = cb.message.message_id;

      if (data.startsWith('save:')) {
        const bookmarkId = data.split(':')[1];
        await answerCallbackQuery(cb.id, '✅ Bookmark berhasil dikonfirmasi dan disimpan!');
        await editTelegramMessage({
          chat_id: chatId,
          message_id: messageId,
          text: `✅ *Bookmark Resmi Tersimpan!*\n\nData telah diperbarui di Supabase Database dan dapat diakses & diedit kapan saja melalui Dashboard Web.`,
        });
      } else if (data.startsWith('delete:')) {
        const bookmarkId = data.split(':')[1];
        await supabase.from('bookmarks').delete().eq('id', bookmarkId);
        await answerCallbackQuery(cb.id, '❌ Bookmark dibatalkan & dihapus.');
        await editTelegramMessage({
          chat_id: chatId,
          message_id: messageId,
          text: `🗑️ *Bookmark Dibatalkan*\n\nData telah dihapus dari database.`,
        });
      } else if (data.startsWith('cat_menu:')) {
        const bookmarkId = data.split(':')[1];
        await answerCallbackQuery(cb.id, '📁 Pilih Kategori yang sesuai:');
        await editTelegramMessage({
          chat_id: chatId,
          message_id: messageId,
          text: `📁 *Pilih Kategori Bookmark Manual*\n\nSilakan pilih salah satu kategori utama di bawah ini:`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💻 Teknologi & Coding', callback_data: `set_cat:${bookmarkId}:Teknologi & Coding` },
                { text: '🎨 Desain & UI/UX', callback_data: `set_cat:${bookmarkId}:Desain & UI/UX` }
              ],
              [
                { text: '📈 Bisnis & Marketing', callback_data: `set_cat:${bookmarkId}:Bisnis & Marketing` },
                { text: '⚡ Produktivitas', callback_data: `set_cat:${bookmarkId}:Produktivitas` }
              ],
              [
                { text: '📚 Edukasi & Tutorial', callback_data: `set_cat:${bookmarkId}:Edukasi & Tutorial` },
                { text: '🏠 Gaya Hidup', callback_data: `set_cat:${bookmarkId}:Gaya Hidup` }
              ],
              [
                { text: '⬅️ Selesai / Kembali', callback_data: `save:${bookmarkId}` }
              ]
            ]
          }
        });
      } else if (data.startsWith('set_cat:')) {
        const parts = data.split(':');
        const bookmarkId = parts[1];
        const catName = parts.slice(2).join(':');

        let categoryId: string | null = null;
        const { data: existingCat } = await supabase.from('categories').select('id').eq('name', catName).maybeSingle();
        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat } = await supabase.from('categories').insert({ name: catName }).select('id').single();
          if (newCat) categoryId = newCat.id;
        }

        await supabase.from('bookmarks').update({ category_id: categoryId }).eq('id', bookmarkId);

        await answerCallbackQuery(cb.id, `✅ Kategori diubah ke: ${catName}`);
        await editTelegramMessage({
          chat_id: chatId,
          message_id: messageId,
          text: `✅ *Kategori Berhasil Diperbarui!*\n\n📁 *Kategori Baru*: *${catName}*\n\nCatatan: Anda juga dapat mengubah judul, ringkasan, dan foto thumbnail secara bebas di Dashboard Web.`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📁 Ubah Kategori Lagi', callback_data: `cat_menu:${bookmarkId}` },
                { text: '✅ Selesai', callback_data: `save:${bookmarkId}` }
              ]
            ]
          }
        });
      } else if (data.startsWith('add_note:')) {
        await answerCallbackQuery(cb.id, '💡 Kirim pesan baru beserta catatan Anda.');
        await sendTelegramMessage({
          chat_id: chatId,
          text: `💡 *Petunjuk Menambah Catatan Manual:*\n\nAnda dapat mengirimkan pesan link yang disertai teks catatan Anda di Telegram, contoh:\n\n\`https://instagram.com/p/xyz Ini catatan: membahas tentang React Server Components\`\n\nAI akan memprioritaskan catatan Anda sebagai konteks utama ringkasan!`,
        });
      } else if (data.startsWith('info:')) {
        await answerCallbackQuery(cb.id, 'ℹ️ Buka Dashboard Web untuk pengeditan lengkap.');
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text: string = message.text.trim();

    // 2. Extract URL from text using Regex
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urlMatch = text.match(urlRegex);

    if (!urlMatch || urlMatch.length === 0) {
      // Direct Fallback Reply if non-URL text
      await sendTelegramMessage({
        chat_id: chatId,
        text: getFallbackUsageGuideMessage(),
      });
      return NextResponse.json({ ok: true });
    }

    const rawUrl = urlMatch[0];
    const userNote = text.replace(rawUrl, '').trim();

    // 3. Phase A (Sync) - Instant Metadata Scraping & AI Draft
    const og = await scrapeOpenGraph(rawUrl);

    // Generate initial AI draft based on OpenGraph, User Note, and Gemini Vision OCR
    const initialAiResult = await generateAIEnrichment({
      ogTitle: og.title,
      ogDescription: og.description,
      ogImage: og.thumbnail || undefined,
      userNote: userNote,
      platform: og.platform,
    });

    // Create or find Category ID
    let categoryId: string | null = null;
    if (initialAiResult.category) {
      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', initialAiResult.category)
        .maybeSingle();

      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const { data: newCat } = await supabase
          .from('categories')
          .insert({ name: initialAiResult.category })
          .select('id')
          .single();
        if (newCat) categoryId = newCat.id;
      }
    }

    // Insert Bookmark into Supabase with 'pending' status
    const { data: bookmark, error: dbErr } = await supabase
      .from('bookmarks')
      .insert({
        url: rawUrl,
        title: initialAiResult.title,
        summary: initialAiResult.summary,
        thumbnail_url: og.thumbnail || null,
        user_note: userNote || null,
        processing_status: 'pending',
        category_id: categoryId,
        tags: initialAiResult.tags,
        source_platform: og.platform,
        ai_raw_response: initialAiResult.raw_response,
      })
      .select('id')
      .single();

    if (dbErr || !bookmark) {
      console.error('Database insert error:', dbErr);
      await sendTelegramMessage({
        chat_id: chatId,
        text: `⚠️ *Gagal Menyimpan Bookmark*\n\nTerjadi kesalahan koneksi database: ${dbErr?.message || 'Unknown error'}`,
      });
      return NextResponse.json({ ok: true });
    }

    // Reply Telegram with Phase A status
    const replyText = `🔄 *Metadata Tersimpan — Memproses Audio...*

📌 *Judul*: ${initialAiResult.title}
📁 *Kategori*: ${initialAiResult.category}
🏷️ *Tags*: ${initialAiResult.tags.map(t => `#${t}`).join(' ')}

💡 *Ringkasan Awal (Caption)*:
${initialAiResult.summary}

⚙️ _Audio Reels/TikTok sedang diekstrak secara asinkron via GitHub Actions. Hasil transkrip penuh akan diperbarui otomatis dalam 30-60 detik..._`;

    const telegramReply = await sendTelegramMessage({
      chat_id: chatId,
      text: replyText,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📁 Ubah Kategori', callback_data: `cat_menu:${bookmark.id}` },
            { text: '✏️ Tambah Catatan', callback_data: `add_note:${bookmark.id}` }
          ],
          [
            { text: '✅ Simpan Bookmark', callback_data: `save:${bookmark.id}` },
            { text: '❌ Hapus', callback_data: `delete:${bookmark.id}` }
          ]
        ]
      }
    });

    // 4. Trigger Asynchronous GitHub Actions Audio Worker
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const callbackUrl = `${protocol}://${host}/api/worker/callback`;

    await triggerAudioExtractionWorker({
      bookmark_id: bookmark.id,
      url: rawUrl,
      callback_url: callbackUrl,
    });

    return NextResponse.json({ ok: true, bookmark_id: bookmark.id });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
