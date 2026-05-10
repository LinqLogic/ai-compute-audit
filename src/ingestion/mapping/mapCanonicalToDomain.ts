import { CanonicalWorkerRecord } from '../canonical/CanonicalWorkerRecord';
import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { CanonicalRateCardRecord } from '../canonical/CanonicalRateCardRecord';
import { WorkerRow, UsageEventRow, RateCardRow } from '../../types/csvRows';

export function mapWorkersToRows(records: CanonicalWorkerRecord[]): WorkerRow[] {
  return records.map(r => ({
    employee_id: r.id,
    name:        r.name        ?? '',
    department:  r.department  ?? 'Unknown',
    manager:     r.manager     ?? '',
    cost_center: r.costCenter  ?? '',
    status:      r.status      ?? 'active',
    email:       r.email       ?? '',
  }));
}

export function mapUsageToRows(records: CanonicalUsageRecord[]): UsageEventRow[] {
  return records.map((r, i) => ({
    event_id:      r.id          ?? `auto-${Date.now()}-${i}`,
    employee_id:   r.employeeId  ?? r.userId ?? r.email ?? '',
    provider:      r.vendor,
    product:       r.product     ?? r.model  ?? '',
    model:         r.model       ?? '',
    event_type:    'api_call',
    tokens_in:     String(r.tokensIn     ?? 0),
    tokens_out:    String(r.tokensOut    ?? 0),
    gpu_hours:     String(r.gpuHours     ?? 0),
    billed_amount: String(r.billedAmount ?? 0),
    timestamp:     r.timestamp   ?? new Date().toISOString(),
  }));
}

export function mapRateCardsToRows(records: CanonicalRateCardRecord[]): RateCardRow[] {
  return records.map(r => ({
    provider:        r.provider,
    model:           r.model          ?? '',
    unit_basis:      r.unitBasis      ?? '1m_tokens',
    rate:            String(r.cost    ?? 0),
    markup:          String(r.markup  ?? 0.15),
    effective_start: r.effectiveStart ?? '',
    effective_end:   r.effectiveEnd   ?? '',
  }));
}
