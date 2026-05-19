import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditLogRow } from '../lib/database.types';

export type AuditEventType =
  | 'import_completed'
  | 'import_reset'
  | 'exception_approved'
  | 'exception_escalated'
  | 'action_item_dismissed'
  | 'report_exported'
  | 'close_step_completed'
  | 'scenario_saved'
  | 'scenario_deleted';

export interface AuditPayload {
  [key: string]: unknown;
}

/** Writes a single audit event to the audit_log table. Fire-and-forget safe. */
export async function writeAuditEvent(
  client: SupabaseClient,
  orgId: string,
  actorClerkId: string,
  eventType: AuditEventType,
  payload: AuditPayload = {},
): Promise<void> {
  const { error } = await client.from('audit_log').insert({
    org_id:         orgId,
    event_type:     eventType,
    actor_clerk_id: actorClerkId,
    payload,
  });
  if (error) console.error(`[auditLog] ${eventType}:`, error.message);
}

/** Loads the most recent audit events for the org (newest first). */
export async function loadAuditLog(
  client: SupabaseClient,
  orgId: string,
  limit = 50,
): Promise<AuditLogRow[]> {
  const { data, error } = await client
    .from('audit_log')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[auditLog] loadAuditLog:', error.message);
    return [];
  }
  return (data as AuditLogRow[]) ?? [];
}
