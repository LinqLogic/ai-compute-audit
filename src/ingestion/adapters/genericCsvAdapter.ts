import { CanonicalWorkerRecord } from '../canonical/CanonicalWorkerRecord';
import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { CanonicalRateCardRecord } from '../canonical/CanonicalRateCardRecord';
import { AdapterOutput, IngestionWarning } from '../types';
import {
  buildColumnLookup, getValue,
  SYN_EMPLOYEE_ID, SYN_EMPLOYEE_EMAIL, SYN_EMPLOYEE_NAME,
  SYN_DEPARTMENT, SYN_MANAGER, SYN_COST_CENTER, SYN_STATUS, SYN_ROLE,
  SYN_EVENT_ID, SYN_INPUT_TOKENS, SYN_OUTPUT_TOKENS, SYN_TOTAL_TOKENS,
  SYN_GPU_HOURS, SYN_TOTAL_COST, SYN_PROVIDER, SYN_MODEL, SYN_TIMESTAMP,
  SYN_REQUESTS, SYN_UNIT_COST, SYN_CURRENCY, SYN_PERIOD_START, SYN_PERIOD_END,
  SYN_UNIT_BASIS, SYN_MARKUP, SYN_RATE,
} from '../utils/columnMatching';

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
  if (rows.length === 0) return { records: [], warnings: [] };
  const lookup   = buildColumnLookup(Object.keys(rows[0]));
  const warnings: IngestionWarning[]    = [];
  const records:  CanonicalWorkerRecord[] = [];

  rows.forEach((r, i) => {
    const id = getValue(r, lookup, SYN_EMPLOYEE_ID) ?? '';
    if (!id) {
      warnings.push({ row: i + 2, message: 'Missing employee_id — row skipped' });
      return;
    }
    records.push({
      id,
      name:       getValue(r, lookup, SYN_EMPLOYEE_NAME),
      email:      getValue(r, lookup, SYN_EMPLOYEE_EMAIL),
      department: getValue(r, lookup, SYN_DEPARTMENT),
      manager:    getValue(r, lookup, SYN_MANAGER),
      costCenter: getValue(r, lookup, SYN_COST_CENTER),
      status:     getValue(r, lookup, SYN_STATUS),
      role:       getValue(r, lookup, SYN_ROLE),
      raw: r,
    });
  });

  return { records, warnings };
}

export function adaptGenericUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  if (rows.length === 0) return { records: [], warnings: [] };
  const lookup   = buildColumnLookup(Object.keys(rows[0]));
  const warnings: IngestionWarning[]   = [];
  const records:  CanonicalUsageRecord[] = [];

  rows.forEach((r, i) => {
    const billedAmount = parseNum(getValue(r, lookup, SYN_TOTAL_COST));
    if (billedAmount === undefined) {
      warnings.push({ row: i + 2, field: 'billed_amount', message: 'Missing or unparseable billed_amount' });
    }
    records.push({
      id:           getValue(r, lookup, SYN_EVENT_ID),
      employeeId:   getValue(r, lookup, SYN_EMPLOYEE_ID),
      email:        getValue(r, lookup, SYN_EMPLOYEE_EMAIL),
      employeeName: getValue(r, lookup, SYN_EMPLOYEE_NAME),
      vendor:       getValue(r, lookup, SYN_PROVIDER) ?? 'unknown',
      model:        getValue(r, lookup, SYN_MODEL),
      tokensIn:     parseNum(getValue(r, lookup, SYN_INPUT_TOKENS)),
      tokensOut:    parseNum(getValue(r, lookup, SYN_OUTPUT_TOKENS)),
      totalTokens:  parseNum(getValue(r, lookup, SYN_TOTAL_TOKENS)),
      gpuHours:     parseNum(getValue(r, lookup, SYN_GPU_HOURS)),
      billedAmount: billedAmount ?? 0,
      requests:     parseNum(getValue(r, lookup, SYN_REQUESTS)),
      unitCost:     parseNum(getValue(r, lookup, SYN_UNIT_COST)),
      currency:     getValue(r, lookup, SYN_CURRENCY),
      timestamp:    getValue(r, lookup, SYN_TIMESTAMP),
      periodStart:  getValue(r, lookup, SYN_PERIOD_START),
      periodEnd:    getValue(r, lookup, SYN_PERIOD_END),
      raw: r,
    });
  });

  return { records, warnings };
}

export function adaptGenericRateCards(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalRateCardRecord> {
  if (rows.length === 0) return { records: [], warnings: [] };
  const lookup   = buildColumnLookup(Object.keys(rows[0]));
  const warnings: IngestionWarning[]      = [];
  const records:  CanonicalRateCardRecord[] = [];

  rows.forEach((r, i) => {
    const provider = getValue(r, lookup, SYN_PROVIDER);
    if (!provider) {
      warnings.push({ row: i + 2, message: 'Missing provider — row skipped' });
      return;
    }
    records.push({
      provider,
      model:          getValue(r, lookup, SYN_MODEL),
      unitBasis:      getValue(r, lookup, SYN_UNIT_BASIS),
      cost:           parseNum(getValue(r, lookup, SYN_RATE)),
      markup:         parseNum(getValue(r, lookup, SYN_MARKUP)),
      effectiveStart: getValue(r, lookup, SYN_PERIOD_START),
      effectiveEnd:   getValue(r, lookup, SYN_PERIOD_END),
      raw: r,
    });
  });

  return { records, warnings };
}
