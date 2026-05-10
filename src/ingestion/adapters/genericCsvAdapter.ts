import { CanonicalWorkerRecord } from '../canonical/CanonicalWorkerRecord';
import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { CanonicalRateCardRecord } from '../canonical/CanonicalRateCardRecord';
import { AdapterOutput, IngestionWarning } from '../types';

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/[$,]/g, '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

export function adaptGenericWorkers(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalWorkerRecord> {
  const warnings: IngestionWarning[] = [];
  const records: CanonicalWorkerRecord[] = [];

  rows.forEach((r, i) => {
    const id = r.employee_id || r.id || '';
    if (!id) {
      warnings.push({ row: i + 2, message: 'Missing employee_id — row skipped' });
      return;
    }
    records.push({
      id,
      name:       r.name,
      email:      r.email,
      department: r.department,
      manager:    r.manager,
      costCenter: r.cost_center,
      status:     r.status,
      role:       r.role || r.job_title,
      raw: r,
    });
  });

  return { records, warnings };
}

export function adaptGenericUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  const warnings: IngestionWarning[] = [];
  const records: CanonicalUsageRecord[] = [];

  rows.forEach((r, i) => {
    const billedAmount = parseNum(r.billed_amount);
    if (billedAmount === undefined) {
      warnings.push({ row: i + 2, field: 'billed_amount', message: 'Missing or unparseable billed_amount' });
    }
    records.push({
      id:           r.event_id,
      employeeId:   r.employee_id,
      vendor:       r.provider || 'unknown',
      model:        r.model,
      product:      r.product,
      tokensIn:     parseNum(r.tokens_in),
      tokensOut:    parseNum(r.tokens_out),
      gpuHours:     parseNum(r.gpu_hours),
      billedAmount: billedAmount ?? 0,
      timestamp:    r.timestamp,
      raw: r,
    });
  });

  return { records, warnings };
}

export function adaptGenericRateCards(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalRateCardRecord> {
  const warnings: IngestionWarning[] = [];
  const records: CanonicalRateCardRecord[] = [];

  rows.forEach((r, i) => {
    if (!r.provider) {
      warnings.push({ row: i + 2, message: 'Missing provider — row skipped' });
      return;
    }
    records.push({
      provider:       r.provider,
      model:          r.model,
      unitBasis:      r.unit_basis,
      cost:           parseNum(r.rate) ?? parseNum(r.cost),
      markup:         parseNum(r.markup),
      effectiveStart: r.effective_start,
      effectiveEnd:   r.effective_end,
      raw: r,
    });
  });

  return { records, warnings };
}
