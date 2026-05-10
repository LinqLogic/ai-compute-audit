/**
 * columnMatching.ts
 *
 * Semantic column matching utilities for enterprise CSV ingestion.
 *
 * The core idea: strip all separators (underscores, hyphens, spaces, dots)
 * and lowercase both the actual header and each synonym before comparing.
 * This means "Prompt_Tokens", "prompt-tokens", "PromptTokens" all normalise
 * to "prompttokens" and match one another.
 *
 * All functions are pure and side-effect free.
 */

import { SchemaType } from '../types';

// ─── Core normalisation ───────────────────────────────────────────────────────

/** Strip all separator characters and lowercase. */
export function normalizeColumnName(header: string): string {
  return header.toLowerCase().replace(/[\s_\-.]/g, '');
}

/**
 * Build a lookup from normalised name → original PapaParse-transformed key.
 * Headers are already PapaParse-normalised (lowercase, spaces→underscores).
 */
export function buildColumnLookup(headers: string[]): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const h of headers) {
    lookup[normalizeColumnName(h)] = h;
  }
  return lookup;
}

/**
 * Return the first PapaParse key that semantically matches any synonym,
 * or undefined if none match.
 */
export function findColumn(
  lookup: Record<string, string>,
  synonyms: readonly string[],
): string | undefined {
  for (const syn of synonyms) {
    const key = lookup[normalizeColumnName(syn)];
    if (key !== undefined) return key;
  }
  return undefined;
}

/**
 * Extract a string value from a row using synonym matching.
 * Returns undefined if no matching column exists or the cell is empty.
 */
export function getValue(
  row:      Record<string, string>,
  lookup:   Record<string, string>,
  synonyms: readonly string[],
): string | undefined {
  const key = findColumn(lookup, synonyms);
  if (key === undefined) return undefined;
  const v = row[key];
  return v !== '' ? v : undefined;
}

// ─── Usage synonyms ───────────────────────────────────────────────────────────

export const SYN_INPUT_TOKENS = [
  'input_tokens', 'tokens_in', 'prompt_tokens', 'prompt_token_count',
  'input_token_count', 'context_tokens', 'n_context_tokens_total',
  'input token usage', 'prompt_token_usage',
] as const;

export const SYN_OUTPUT_TOKENS = [
  'output_tokens', 'tokens_out', 'completion_tokens', 'completiontok',
  'completion_tokens_count', 'response_tokens', 'n_generated_tokens_total',
  'generated_tokens', 'output_token_count',
] as const;

export const SYN_TOTAL_TOKENS = [
  'total_tokens', 'total_usage_tokens', 'tokens_total', 'token_count',
  'total_token_usage', 'total token usage',
] as const;

export const SYN_TOTAL_COST = [
  'billed_amount', 'total_cost', 'cost', 'amount', 'spend',
  'extended_spend', 'extended_spend_usd', 'usage_cost', 'ai_spend',
  'pretaxcost', 'pre_tax_cost', 'cost_in_dollars', 'total_spend',
] as const;

export const SYN_REQUESTS = [
  'requests', 'request_count', 'request_qty', 'calls', 'api_calls',
  'invocation_count', 'call_count',
] as const;

export const SYN_MODEL = [
  'model', 'ai_model', 'ai_model_used', 'model_name', 'deployment_model',
  'snapshot_id', 'model_id',
] as const;

export const SYN_PROVIDER = [
  'provider', 'vendor', 'vendor_source', 'source_vendor', 'service_name',
  'service', 'ai_provider',
] as const;

export const SYN_GPU_HOURS = [
  'gpu_hours', 'gpu_hrs', 'gpu_hrs_used', 'gpu_usage_hours', 'compute_hours',
] as const;

export const SYN_TIMESTAMP = [
  'timestamp', 'event_date', 'transaction_date', 'usage_date', 'created_at',
  'usagedatetime', 'date', 'event_time',
] as const;

export const SYN_PERIOD_START = [
  'period_start', 'billing_period_start', 'start_date', 'usage_start_time',
  'effective_start', 'billing_start',
] as const;

export const SYN_PERIOD_END = [
  'period_end', 'billing_period_end', 'end_date', 'usage_end_time',
  'effective_end', 'billing_end',
] as const;

export const SYN_UNIT_COST = [
  'unit_cost', 'cost_per_unit', 'unit_price',
] as const;

export const SYN_CURRENCY = [
  'currency', 'billing_currency', 'cost_currency',
] as const;

export const SYN_EVENT_ID = [
  'event_id', 'request_id', 'transaction_id', 'record_id', 'log_id', 'id',
] as const;

// ─── Worker synonyms ──────────────────────────────────────────────────────────

export const SYN_EMPLOYEE_ID = [
  'employee_id', 'worker_id', 'user_id', 'associate_id', 'emp_id',
  'staff_id', 'person_id',
] as const;

export const SYN_EMPLOYEE_EMAIL = [
  'employee_email', 'user_email', 'user_email_address', 'email',
  'user', 'username', 'work_email',
] as const;

export const SYN_EMPLOYEE_NAME = [
  'employee_name', 'associate_name', 'worker_name', 'user_name', 'name',
  'full_name', 'display_name', 'person_name',
] as const;

export const SYN_DEPARTMENT = [
  'department', 'department_name', 'dept', 'org_department', 'business_unit',
] as const;

export const SYN_COST_CENTER = [
  'cost_center', 'org_costcenter', 'costcenter', 'cost_center_code',
  'cost_centre', 'cc_code',
] as const;

export const SYN_MANAGER = [
  'manager', 'manager_name', 'mgr_name', 'supervisor', 'reporting_manager',
] as const;

export const SYN_STATUS = [
  'status', 'employment_status', 'worker_status', 'employee_status',
] as const;

export const SYN_ROLE = [
  'role', 'job_title', 'position', 'title', 'job_role',
] as const;

// ─── Rate-card synonyms ───────────────────────────────────────────────────────

export const SYN_UNIT_BASIS = [
  'unit_basis', 'unit_of_measure', 'metric_type', 'billing_unit',
  'pricing_unit',
] as const;

export const SYN_MARKUP = [
  'markup', 'markup_pct', 'overhead_pct', 'margin', 'uplift',
] as const;

export const SYN_RATE = [
  'rate', 'unit_cost', 'cost_per_unit', 'unit_price', 'listed_price',
  'base_rate', 'price',
] as const;

// ─── Schema scoring ───────────────────────────────────────────────────────────

export interface SchemaScoreResult {
  schema:      SchemaType;
  confidence:  'high' | 'medium' | 'low' | 'none';
  usageScore:  number;
  workerScore: number;
  rateScore:   number;
}

/**
 * Semantically score a header list against usage / worker / rate-card field
 * dictionaries.  Returns the winning schema and a confidence band.
 *
 * Scoring weights are intentionally asymmetric: fields that are uniquely
 * diagnostic (token counts, markup, employee ID) receive high weights;
 * fields that appear in multiple schemas (provider, model, email) receive low
 * weights so they cannot drive a false positive on their own.
 */
export function scoreSchema(headers: string[]): SchemaScoreResult {
  const lookup = buildColumnLookup(headers);
  const has    = (syns: readonly string[]) => findColumn(lookup, syns) !== undefined;

  // ── Usage score ──
  const usageScore =
    (has(SYN_INPUT_TOKENS)  ? 4 : 0) +
    (has(SYN_OUTPUT_TOKENS) ? 4 : 0) +
    (has(SYN_TOTAL_COST)    ? 3 : 0) +
    (has(SYN_GPU_HOURS)     ? 3 : 0) +
    (has(SYN_REQUESTS)      ? 2 : 0) +
    (has(SYN_TOTAL_TOKENS)  ? 2 : 0) +
    (has(SYN_MODEL)         ? 2 : 0) +
    (has(SYN_PROVIDER)      ? 1 : 0) +
    (has(SYN_TIMESTAMP)     ? 1 : 0) +
    (has(SYN_PERIOD_START)  ? 1 : 0) +
    (has(SYN_PERIOD_END)    ? 1 : 0) +
    (has(SYN_UNIT_COST)     ? 1 : 0);

  // ── Worker score ──
  const workerScore =
    (has(SYN_EMPLOYEE_ID)    ? 4 : 0) +
    (has(SYN_STATUS)         ? 3 : 0) +
    (has(SYN_ROLE)           ? 2 : 0) +
    (has(SYN_MANAGER)        ? 2 : 0) +
    (has(SYN_COST_CENTER)    ? 2 : 0) +
    (has(SYN_EMPLOYEE_NAME)  ? 1 : 0) +
    (has(SYN_EMPLOYEE_EMAIL) ? 1 : 0) +
    (has(SYN_DEPARTMENT)     ? 1 : 0);

  // ── Rate-card score ──
  const rateScore =
    (has(SYN_UNIT_BASIS)   ? 4 : 0) +
    (has(SYN_MARKUP)       ? 4 : 0) +
    (has(SYN_PERIOD_START) ? 2 : 0) +
    (has(SYN_PERIOD_END)   ? 2 : 0) +
    (has(SYN_RATE)         ? 2 : 0) +
    (has(SYN_PROVIDER)     ? 1 : 0) +
    (has(SYN_MODEL)        ? 1 : 0);

  const maxScore = Math.max(usageScore, workerScore, rateScore);
  const MIN_SCORE = 4; // require at least one strong or two medium signals

  let schema: SchemaType;
  if (maxScore < MIN_SCORE) {
    schema = 'unknown';
  } else if (usageScore >= workerScore && usageScore >= rateScore) {
    // Usage wins on tie with worker: token/cost fields dominate
    schema = 'usage';
  } else if (rateScore > workerScore) {
    schema = 'rate_cards';
  } else {
    schema = 'workers';
  }

  // Confidence band based on margin over runner-up
  const sorted  = [usageScore, workerScore, rateScore].sort((a, b) => b - a);
  const margin  = sorted[0] - sorted[1];
  const confidence: SchemaScoreResult['confidence'] =
    maxScore < MIN_SCORE ? 'none' :
    margin   >= 8        ? 'high' :
    margin   >= 3        ? 'medium' :
                           'low';

  return { schema, confidence, usageScore, workerScore, rateScore };
}

// ─── Acceptance-test fixture ─────────────────────────────────────────────────
// These headers represent the "messy enterprise CSV" use case described in the
// spec.  The scoreSchema call below documents the expected outcome.
//
// const MESSY_CSV_HEADERS_EXAMPLE = [
//   'billing_period_start', 'billing_period_end', 'user_email_address',
//   'associate_name',       'org_costcenter',      'mgr_name',
//   'ai_model_used',        'prompt_tokens',        'completiontok',
//   'total_usage_tokens',   'request_qty',          'gpu_hrs_used',
//   'cost_per_unit',        'extended_spend_usd',   'department_name',
//   'vendor_source',        'random_column_xyz',
// ];
// Expected: scoreSchema(MESSY_CSV_HEADERS_EXAMPLE)
//   → { schema: 'usage', confidence: 'high', usageScore: ~24, ... }
