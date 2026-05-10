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
 * Handles Anthropic Console usage export:
 * date, workspace_id, project_id, api_key_id, model,
 * input_tokens, output_tokens, requests, cost
 */
export function adaptAnthropicUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  const warnings: IngestionWarning[] = [];
  const records: CanonicalUsageRecord[] = [];

  rows.forEach((r, i) => {
    const tokensIn  = parseNum(r.input_tokens  ?? r.tokens_in  ?? r.prompt_tokens);
    const tokensOut = parseNum(r.output_tokens ?? r.tokens_out ?? r.completion_tokens);
    const billed    = parseNum(r.cost          ?? r.amount     ?? r.billed_amount);

    if (!r.model) {
      warnings.push({ row: i + 2, field: 'model', message: 'Missing model field' });
    }

    records.push({
      id:             r.id,
      employeeId:     r.api_key_id || r.user_id,
      userId:         r.api_key_id || r.user_id,
      vendor:         'anthropic',
      model:          r.model,
      product:        'Claude API',
      tokensIn,
      tokensOut,
      totalTokens:    tokensIn !== undefined || tokensOut !== undefined
                        ? (tokensIn ?? 0) + (tokensOut ?? 0)
                        : undefined,
      billedAmount:   billed ?? 0,
      currency:       r.currency || 'USD',
      timestamp:      r.date     || r.timestamp,
      organizationId: r.workspace_id,
      projectId:      r.project_id,
      raw: r,
    });
  });

  return { records, warnings };
}
