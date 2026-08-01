import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateTextEmbedding } from '@/lib/ai';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const platform = searchParams.get('platform') || '';
    const mode = searchParams.get('mode') || 'all'; // 'all' | 'semantic'

    // Semantic Vector Search Mode
    if (mode === 'semantic' && search.trim()) {
      const queryEmbedding = await generateTextEmbedding(search);
      if (queryEmbedding) {
        const { data: vectorResults, error: vectorErr } = await supabase.rpc('match_bookmarks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.2,
          match_count: 20,
        });

        if (!vectorErr && vectorResults) {
          return NextResponse.json({ bookmarks: vectorResults });
        }
      }
    }

    // Default Supabase Query (Full-Text Search & Filters)
    let query = supabase
      .from('bookmarks')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category_id', category);
    }
    if (platform) {
      query = query.eq('source_platform', platform);
    }
    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%,audio_transcript.ilike.%${search}%`);
    }

    const { data: bookmarks, error } = await query;
    if (error) throw error;

    // Format response to include category_name
    const formatted = (bookmarks || []).map((b: any) => ({
      ...b,
      category_name: b.categories?.name || 'Umum',
    }));

    return NextResponse.json({ bookmarks: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, summary, user_note, category_id, tags, thumbnail_url } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { data, error } = await supabase
      .from('bookmarks')
      .update({ title, summary, user_note, category_id, tags, thumbnail_url })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ bookmark: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
