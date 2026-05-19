import type { SupabaseClient } from '@supabase/supabase-js';
import type { MeterEventRow } from '../lib/database.types';

function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Records a metered usage event (e.g. import, export). */
export async function writeMeterEvent(
  client: SupabaseClient,
  orgId: string,
  eventType: string,
  quantity = 1,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await client.from('meter_events').insert({
    org_id:     orgId,
    event_type: eventType,
    quantity,
    period_key: currentPeriodKey(),
    metadata,
  });
  if (error) console.error(`[meter] ${eventType}:`, error.message);
}

/**
 * Returns the total quantity for a given event type in the current billing period.
 */
export async function getMeterCount(
  client: SupabaseClient,
  orgId: string,
  eventType: string,
  periodKey = currentPeriodKey(),
): Promise<number> {
  const { data, error } = await client
    .from('meter_events')
    .select('quantity')
    .eq('org_id', orgId)
    .eq('event_type', eventType)
    .eq('period_key', periodKey);

  if (error) {
    console.error('[meter] getMeterCount:', error.message);
    return 0;
  }

  return ((data as Pick<MeterEventRow, 'quantity'>[]) ?? [])
    .reduce((sum, row) => sum + row.quantity, 0);
}
