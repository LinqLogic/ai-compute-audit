import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { AdapterOutput, IngestionWarning } from '../types';

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/[$,]/g, '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

function first(r: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (v) return v;
  }
  return undefined;
}

/**
 * Best-effort adapter for unrecognised vendor exports.
 * Tries a broad set of common column name patterns.
 */
export function adaptUnknownUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  const warnings: IngestionWarning[] = [
    { message: 'Vendor not recognised — applying best-effort column mapping. Review output carefully.' },
  ];
  const records: CanonicalUsageRecord[] = [];

  rows.forEach(r => {
    records.push({
      vendor:       first(r, 'provider', 'vendor', 'service', 'service_name') ?? 'unknown',
      model:        first(r, 'model', 'model_name', 'snapshot_id', 'sku_description', 'metername'),
      employeeId:   first(r, 'employee_id', 'user_id', 'api_key_id', 'user', 'username'),
      billedAmount: parseNum(first(r, 'billed_amount', 'cost', 'amount', 'pretaxcost', 'total', 'charge')) ?? 0,
      tokensIn:     parseNum(first(r, 'tokens_in', 'input_tokens', 'context_tokens', 'prompt_tokens')),
      tokensOut:    parseNum(first(r, 'tokens_out', 'output_tokens', 'generated_tokens', 'completion_tokens')),
      timestamp:    first(r, 'timestamp', 'date', 'created_at', 'usage_date', 'event_time', 'usagedatetime'),
      currency:     first(r, 'currency') ?? 'USD',
      raw: r,
    });
  });

  return { records, warnings };
}
