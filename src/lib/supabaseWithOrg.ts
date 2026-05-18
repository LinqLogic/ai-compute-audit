import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY!;

/**
 * Creates a per-request authenticated Supabase client.
 * The getToken callback is invoked on each fetch so Clerk's token cache
 * handles refresh transparently without re-creating the client.
 *
 * Untyped — query results are cast to explicit Row types at the call site.
 * Supabase's Database generic requires TypeScript 5+ (CRA ships TS 4.9).
 */
export function createOrgClient(
  getToken: () => Promise<string | null>,
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnon, {
    global: {
      fetch: async (url, options = {}) => {
        const token = await getToken();
        const headers = new Headers((options as RequestInit).headers);
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return fetch(url as RequestInfo, { ...(options as RequestInit), headers });
      },
    },
    auth: { persistSession: false },
  });
}
