import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAIEnrichment, generateTextEmbedding } from '@/lib/ai';
import { editTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookmark_id, caption, thumbnail_url, audio_transcript, chat_id, message_id, status } = body;

    if (!bookmark_id) {
      return NextResponse.json({ error: 'Missing bookmark_id' }, { status: 400 });
    }

    // Fetch existing bookmark
    const { data: bookmark, error: fetchErr } = await supabase
      .from('bookmarks')
      .select('*, categories(name)')
      .eq('id', bookmark_id)
      .single();

    if (fetchErr || !bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    const effectiveText = caption || audio_transcript || '';

    if (!effectiveText && status === 'failed') {
      await supabase
        .from('bookmarks')
        .update({ processing_status: 'failed' })
        .eq('id', bookmark_id);

      return NextResponse.json({ message: 'No content extracted' });
    }

    // Re-run AI enrichment with full Instagram caption fetched by yt-dlp & audio transcript
    const fullEnrichment = await generateAIEnrichment({
      ogTitle: bookmark.title,
      ogDescription: caption || bookmark.summary || '',
      userNote: bookmark.user_note || undefined,
      audioTranscript: audio_transcript || undefined,
      platform: bookmark.source_platform || 'other',
    });

    // Generate vector embedding for semantic search
    const textToEmbed = `${fullEnrichment.title} ${fullEnrichment.summary} ${audio_transcript || ''} ${caption || ''}`;
    const embedding = await generateTextEmbedding(textToEmbed);

    // Update database record to 'done'
    const updatePayload: any = {
      title: fullEnrichment.title,
      summary: fullEnrichment.summary,
      audio_transcript: audio_transcript || null,
      tags: fullEnrichment.tags,
      ai_raw_response: fullEnrichment.raw_response,
      processing_status: 'done',
      embedding: embedding,
    };

    if (thumbnail_url && !bookmark.thumbnail_url) {
      updatePayload.thumbnail_url = thumbnail_url;
    }

    const { error: updateErr } = await supabase
      .from('bookmarks')
      .update(updatePayload)
      .eq('id', bookmark_id);

    if (updateErr) {
      console.error('Supabase update error on worker callback:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Live Edit Telegram Message on User's Screen when Phase B finishes!
    if (chat_id && message_id) {
      const categoryName = bookmark.categories?.name || fullEnrichment.category || 'Umum';
      const tagsFormatted = (fullEnrichment.tags || []).map((t: string) => `#${t}`).join(' ');

      const updatedTelegramText = `✨ *Metadata & AI Analysis Diperbarui (Worker Complete)*\n\n📌 *Judul*: ${fullEnrichment.title}\n📁 *Kategori*: *${categoryName}*\n🏷️ *Tags*: ${tagsFormatted}\n\n💡 *Hasil Ringkasan AI Penuh (Caption & Transkrip)*:\n${fullEnrichment.summary}\n\n💬 *Catatan*: ${bookmark.user_note || 'Tidak ada'}`;

      await editTelegramMessage({
        chat_id: chat_id,
        message_id: message_id,
        text: updatedTelegramText,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Edit Metadata', callback_data: `edit_menu:${bookmark_id}` },
              { text: '📁 Ubah Kategori', callback_data: `cat_menu:${bookmark_id}` }
            ],
            [
              { text: '✅ Selesai & Submit', callback_data: `save:${bookmark_id}` },
              { text: '❌ Hapus', callback_data: `delete:${bookmark_id}` }
            ]
          ]
        }
      });
    }

    return NextResponse.json({ ok: true, status: 'done', bookmark_id });
  } catch (err: any) {
    console.error('Worker callback error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
