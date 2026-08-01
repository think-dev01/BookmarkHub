import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAIEnrichment, generateTextEmbedding } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookmark_id, caption, thumbnail_url, audio_transcript, status } = body;

    if (!bookmark_id) {
      return NextResponse.json({ error: 'Missing bookmark_id' }, { status: 400 });
    }

    // Fetch existing bookmark
    const { data: bookmark, error: fetchErr } = await supabase
      .from('bookmarks')
      .select('*')
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

    return NextResponse.json({ ok: true, status: 'done', bookmark_id });
  } catch (err: any) {
    console.error('Worker callback error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
