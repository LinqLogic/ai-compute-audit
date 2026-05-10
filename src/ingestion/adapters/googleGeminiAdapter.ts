import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { AdapterOutput, IngestionWarning } from '../types';

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/[$,]/g, '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

function inferGeminiModel(sku: string, service: string): string | undefined {
  const src = sku || service;
  if (!src) return undefined;
  if (/gemini-1\.5-pro/i.test(src))   return 'gemini-1.5-pro';
  if (/gemini-1\.5-flash/i.test(src)) return 'gemini-1.5-flash';
  if (/gemini-1\.0-pro/i.test(src))   return 'gemini-1.0-pro';
  if (/gemini-pro/i.test(src))        return 'gemini-pro';
  if (/gemini/i.test(src))            return 'gemini';
  if (/palm/i.test(src))              return 'palm2';
  return src || undefined;
}

/**
 * Handles GCP / Vertex AI billing export.
 * Key columns (post-transformHeader): project_id, service_description,
 * sku_description, usage_start_time, cost, currency.
 */
export function adaptGoogleGeminiUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  const warnings: IngestionWarning[] = [];
  const records: CanonicalUsageRecord[] = [];

  if (rows.length > 0) {
    warnings.push({
      message: 'Google/GCP exports contain project-level cost data — per-employee attribution will be empty.',
    });
  }

  rows.forEach((r, i) => {
    const sku     = r.sku_description    || r.skudescription    || '';
    const service = r.service_description|| r.servicedescription|| 'Vertex AI / Gemini';
    const billed  = parseNum(r.cost      || r.amount            || r.cost_amount);

    if (billed === undefined) {
      warnings.push({ row: i + 2, field: 'cost', message: 'Could not parse cost from row' });
    }

    records.push({
      vendor:       'google_gemini',
      model:        inferGeminiModel(sku, service),
      product:      service,
      billedAmount: billed ?? 0,
      currency:     r.currency || 'USD',
      timestamp:    r.usage_start_time || r.usagestarttime || r.date,
      projectId:    r.project_id       || r.projectid,
      raw: r,
    });
  });

  return { records, warnings };
}
