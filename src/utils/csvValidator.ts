/**
 * csvValidator.ts
 *
 * Deep validation beyond column presence: type checks, duplicate detection,
 * numeric-field integrity, and date parsing warnings.
 *
 * Returns structured ValidationResult — UI only renders, never validates.
 * Called from csvParser.ts after initial column validation passes.
 */

import { CsvFileType } from '../types/csvRows';

// ─── Result types ─────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: ValidationSeverity;
  field:    string;
  row:      number;           // 1-based data row (0 = file-level)
  message:  string;
}

export interface ValidationResult {
  valid:    boolean;          // false = at least one 'error' severity issue
  issues:   ValidationIssue[];
  rowCount: number;
  dupCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNumeric(v: unknown): boolean {
  if (v === '' || v == null) return false;
  return !isNaN(Number(v));
}

function isValidDate(v: unknown): boolean {
  if (!v || typeof v !== 'string' || v.trim() === '') return false;
  const d = new Date(v.trim());
  return !isNaN(d.getTime());
}

function issue(
  severity: ValidationSeverity,
  field:    string,
  row:      number,
  message:  string,
): ValidationIssue {
  return { severity, field, row, message };
}

// ─── Per-type validators ──────────────────────────────────────────────────────

function validateWorkers(rows: Record<string, string>[]): ValidationIssue[] {
  const issues:  ValidationIssue[] = [];
  const seenIds  = new Map<string, number>();  // id → first-seen row

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 1;
    const id     = row['employee_id']?.trim();

    if (!id) {
      issues.push(issue('error', 'employee_id', rowNum, 'Missing employee_id.'));
    } else if (seenIds.has(id)) {
      issues.push(issue('warning', 'employee_id', rowNum,
        `Duplicate employee_id "${id}" (first seen on row ${seenIds.get(id)}).`));
    } else {
      seenIds.set(id, rowNum);
    }

    if (!row['name']?.trim()) {
      issues.push(issue('error', 'name', rowNum, 'Missing employee name.'));
    }

    const status = row['status']?.trim().toLowerCase();
    if (status && !['active', 'inactive', 'leave', 'terminated'].includes(status)) {
      issues.push(issue('warning', 'status', rowNum,
        `Unrecognised status "${row['status']}" — will be treated as active.`));
    }
  }

  return issues;
}

function validateUsageEvents(rows: Record<string, string>[]): ValidationIssue[] {
  const issues:  ValidationIssue[] = [];
  const seenIds  = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 1;
    const evId   = row['event_id']?.trim();

    if (!evId) {
      issues.push(issue('warning', 'event_id', rowNum, 'Missing event_id — row will still be processed.'));
    } else if (seenIds.has(evId)) {
      issues.push(issue('warning', 'event_id', rowNum,
        `Duplicate event_id "${evId}" — may cause double-counting.`));
    } else {
      seenIds.set(evId, rowNum);
    }

    if (!row['employee_id']?.trim()) {
      issues.push(issue('error', 'employee_id', rowNum, 'Missing employee_id — event cannot be attributed.'));
    }

    const billed = row['billed_amount'];
    if (billed !== undefined && !isNumeric(billed)) {
      issues.push(issue('error', 'billed_amount', rowNum,
        `Non-numeric billed_amount "${billed}" — will be treated as $0.`));
    }

    for (const numField of ['tokens_in', 'tokens_out', 'gpu_hours'] as const) {
      const val = row[numField];
      if (val && !isNumeric(val)) {
        issues.push(issue('warning', numField, rowNum,
          `Non-numeric ${numField} "${val}" — will be treated as 0.`));
      }
    }

    const ts = row['timestamp'];
    if (ts && !isValidDate(ts)) {
      issues.push(issue('warning', 'timestamp', rowNum,
        `Unparseable timestamp "${ts}" — rate card date matching will use current date.`));
    }
  }

  return issues;
}

function validateRateCards(rows: Record<string, string>[]): ValidationIssue[] {
  const issues:  ValidationIssue[] = [];
  const seenKeys = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 1;
    const key    = `${row['provider']?.trim().toLowerCase()}::${row['model']?.trim().toLowerCase()}`;

    if (seenKeys.has(key)) {
      issues.push(issue('warning', 'provider+model', rowNum,
        `Duplicate rate card for "${key}" (first seen on row ${seenKeys.get(key)}). Later entry takes precedence.`));
    } else {
      seenKeys.set(key, rowNum);
    }

    if (!isNumeric(row['rate']) || Number(row['rate']) < 0) {
      issues.push(issue('error', 'rate', rowNum,
        `Invalid rate "${row['rate']}" — must be a non-negative number.`));
    }

    if (!isNumeric(row['markup'])) {
      issues.push(issue('warning', 'markup', rowNum,
        `Non-numeric markup "${row['markup']}" — will default to 0%.`));
    }

    const start = row['effective_start'];
    const end   = row['effective_end'];
    if (start && !isValidDate(start)) {
      issues.push(issue('warning', 'effective_start', rowNum,
        `Unparseable effective_start "${start}" — no start-date constraint applied.`));
    }
    if (end && !isValidDate(end)) {
      issues.push(issue('warning', 'effective_end', rowNum,
        `Unparseable effective_end "${end}" — no end-date constraint applied.`));
    }
    if (start && end && isValidDate(start) && isValidDate(end)) {
      if (new Date(start) > new Date(end)) {
        issues.push(issue('error', 'effective_start/end', rowNum,
          `effective_start is after effective_end — rate card entry will be ignored.`));
      }
    }
  }

  return issues;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function validateCsvRows(
  rows:     Record<string, string>[],
  fileType: CsvFileType,
): ValidationResult {
  if (rows.length === 0) {
    return { valid: false, issues: [], rowCount: 0, dupCount: 0 };
  }

  const issues = fileType === 'workers'      ? validateWorkers(rows)
               : fileType === 'usage_events' ? validateUsageEvents(rows)
               : fileType === 'rate_cards'   ? validateRateCards(rows)
               : [];

  const dupCount = issues.filter(i =>
    i.severity === 'warning' && i.message.startsWith('Duplicate')
  ).length;

  const valid = !issues.some(i => i.severity === 'error');

  return { valid, issues, rowCount: rows.length, dupCount };
}
