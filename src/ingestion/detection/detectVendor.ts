import { VendorId } from '../types';
import {
  buildColumnLookup, findColumn,
  SYN_TOTAL_COST, SYN_EMPLOYEE_ID, SYN_COST_CENTER,
} from '../utils/columnMatching';

export function detectVendor(
  filename: string,
  headers:  string[],
  sample?:  Record<string, string>[],
): VendorId {
  const fn = filename.toLowerCase();

  // Filename signals (highest confidence)
  if (/openai|chatgpt/.test(fn))           return 'openai';
  if (/anthropic|claude/.test(fn))          return 'anthropic';
  if (/azure/.test(fn))                     return 'azure_openai';
  if (/gemini|vertex|google.?ai/.test(fn))  return 'google_gemini';

  const h = new Set(headers);

  // OpenAI usage-export headers
  if (h.has('organization_id') || h.has('snapshot_id') || h.has('n_context_tokens_total')) {
    return 'openai';
  }

  // Azure Cost Management headers (camelCase lowercased by PapaParse)
  if (
    h.has('subscriptionid') || h.has('subscription_id') ||
    (h.has('metername') && h.has('resourcetype'))
  ) {
    return 'azure_openai';
  }

  // GCP billing export headers
  if (h.has('project_id') && (h.has('sku_id') || h.has('sku_description') || h.has('service_description'))) {
    return 'google_gemini';
  }

  // Anthropic console export headers — confirm with a model-name sample check
  if (h.has('workspace_id') || h.has('api_key_id')) {
    const hasClaude = sample?.some(r => /claude/i.test(String(r.model ?? '')));
    if (hasClaude) return 'anthropic';
  }

  // Semantic fallback: any recognisable cost/identity field → treat as generic CSV
  const lookup = buildColumnLookup(headers);
  if (
    findColumn(lookup, SYN_EMPLOYEE_ID) !== undefined ||
    findColumn(lookup, SYN_TOTAL_COST)  !== undefined ||
    findColumn(lookup, SYN_COST_CENTER) !== undefined
  ) {
    return 'generic_csv';
  }

  return 'unknown';
}
