import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon);
