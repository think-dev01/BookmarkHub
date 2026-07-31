import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  user_note: string | null;
  audio_transcript: string | null;
  processing_status: 'pending' | 'processing' | 'done' | 'failed';
  category_id: string | null;
  category_name?: string | null;
  tags: string[] | null;
  source_platform: string | null;
  ai_raw_response: any;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}
