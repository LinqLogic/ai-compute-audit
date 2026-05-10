import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { AdapterOutput, IngestionWarning } from '../types';

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/[$,]/g, '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

function inferModelFromMeter(meter: string): string | undefined {
  if (!meter) return undefined;
  if (/gpt-?4o/i.test(meter))              return 'gpt-4o';
  if (/gpt-?4/i.test(meter))               return 'gpt-4';
  if (/gpt-?3\.?5|gpt-?35/i.test(meter))  return 'gpt-3.5-turbo';
  if (/embedding/i.test(meter))            return 'text-embedding-ada-002';
  if (/whisper/i.test(meter))              return 'whisper';
  if (/dall-?e/i.test(meter))              return 'dall-e';
  return meter;
}

/**
 * Handles Azure Cost Management export.
 * PapaParse lowercases + underscores-spaces, so CamelCase headers collapse:
 *   SubscriptionId → subscriptionid  |  PreTaxCost → pretaxcost
 *   Resource Group → resource_group  |  MeterName  → metername
 */
export function adaptAzureOpenAiUsage(
  rows: Record<string, string>[],
): AdapterOutput<CanonicalUsageRecord> {
  const warnings: IngestionWarning[] = [];
  const records: CanonicalUsageRecord[] = [];

  if (rows.length > 0) {
    warnings.push({
      message: 'Azure exports contain org-level cost data — per-employee attribution will be empty.',
    });
  }

  rows.forEach((r, i) => {
    const costRaw  = r.pretaxcost   || r.pre_tax_cost || r.cost || r.amount || r.effectivecost;
    const billed   = parseNum(costRaw);
    const meter    = r.metername    || r.meter_name   || '';
    const service  = r.servicename  || r.service_name || 'Azure OpenAI';

    if (billed === undefined) {
      warnings.push({ row: i + 2, field: 'cost', message: 'Could not parse cost from row' });
    }

    records.push({
      vendor:         'azure_openai',
      model:          inferModelFromMeter(meter),
      product:        service,
      billedAmount:   billed ?? 0,
      currency:       r.currency || 'USD',
      timestamp:      r.usagedatetime || r.usage_date_time || r.date,
      organizationId: r.subscriptionid || r.subscription_id,
      projectId:      r.resourcegroupname || r.resource_group_name || r.resourcegroup,
      raw: r,
    });
  });

  return { records, warnings };
}
