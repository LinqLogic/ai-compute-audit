import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { AdapterOutput, IngestionWarning } from '../types';

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/[$,]/g, '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

/**
 * Handles two OpenAI export shapes:
 * 1. Dashboard usage CSV: date, model, requests, context_tokens, generated_tokens, cost
 * 2. API key/org export: organization_id, project_id, snapshot_id, timestamp,
 *    n_context_tokens_total, n_generated_tokens_total, cost_in_dollars
 */
export function adaptOpenAiUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  const warnings: IngestionWarning[] = [];
  const records: CanonicalUsageRecord[] = [];

  rows.forEach((r, i) => {
    const tokensIn  = parseNum(r.context_tokens   ?? r.n_context_tokens_total   ?? r.input_tokens   ?? r.prompt_tokens);
    const tokensOut = parseNum(r.generated_tokens  ?? r.n_generated_tokens_total ?? r.output_tokens  ?? r.completion_tokens);
    const billed    = parseNum(r.cost_in_dollars   ?? r.cost                     ?? r.amount);

    if (!r.model && !r.snapshot_id) {
      warnings.push({ row: i + 2, field: 'model', message: 'Missing model/snapshot_id field' });
    }

    records.push({
      id:             r.request_id || r.id,
      employeeId:     r.user_id    || r.api_key_id,
      userId:         r.user_id    || r.api_key_id,
      vendor:         'openai',
      model:          r.model      || r.snapshot_id,
      product:        'OpenAI API',
      tokensIn,
      tokensOut,
      totalTokens:    tokensIn !== undefined || tokensOut !== undefined
                        ? (tokensIn ?? 0) + (tokensOut ?? 0)
                        : undefined,
      billedAmount:   billed ?? 0,
      currency:       r.currency   || 'USD',
      timestamp:      r.timestamp  || r.date,
      organizationId: r.organization_id,
      projectId:      r.project_id,
      raw: r,
    });
  });

  return { records, warnings };
}
