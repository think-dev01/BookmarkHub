import { NextRequest, NextResponse } from 'next/server';
import { scrapeOpenGraph } from '@/lib/opengraph';
import { supabase } from '@/lib/supabase';
import { sendTelegramMessage, editTelegramMessage, answerCallbackQuery, getFallbackUsageGuideMessage, getTelegramFileUrl } from '@/lib/telegram';
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
        await answerCallbackQuery(cb.id, '✅ Bookmark resmi disimpan!');
        await editTelegramMessage({
          chat_id: chatId,
          message_id: messageId,
          text: `✅ *Bookmark Resmi Tersimpan & Difinalkan!*\n\nData telah disimpan di Supabase Database dan dapat diakses kapan saja melalui Dashboard Web.`,
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
      } else if (data.startsWith('preview:')) {
        const bookmarkId = data.split(':')[1];
        const { data: b } = await supabase.from('bookmarks').select('*, categories(name)').eq('id', bookmarkId).maybeSingle();
        if (b) {
          const catName = b.categories?.name || 'Umum';
          const tagsFormatted = (b.tags || []).map((t: string) => `#${t}`).join(' ');
          const previewText = `📌 *Judul*: ${b.title}\n📁 *Kategori*: *${catName}*\n🏷️ *Tags*: ${tagsFormatted || 'Tidak ada'}\n\n💡 *Ringkasan*:\n${b.summary || 'Belum ada'}\n\n💬 *Catatan*: ${b.user_note || 'Tidak ada'}`;
          
          await editTelegramMessage({
            chat_id: chatId,
            message_id: messageId,
            text: previewText,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✏️ Edit Metadata', callback_data: `edit_menu:${bookmarkId}` },
                  { text: '📁 Ubah Kategori', callback_data: `cat_menu:${bookmarkId}` }
                ],
                [
                  { text: '✅ Selesai & Simpan', callback_data: `save:${bookmarkId}` },
                  { text: '❌ Hapus', callback_data: `delete:${bookmarkId}` }
                ]
              ]
            }
          });
        }
      } else if (data.startsWith('edit_menu:')) {
        const bookmarkId = data.split(':')[1];
        await answerCallbackQuery(cb.id, '✏️ Pilih bidang data yang ingin di-edit:');
        await editTelegramMessage({
          chat_id: chatId,
          message_id: messageId,
          text: `✏️ *Menu Edit Metadata Bookmark*\n\nPilih salah satu bidang data di bawah ini untuk Anda ubah:`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📌 1. Judul', callback_data: `prompt:title:${bookmarkId}` },
                { text: '📁 2. Kategori', callback_data: `cat_menu:${bookmarkId}` }
              ],
              [
                { text: '🏷️ 3. Tags', callback_data: `prompt:tags:${bookmarkId}` },
                { text: '💡 4. Ringkasan', callback_data: `prompt:summary:${bookmarkId}` }
              ],
              [
                { text: '💬 5. Catatan Pribadi', callback_data: `prompt:note:${bookmarkId}` }
              ],
              [
                { text: '⬅️ Kembali', callback_data: `preview:${bookmarkId}` },
                { text: '✅ Selesai & Submit', callback_data: `save:${bookmarkId}` }
              ]
            ]
          }
        });
      } else if (data.startsWith('cat_menu:')) {
        const bookmarkId = data.split(':')[1];
        await answerCallbackQuery(cb.id, '📁 Pilih Kategori:');
        await editTelegramMessage({
          chat_id: chatId,
          message_id: messageId,
          text: `📁 *Pilih Kategori Bookmark Manual*\n\nPilih kategori yang sesuai (pilihan ini tidak akan langsung meng-submit):`,
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
                { text: '⬅️ Kembali ke Edit Menu', callback_data: `edit_menu:${bookmarkId}` },
                { text: '✅ Selesai & Submit', callback_data: `save:${bookmarkId}` }
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
          text: `✅ *Kategori Diperbarui*: *${catName}*\n\nAnda dapat meng-edit bidang data lain atau menekan tombol Kembali tanpa langsung meng-submit.`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✏️ Edit Bidang Lain', callback_data: `edit_menu:${bookmarkId}` },
                { text: '📁 Ubah Kategori Lagi', callback_data: `cat_menu:${bookmarkId}` }
              ],
              [
                { text: '⬅️ Kembali', callback_data: `preview:${bookmarkId}` },
                { text: '✅ Selesai & Submit', callback_data: `save:${bookmarkId}` }
              ]
            ]
          }
        });
      } else if (data.startsWith('prompt:')) {
        const parts = data.split(':');
        const field = parts[1];
        const bookmarkId = parts[2];

        const fieldLabels: Record<string, string> = {
          title: '📌 Judul',
          tags: '🏷️ Tags',
          summary: '💡 Ringkasan',
          note: '💬 Catatan Pribadi'
        };

        const label = fieldLabels[field] || field;

        await answerCallbackQuery(cb.id, `✏️ Tuliskan ${label} baru Anda:`);
        await sendTelegramMessage({
          chat_id: chatId,
          text: `✏️ *Ketikkan ${label} Baru Anda di Bawah Ini:*\n\n_(Langsung ketikkan teksnya dan tekan Send. Tidak perlu menyalin kode apapun!)_\n\n\`[ID:${bookmarkId}:field:${field}]\``,
          reply_markup: {
            force_reply: true
          }
        });
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;

    // 2A. Direct Photo / Screenshot Upload Processing (Gemini Vision OCR)
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1];
      const photoUrl = await getTelegramFileUrl(photo.file_id);
      const userNote = (message.caption || '').trim();

      if (photoUrl) {
        const aiResult = await generateAIEnrichment({
          ogTitle: userNote || 'Screenshot Infografis',
          ogDescription: userNote,
          ogImage: photoUrl,
          userNote: userNote,
          platform: 'other',
        });

        let categoryId: string | null = null;
        if (aiResult.category) {
          const { data: existingCat } = await supabase.from('categories').select('id').eq('name', aiResult.category).maybeSingle();
          if (existingCat) {
            categoryId = existingCat.id;
          } else {
            const { data: newCat } = await supabase.from('categories').insert({ name: aiResult.category }).select('id').single();
            if (newCat) categoryId = newCat.id;
          }
        }

        const { data: bookmark } = await supabase.from('bookmarks').insert({
          url: photoUrl,
          title: aiResult.title,
          summary: aiResult.summary,
          thumbnail_url: photoUrl,
          user_note: userNote || null,
          processing_status: 'done',
          category_id: categoryId,
          tags: aiResult.tags,
          source_platform: 'other',
          ai_raw_response: aiResult.raw_response,
        }).select('id').single();

        const replyText = `🖼️ *Teks Foto Berhasil Dipindai (Gemini Vision AI)*

📌 *Judul*: ${aiResult.title}
📁 *Kategori*: ${aiResult.category}
🏷️ *Tags*: ${aiResult.tags.map(t => `#${t}`).join(' ')}

💡 *Hasil Ringkasan Teks Gambar*:
${aiResult.summary}`;

        if (bookmark) {
          await sendTelegramMessage({
            chat_id: chatId,
            text: replyText,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✏️ Edit Metadata', callback_data: `edit_menu:${bookmark.id}` },
                  { text: '📁 Ubah Kategori', callback_data: `cat_menu:${bookmark.id}` }
                ],
                [
                  { text: '✅ Selesai & Submit', callback_data: `save:${bookmark.id}` },
                  { text: '❌ Hapus', callback_data: `delete:${bookmark.id}` }
                ]
              ]
            }
          });
        }
        return NextResponse.json({ ok: true });
      }
    }

    const text: string = (message.text || '').trim();
    const replyContextText = message.reply_to_message?.text || '';
    const combinedText = `${text} ${replyContextText}`;

    // 2B. Handle Field Edit Replies (ForceReply ID pattern OR flexible hashtag pattern)
    const replyContextMatch = replyContextText.match(/\[ID:([a-f0-9-]+):field:(title|tags|summary|note)\]/i);
    const setTagMatch = combinedText.match(/#?set_?(title|tags|summary|note)_?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i) ||
                        combinedText.match(/#?set_?(title|tags|summary|note)_?([a-f0-9-]+)/i);

    let targetBookmarkId: string | null = null;
    let targetField: string | null = null;

    if (replyContextMatch) {
      targetBookmarkId = replyContextMatch[1];
      targetField = replyContextMatch[2].toLowerCase();
    } else if (setTagMatch) {
      targetField = setTagMatch[1].toLowerCase();
      targetBookmarkId = setTagMatch[2];
    }

    if (targetBookmarkId && targetField) {
      const cleanValue = text
        .replace(/#?set_?(title|tags|summary|note)_?[a-f0-9-]+/gi, '')
        .replace(/\[ID:[a-f0-9-]+:field:(title|tags|summary|note)\]/gi, '')
        .trim();

      if (cleanValue) {
        let updateData: any = {};
        if (targetField === 'title') updateData.title = cleanValue;
        if (targetField === 'summary') updateData.summary = cleanValue;
        if (targetField === 'note') updateData.user_note = cleanValue;
        if (targetField === 'tags') {
          updateData.tags = cleanValue.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
        }

        await supabase.from('bookmarks').update(updateData).eq('id', targetBookmarkId);

        const fieldLabels: Record<string, string> = {
          title: '📌 Judul',
          tags: '🏷️ Tags',
          summary: '💡 Ringkasan',
          note: '💬 Catatan'
        };

        await sendTelegramMessage({
          chat_id: chatId,
          text: `✅ *${fieldLabels[targetField] || targetField} Berhasil Diperbarui!*\n\n*Nilai Baru*:\n${cleanValue}\n\nAnda dapat meng-edit bidang data lain atau menekan tombol Selesai & Submit saat siap.`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✏️ Edit Bidang Lain', callback_data: `edit_menu:${targetBookmarkId}` },
                { text: '📁 Ubah Kategori', callback_data: `cat_menu:${targetBookmarkId}` }
              ],
              [
                { text: '⬅️ Kembali ke Preview', callback_data: `preview:${targetBookmarkId}` },
                { text: '✅ Selesai & Submit', callback_data: `save:${targetBookmarkId}` }
              ]
            ]
          }
        });
        return NextResponse.json({ ok: true });
      }
    }

    // 2C. Extract URL from text using Regex
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
            { text: '✏️ Edit Metadata (Judul/Tags/dll)', callback_data: `edit_menu:${bookmark.id}` },
            { text: '📁 Ubah Kategori', callback_data: `cat_menu:${bookmark.id}` }
          ],
          [
            { text: '✅ Selesai & Submit', callback_data: `save:${bookmark.id}` },
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
