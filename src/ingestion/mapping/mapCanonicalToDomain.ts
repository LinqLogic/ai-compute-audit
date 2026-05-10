import { CanonicalWorkerRecord } from '../canonical/CanonicalWorkerRecord';
import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { CanonicalRateCardRecord } from '../canonical/CanonicalRateCardRecord';
import { WorkerRow, UsageEventRow, RateCardRow } from '../../types/csvRows';
import {
  buildColumnLookup, getValue,
  SYN_DEPARTMENT, SYN_COST_CENTER, SYN_MANAGER,
} from '../utils/columnMatching';

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

/**
 * Synthesize minimal WorkerRow stubs from usage canonical records that carry
 * identity information (email / name / department).  Used when a usage-only
 * CSV is uploaded and no worker file was provided, so the employee join in
 * buildEmployeesFromCsv resolves correctly.
 *
 * Deduplicates by the same ID priority used in mapUsageToRows so the join key
 * (UsageEventRow.employee_id ↔ WorkerRow.employee_id) always matches.
 */
export function inferWorkersFromUsageRecords(records: CanonicalUsageRecord[]): WorkerRow[] {
  if (records.length === 0) return [];

  // Build a lookup over the raw row keys so we can extract department/manager/
  // cost_center even though those fields aren't on CanonicalUsageRecord itself.
  const rawLookup = buildColumnLookup(Object.keys(records[0].raw));

  const seen = new Map<string, WorkerRow>();

  for (const r of records) {
    const id = r.employeeId ?? r.userId ?? r.email;
    if (!id || seen.has(id)) continue;

    const isEmail = id.includes('@');
    const derivedName = isEmail
      ? titleCase(id.split('@')[0].replace(/[._-]/g, ' '))
      : id;

    seen.set(id, {
      employee_id: id,
      name:        r.employeeName ?? derivedName,
      department:  getValue(r.raw, rawLookup, SYN_DEPARTMENT)  ?? 'Unknown',
      manager:     getValue(r.raw, rawLookup, SYN_MANAGER)     ?? '',
      cost_center: getValue(r.raw, rawLookup, SYN_COST_CENTER) ?? '',
      status:      'active',
      email:       isEmail ? id : (r.email ?? ''),
    });
  }

  return Array.from(seen.values());
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}
