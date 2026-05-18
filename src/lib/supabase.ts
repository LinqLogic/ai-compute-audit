import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
}

// Untyped client — query results are cast to explicit Row types at the call site.
// Supabase's Database generic requires TypeScript 5+ and is incompatible with CRA's TS 4.9.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnon);
