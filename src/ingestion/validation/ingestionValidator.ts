import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { CanonicalWorkerRecord } from '../canonical/CanonicalWorkerRecord';
import { CanonicalRateCardRecord } from '../canonical/CanonicalRateCardRecord';
import { IngestionValidationResult } from './validationTypes';
import { SchemaType } from '../types';

function validateUsage(
  records: CanonicalUsageRecord[],
): IngestionValidationResult<CanonicalUsageRecord> {
  const errors: string[] = [];
  const out: CanonicalUsageRecord[] = [];

  for (const r of records) {
    if ((r.billedAmount ?? 0) < 0) {
      errors.push(`Negative billedAmount for event ${r.id ?? 'unknown'} — kept with warning`);
    }
    out.push(r);
  }

  return { records: out, errors, droppedCount: 0 };
}

function validateWorkers(
  records: CanonicalWorkerRecord[],
): IngestionValidationResult<CanonicalWorkerRecord> {
  const errors: string[] = [];
  const out: CanonicalWorkerRecord[] = [];

  for (const r of records) {
    if (!r.id) {
      errors.push('Worker record missing employee_id — row dropped');
      continue;
    }
    out.push(r);
  }

  return { records: out, errors, droppedCount: records.length - out.length };
}

function validateRateCards(
  records: CanonicalRateCardRecord[],
): IngestionValidationResult<CanonicalRateCardRecord> {
  const errors: string[] = [];
  const out: CanonicalRateCardRecord[] = [];

  for (const r of records) {
    if (!r.provider) {
      errors.push('Rate card missing provider — row dropped');
      continue;
    }
    if ((r.cost ?? 0) < 0) {
      errors.push(`Negative cost for ${r.provider}/${r.model ?? 'unknown'} — kept with warning`);
    }
    out.push(r);
  }

  return { records: out, errors, droppedCount: records.length - out.length };
}

export function validateCanonicalRecords(
  schema:  SchemaType,
  records: unknown[],
): IngestionValidationResult<unknown> {
  switch (schema) {
    case 'usage':
      return validateUsage(records as CanonicalUsageRecord[]);
    case 'workers':
      return validateWorkers(records as CanonicalWorkerRecord[]);
    case 'rate_cards':
      return validateRateCards(records as CanonicalRateCardRecord[]);
    default:
      return { records, errors: [], droppedCount: 0 };
  }
}
