import Papa from 'papaparse';

import { VendorId, IngestionMeta, IngestionWarning } from './types';
import { detectVendor } from './detection/detectVendor';
import { detectSchema } from './detection/detectSchema';

import { CanonicalWorkerRecord } from './canonical/CanonicalWorkerRecord';
import { CanonicalUsageRecord } from './canonical/CanonicalUsageRecord';
import { CanonicalRateCardRecord } from './canonical/CanonicalRateCardRecord';

import { adaptGenericWorkers, adaptGenericUsage, adaptGenericRateCards } from './adapters/genericCsvAdapter';
import { adaptOpenAiUsage } from './adapters/openAiAdapter';
import { adaptAnthropicUsage } from './adapters/anthropicAdapter';
import { adaptAzureOpenAiUsage } from './adapters/azureOpenAiAdapter';
import { adaptGoogleGeminiUsage } from './adapters/googleGeminiAdapter';
import { adaptUnknownUsage } from './adapters/unknownVendorAdapter';

import { normalizeUsageRecords } from './normalization/normalizeUsage';
import { normalizeWorkerRecords } from './normalization/normalizeWorkers';
import { normalizeRateCardRecords } from './normalization/normalizeRateCards';

import { validateCanonicalRecords } from './validation/ingestionValidator';
import { mapWorkersToRows, mapUsageToRows, mapRateCardsToRows } from './mapping/mapCanonicalToDomain';
import { createAuditEntry, IngestionAuditEntry } from './audit/ingestionAuditLog';

import { WorkerRow, UsageEventRow, RateCardRow } from '../types/csvRows';

// ─── Public re-exports ────────────────────────────────────────────────────────

export type { IngestionMeta } from './types';
export type { IngestionAuditEntry } from './audit/ingestionAuditLog';

// ─── Result type ──────────────────────────────────────────────────────────────

export interface PipelineResult {
  workers?:     WorkerRow[];
  usageEvents?: UsageEventRow[];
  rateCards?:   RateCardRow[];
  meta:  IngestionMeta;
  audit: IngestionAuditEntry;
}

// ─── Adapter selection ────────────────────────────────────────────────────────

function pickUsageAdapter(vendor: VendorId) {
  switch (vendor) {
    case 'openai':        return adaptOpenAiUsage;
    case 'anthropic':     return adaptAnthropicUsage;
    case 'azure_openai':  return adaptAzureOpenAiUsage;
    case 'google_gemini': return adaptGoogleGeminiUsage;
    case 'generic_csv':   return adaptGenericUsage;
    default:              return adaptUnknownUsage;
  }
}

// ─── Raw CSV parse (no column validation) ────────────────────────────────────

export function parseRawCsv(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header:          true,
      skipEmptyLines:  true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: results => resolve(results.data),
      error:    err    => reject(err),
    });
  });
}

// ─── Pure orchestrator (accepts pre-parsed rows) ──────────────────────────────

export function runIngestionPipeline(
  filename: string,
  rawRows:  Record<string, string>[],
): PipelineResult {
  const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const sample  = rawRows.slice(0, 10);

  const vendor = detectVendor(filename, headers, sample);
  const schema = detectSchema(headers);

  const allWarnings: IngestionWarning[] = [];
  const allErrors:   string[]           = [];

  let workers:     WorkerRow[]     | undefined;
  let usageEvents: UsageEventRow[] | undefined;
  let rateCards:   RateCardRow[]   | undefined;
  let rowsOut = 0;

  if (schema === 'workers') {
    const adapted    = adaptGenericWorkers(rawRows);
    const normalized = normalizeWorkerRecords(adapted.records);
    const validated  = validateCanonicalRecords('workers', normalized.records);

    allWarnings.push(...adapted.warnings, ...normalized.warnings);
    allErrors.push(...validated.errors);

    workers = mapWorkersToRows(validated.records as CanonicalWorkerRecord[]);
    rowsOut = workers.length;

  } else if (schema === 'usage') {
    const adapter    = pickUsageAdapter(vendor);
    const adapted    = adapter(rawRows);
    const normalized = normalizeUsageRecords(adapted.records);
    const validated  = validateCanonicalRecords('usage', normalized.records);

    allWarnings.push(...adapted.warnings, ...normalized.warnings);
    allErrors.push(...validated.errors);

    usageEvents = mapUsageToRows(validated.records as CanonicalUsageRecord[]);
    rowsOut = usageEvents.length;

  } else if (schema === 'rate_cards') {
    const adapted    = adaptGenericRateCards(rawRows);
    const normalized = normalizeRateCardRecords(adapted.records);
    const validated  = validateCanonicalRecords('rate_cards', normalized.records);

    allWarnings.push(...adapted.warnings, ...normalized.warnings);
    allErrors.push(...validated.errors);

    rateCards = mapRateCardsToRows(validated.records as CanonicalRateCardRecord[]);
    rowsOut = rateCards.length;

  } else {
    allWarnings.push({
      message: `Schema not detected for "${filename}" — check column headers match workers/usage_events/rate_cards format.`,
    });
  }

  const meta: IngestionMeta = {
    vendor,
    schema,
    filename,
    rowsIn:      rawRows.length,
    rowsOut,
    warnings:    allWarnings,
    errors:      allErrors,
    auditId:     `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    processedAt: new Date().toISOString(),
  };

  return { workers, usageEvents, rateCards, meta, audit: createAuditEntry(meta) };
}

// ─── File-based entry point ───────────────────────────────────────────────────

export async function runIngestionPipelineFromFile(file: File): Promise<PipelineResult> {
  const rawRows = await parseRawCsv(file);
  return runIngestionPipeline(file.name, rawRows);
}
