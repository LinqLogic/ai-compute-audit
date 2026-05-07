/**
 * csvParser.ts
 *
 * Responsibility: parse a File into typed rows, validate required columns,
 * and run deep validation (types, duplicates, numeric integrity).
 * No domain logic. No aggregation. No React.
 */

import Papa from 'papaparse';
import { validateCsvRows, ValidationResult } from './csvValidator';
import { CsvFileType, ImportError } from '../types/csvRows';

export type { ValidationResult, ValidationIssue, ValidationSeverity } from './csvValidator';

// ─── Required columns per file type ─────────────────────────────────────────

export const REQUIRED_COLUMNS: Record<CsvFileType, string[]> = {
  workers:      ['employee_id', 'name', 'department', 'manager', 'cost_center', 'status'],
  usage_events: ['event_id', 'employee_id', 'provider', 'billed_amount'],
  rate_cards:   ['provider', 'model', 'unit_basis', 'rate', 'markup'],
};

// ─── File-type detection ─────────────────────────────────────────────────────

export function detectFileType(filename: string): CsvFileType | null {
  const base = filename.toLowerCase().replace(/\.csv$/i, '');
  if (base.includes('worker') || base.includes('employee')) return 'workers';
  if (base.includes('usage')  || base.includes('event'))    return 'usage_events';
  if (base.includes('rate')   || base.includes('card'))     return 'rate_cards';
  return null;
}

// ─── Column validation ───────────────────────────────────────────────────────

export function validateColumns(
  actual:   string[],
  fileType: CsvFileType,
  filename: string,
): ImportError | null {
  const required = REQUIRED_COLUMNS[fileType];
  const lower    = actual.map(c => c.trim().toLowerCase());
  const missing  = required.filter(r => !lower.includes(r));
  if (missing.length > 0) {
    return { file: filename, message: `Missing required columns: ${missing.join(', ')}` };
  }
  return null;
}

// ─── Parse result type ───────────────────────────────────────────────────────


export interface ParseResult<T> {
  data:       T[];
  error:      ImportError | null;
  /** null when the parse itself failed before validation could run */
  validation: ValidationResult | null;
}

// ─── Core parser ─────────────────────────────────────────────────────────────

export function parseCsv<T extends object>(
  file:     File,
  fileType: CsvFileType,
): Promise<ParseResult<T>> {
  return new Promise(resolve => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      resolve({
        data: [], error: { file: file.name, message: 'File must be a .csv file.' }, validation: null,
      });
      return;
    }

    Papa.parse<T>(file, {
      header:          true,
      skipEmptyLines:  true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),

      complete: results => {
        if (results.errors.length > 0 && results.data.length === 0) {
          resolve({
            data: [], error: { file: file.name, message: `Parse error: ${results.errors[0].message}` }, validation: null,
          });
          return;
        }

        if (results.data.length === 0) {
          resolve({
            data: [], error: { file: file.name, message: 'File is empty or contains no data rows.' }, validation: null,
          });
          return;
        }

        const columns  = Object.keys(results.data[0] as object);
        const colError = validateColumns(columns, fileType, file.name);
        if (colError) {
          resolve({ data: [], error: colError, validation: null });
          return;
        }

        // Deep validation: type checks, duplicates, numeric integrity
        const validation = validateCsvRows(
          results.data as unknown as Record<string, string>[],
          fileType,
        );

        resolve({ data: results.data, error: null, validation });
      },

      error: (err: Error) => {
        resolve({
          data: [], error: { file: file.name, message: err.message }, validation: null,
        });
      },
    });
  });
}
