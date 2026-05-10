import { SchemaType } from '../types';

export function detectSchema(headers: string[]): SchemaType {
  const h = new Set(headers);

  const workerScore = [
    'employee_id', 'name', 'department', 'cost_center', 'email', 'manager', 'status',
  ].filter(c => h.has(c)).length;

  const usageScore = [
    'billed_amount', 'tokens_in', 'tokens_out', 'model', 'provider', 'event_id',
    'input_tokens', 'output_tokens', 'total_tokens', 'usage_type', 'cost', 'requests',
    'n_context_tokens_total', 'n_generated_tokens_total', 'pretaxcost', 'pre_tax_cost',
  ].filter(c => h.has(c)).length;

  const rateScore = [
    'rate', 'markup', 'unit_basis', 'effective_start', 'cost_per_unit',
    'price', 'effective_end', 'unit_of_measure',
  ].filter(c => h.has(c)).length;

  const maxScore = Math.max(workerScore, usageScore, rateScore);
  if (maxScore < 2) return 'unknown';

  // Prefer workers when it ties with usage (name/email/department overlap is coincidental)
  if (workerScore === maxScore && workerScore >= usageScore && workerScore >= rateScore) return 'workers';
  if (rateScore   === maxScore && rateScore   >  usageScore)                            return 'rate_cards';
  if (usageScore  >= maxScore)                                                          return 'usage';

  return 'unknown';
}
