import type { SupabaseClient } from '@supabase/supabase-js';
import type { Scenario } from '../utils/scenarioStorage';
import { listScenarios as listLocal, deleteScenario as deleteLocal } from '../utils/scenarioStorage';

interface RemoteConfig {
  savedAt: string;
  workers:     any[] | null;
  usageEvents: any[] | null;
  rateCards:   any[] | null;
}

function rowToScenario(row: Record<string, any>): Scenario {
  const cfg = (row.config_json ?? {}) as RemoteConfig;
  return {
    id:          row.id as string,
    name:        row.name as string,
    savedAt:     cfg.savedAt ?? (row.created_at as string),
    workers:     cfg.workers     ?? null,
    usageEvents: cfg.usageEvents ?? null,
    rateCards:   cfg.rateCards   ?? null,
  };
}

export async function listScenariosRemote(
  client: SupabaseClient,
  orgId: string,
): Promise<Scenario[]> {
  const { data, error } = await client
    .from('scenarios')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data as any[]) ?? []).map(rowToScenario);
}

export async function saveScenarioRemote(
  client: SupabaseClient,
  orgId: string,
  userId: string,
  s: Pick<Scenario, 'name' | 'workers' | 'usageEvents' | 'rateCards'>,
): Promise<Scenario> {
  const config: RemoteConfig = {
    savedAt:     new Date().toISOString(),
    workers:     s.workers     ?? null,
    usageEvents: s.usageEvents ?? null,
    rateCards:   s.rateCards   ?? null,
  };

  const { data, error } = await client
    .from('scenarios')
    .insert({ org_id: orgId, name: s.name.trim(), config_json: config, created_by: userId })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return rowToScenario(data as Record<string, any>);
}

export async function deleteScenarioRemote(
  client: SupabaseClient,
  orgId: string,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('scenarios')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
}

export async function renameScenarioRemote(
  client: SupabaseClient,
  orgId: string,
  id: string,
  name: string,
): Promise<void> {
  const { error } = await client
    .from('scenarios')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
}

/**
 * Copies any localStorage scenarios to Supabase then clears them.
 * Safe to call on every mount — detects empty localStorage and exits immediately.
 */
export async function migrateLocalScenarios(
  client: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<void> {
  const local = listLocal();
  if (local.length === 0) return;

  for (const s of local) {
    try {
      await saveScenarioRemote(client, orgId, userId, s);
      deleteLocal(s.id);
    } catch (err) {
      console.error('[migrateLocalScenarios] failed to migrate:', s.name, err);
    }
  }
}
