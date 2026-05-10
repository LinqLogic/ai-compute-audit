import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { AdapterOutput, IngestionWarning } from '../types';
import {
  buildColumnLookup, getValue,
  SYN_PROVIDER, SYN_MODEL, SYN_EMPLOYEE_ID, SYN_EMPLOYEE_EMAIL, SYN_EMPLOYEE_NAME,
  SYN_TOTAL_COST, SYN_INPUT_TOKENS, SYN_OUTPUT_TOKENS, SYN_TOTAL_TOKENS,
  SYN_GPU_HOURS, SYN_TIMESTAMP, SYN_CURRENCY, SYN_EVENT_ID,
  SYN_REQUESTS, SYN_UNIT_COST, SYN_PERIOD_START, SYN_PERIOD_END,
} from '../utils/columnMatching';

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/[$,]/g, '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

/**
 * Best-effort adapter for unrecognised vendor exports.
 * Uses semantic synonym matching across the full synonym dictionary.
 */
export function adaptUnknownUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  const warnings: IngestionWarning[] = [
    { message: 'Vendor not recognised — applying best-effort column mapping. Review output carefully.' },
  ];
  if (rows.length === 0) return { records: [], warnings };

  const lookup  = buildColumnLookup(Object.keys(rows[0]));
  const records: CanonicalUsageRecord[] = [];

  rows.forEach(r => {
    records.push({
      id:           getValue(r, lookup, SYN_EVENT_ID),
      vendor:       getValue(r, lookup, SYN_PROVIDER)       ?? 'unknown',
      model:        getValue(r, lookup, SYN_MODEL),
      employeeId:   getValue(r, lookup, SYN_EMPLOYEE_ID),
      email:        getValue(r, lookup, SYN_EMPLOYEE_EMAIL),
      employeeName: getValue(r, lookup, SYN_EMPLOYEE_NAME),
      billedAmount: parseNum(getValue(r, lookup, SYN_TOTAL_COST))    ?? 0,
      tokensIn:     parseNum(getValue(r, lookup, SYN_INPUT_TOKENS)),
      tokensOut:    parseNum(getValue(r, lookup, SYN_OUTPUT_TOKENS)),
      totalTokens:  parseNum(getValue(r, lookup, SYN_TOTAL_TOKENS)),
      gpuHours:     parseNum(getValue(r, lookup, SYN_GPU_HOURS)),
      requests:     parseNum(getValue(r, lookup, SYN_REQUESTS)),
      unitCost:     parseNum(getValue(r, lookup, SYN_UNIT_COST)),
      currency:     getValue(r, lookup, SYN_CURRENCY)       ?? 'USD',
      timestamp:    getValue(r, lookup, SYN_TIMESTAMP),
      periodStart:  getValue(r, lookup, SYN_PERIOD_START),
      periodEnd:    getValue(r, lookup, SYN_PERIOD_END),
      raw: r,
    });
  });

  return { records, warnings };
}
