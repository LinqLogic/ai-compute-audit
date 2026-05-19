import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImportedDataState } from '../types/csvRows';
import type { ImportRow } from '../lib/database.types';

function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Persists the full imported state to the imports table for the given org. */
export async function persistImport(
  client: SupabaseClient,
  orgId: string,
  userId: string,
  imported: ImportedDataState,
): Promise<void> {
  const { error } = await client.from('imports').insert({
    org_id:            orgId,
    period_key:        currentPeriodKey(),
    workers_json:      imported.workers     ?? [],
    usage_events_json: imported.usageEvents ?? [],
    rate_cards_json:   imported.rateCards   ?? [],
    row_counts: {
      workers:     imported.workers?.length     ?? 0,
      usageEvents: imported.usageEvents?.length ?? 0,
      rateCards:   imported.rateCards?.length   ?? 0,
    },
    created_by: userId,
  });

  if (error) throw new Error(`persistImport: ${error.message}`);
}

/** Loads the most recent import for the org and returns it as ImportedDataState. */
export async function loadLatestImport(
  client: SupabaseClient,
  orgId: string,
): Promise<ImportedDataState | null> {
  const { data, error } = await client
    .from('imports')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[loadLatestImport]', error.message);
    return null;
  }
  if (!data) return null;

  const row = data as ImportRow;
  return {
    workers:     Array.isArray(row.workers_json)      ? (row.workers_json      as any[]) : null,
    usageEvents: Array.isArray(row.usage_events_json) ? (row.usage_events_json as any[]) : null,
    rateCards:   Array.isArray(row.rate_cards_json)   ? (row.rate_cards_json   as any[]) : null,
  };
}
