import { useSession } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { createOrgClient } from '../lib/supabaseWithOrg';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns an authenticated Supabase client for the current Clerk session.
 * Uses the 'supabase' JWT template — configure it in Clerk Dashboard under
 * JWT Templates to include org_id in claims so Supabase RLS can read it.
 */
export function useSupabase(): SupabaseClient | null {
  const { session } = useSession();

  return useMemo(() => {
    if (!session) return null;
    return createOrgClient(() =>
      session.getToken({ template: 'supabase' }) as Promise<string | null>,
    );
  }, [session]);
}
