import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrgRow } from '../lib/database.types';

/**
 * Upserts the Clerk organization into Supabase and returns its Supabase UUID.
 * Safe to call on every app load — only inserts if the org doesn't exist yet.
 */
export async function ensureOrgExists(
  client: SupabaseClient,
  clerkOrgId: string,
  name: string,
): Promise<string> {
  const { data: existing, error: readError } = await client
    .from('organizations')
    .select('*')
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (existing) return (existing as OrgRow).id;

  const { data: created, error: insertError } = await client
    .from('organizations')
    .insert({ clerk_org_id: clerkOrgId, name, plan: 'free' })
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);
  return (created as OrgRow).id;
}
