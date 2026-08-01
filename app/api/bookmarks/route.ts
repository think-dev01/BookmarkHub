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
    const { id, title, summary, user_note, category_id, category_name, tags, thumbnail_url } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    let finalCategoryId = category_id;

    // Handle new category creation if category_name is provided
    if (!finalCategoryId && category_name) {
      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', category_name.trim())
        .maybeSingle();

      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const { data: newCat } = await supabase
          .from('categories')
          .insert({ name: category_name.trim() })
          .select('id')
          .single();
        if (newCat) finalCategoryId = newCat.id;
      }
    }

    // Regenerate vector embedding for updated search
    const textToEmbed = `${title || ''} ${summary || ''} ${user_note || ''}`;
    const embedding = await generateTextEmbedding(textToEmbed);

    const updatePayload: any = {
      title,
      summary,
      user_note,
      category_id: finalCategoryId,
      tags,
      thumbnail_url,
    };
    if (embedding) {
      updatePayload.embedding = embedding;
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .update(updatePayload)
      .eq('id', id)
      .select('*, categories(name)')
      .single();

    if (error) throw error;

    const formatted = {
      ...data,
      category_name: data.categories?.name || 'Umum',
    };

    return NextResponse.json({ bookmark: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
