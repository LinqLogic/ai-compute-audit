/**
 * useEnterpriseIntake.ts
 *
 * Unified multi-file intake hook for DataImportPanel.
 *
 * Accepts one or more CSV files regardless of naming or column layout.
 * For each file the pipeline is attempted first (vendor/schema detection →
 * canonical mapping → domain rows). If the pipeline cannot identify a schema,
 * a legacy column-matching fallback is tried against all three domain types in
 * sequence. If both fail the file is flagged as "unrecognised" without crashing.
 *
 * The existing useCsvImport hook is not modified.  applyImport / resetToMock
 * are accessed through ImportContext directly.
 */

import React, { useRef, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { parseCsv } from '../utils/csvParser';
import { WorkerRow, UsageEventRow, RateCardRow, CsvFileType } from '../types/csvRows';
import { useImport } from '../context/ImportContext';
import { useSupabase } from './useSupabase';
import { useOrg } from '../context/OrgContext';
import { runIngestionPipelineFromFile } from '../ingestion';
import { VendorId, SchemaType } from '../ingestion/types';
import { persistImport } from '../api/imports';
import { writeMeterEvent } from '../api/meter';
import { useAuditLog } from './useAuditLog';
import { useQuota } from './useQuota';

// ─── Result types ─────────────────────────────────────────────────────────────

export type IntakeStatus =
  | 'processing'
  | 'imported'
  | 'adapted'
  | 'fallback'
  | 'failed'
  | 'unrecognised';

export interface IntakeResult {
  id:            string;
  filename:      string;
  vendorLabel:   string;
  schemaLabel:   string;
  schemaRaw:     SchemaType;
  rowsProcessed: number;
  warningCount:  number;
  errorCount:    number;
  status:        IntakeStatus;
  message?:      string;
}

// ─── Display maps ─────────────────────────────────────────────────────────────

export const VENDOR_DISPLAY: Record<VendorId, string> = {
  openai:        'OpenAI',
  anthropic:     'Anthropic',
  azure_openai:  'Azure OpenAI',
  google_gemini: 'Google Gemini',
  generic_csv:   'Standard CSV',
  unknown:       'Unknown',
};

export const SCHEMA_DISPLAY: Record<SchemaType, string> = {
  workers:    'Employee roster',
  usage:      'Usage export',
  rate_cards: 'Rate card',
  unknown:    'Not detected',
};

// ─── Sample file paths (served from public/samples/) ─────────────────────────

const SAMPLE_FILE: Record<CsvFileType, { filename: string; path: string }> = {
  workers:      { filename: 'sample_workers.csv',      path: `${process.env.PUBLIC_URL}/samples/workers.csv` },
  usage_events: { filename: 'sample_usage_events.csv', path: `${process.env.PUBLIC_URL}/samples/usage_events.csv` },
  rate_cards:   { filename: 'sample_rate_cards.csv',   path: `${process.env.PUBLIC_URL}/samples/rate_cards.csv` },
};

// ─── Hook public interface ────────────────────────────────────────────────────

export interface UseEnterpriseIntakeReturn {
  results:           IntakeResult[];
  isProcessing:      boolean;
  expanded:          boolean;
  toggleExpanded:    () => void;
  inputRef:          React.RefObject<HTMLInputElement | null>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onZoneDrop:        (e: React.DragEvent) => Promise<void>;
  handleReset:       () => void;
  downloadSample:    (type: CsvFileType) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEnterpriseIntake(): UseEnterpriseIntakeReturn {
  const { applyImport, applyImportIfEmpty, resetToMock, imported } = useImport();
  const client    = useSupabase();
  const { orgId } = useOrg();
  const { user }  = useUser();
  const { log }           = useAuditLog();
  const { importsExceeded, refresh: refreshQuota } = useQuota();

  const [results,      setResults]      = useState<IntakeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expanded,     setExpanded]     = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Per-file processor ──────────────────────────────────────────────────

  async function processOneFile(file: File): Promise<Omit<IntakeResult, 'id'>> {
    const filename = file.name;

    try {
      // 1. Enterprise ingestion pipeline (handles vendor exports + standard CSVs)
      const pipeline = await runIngestionPipelineFromFile(file);
      const { meta, workers, usageEvents, rateCards, inferredWorkers } = pipeline;

      if (workers !== undefined || usageEvents !== undefined || rateCards !== undefined) {
        console.debug('[intake] pipeline mapped records:', {
          workers:         workers?.length,
          usageEvents:     usageEvents?.length,
          rateCards:       rateCards?.length,
          inferredWorkers: inferredWorkers?.length,
          schema:          meta.schema,
          vendor:          meta.vendor,
        });

        // Apply domain records — only set keys that have real data, never wipe
        // a domain that wasn't covered by this file.
        if (workers     !== undefined) applyImport({ workers });
        if (usageEvents !== undefined) applyImport({ usageEvents });
        if (rateCards   !== undefined) applyImport({ rateCards });

        // Apply inferred worker stubs for usage-only files so the employee join
        // in buildEmployeesFromCsv resolves correctly.  Uses applyImportIfEmpty
        // so the check happens atomically against prev state — safe even when
        // multiple files are processed in the same batch.
        if (inferredWorkers && inferredWorkers.length > 0 && workers === undefined) {
          console.debug('[intake] applying', inferredWorkers.length, 'inferred worker stubs (if no real workers exist)');
          applyImportIfEmpty({ workers: inferredWorkers });
        }

        const isAdapted = meta.vendor !== 'generic_csv' && meta.vendor !== 'unknown';
        return {
          filename,
          vendorLabel:   VENDOR_DISPLAY[meta.vendor],
          schemaLabel:   SCHEMA_DISPLAY[meta.schema],
          schemaRaw:     meta.schema,
          rowsProcessed: meta.rowsOut,
          warningCount:  meta.warnings.length,
          errorCount:    meta.errors.length,
          status:        isAdapted ? 'adapted' : 'imported',
        };
      }

      // 2. Legacy column-matching fallback — try each domain type in sequence
      const workersResult = await parseCsv<WorkerRow>(file, 'workers');
      if (!workersResult.error && workersResult.data.length > 0) {
        applyImport({ workers: workersResult.data });
        return {
          filename,
          vendorLabel:   'Standard CSV',
          schemaLabel:   SCHEMA_DISPLAY.workers,
          schemaRaw:     'workers',
          rowsProcessed: workersResult.data.length,
          warningCount:  workersResult.validation?.issues.filter((i: { severity: string }) => i.severity !== 'error').length ?? 0,
          errorCount:    0,
          status:        'fallback',
          message:       'Auto-detection incomplete; imported using column matching.',
        };
      }

      const usageResult = await parseCsv<UsageEventRow>(file, 'usage_events');
      if (!usageResult.error && usageResult.data.length > 0) {
        applyImport({ usageEvents: usageResult.data });
        return {
          filename,
          vendorLabel:   'Standard CSV',
          schemaLabel:   SCHEMA_DISPLAY.usage,
          schemaRaw:     'usage',
          rowsProcessed: usageResult.data.length,
          warningCount:  usageResult.validation?.issues.filter((i: { severity: string }) => i.severity !== 'error').length ?? 0,
          errorCount:    0,
          status:        'fallback',
          message:       'Auto-detection incomplete; imported using column matching.',
        };
      }

      const rateResult = await parseCsv<RateCardRow>(file, 'rate_cards');
      if (!rateResult.error && rateResult.data.length > 0) {
        applyImport({ rateCards: rateResult.data });
        return {
          filename,
          vendorLabel:   'Standard CSV',
          schemaLabel:   SCHEMA_DISPLAY.rate_cards,
          schemaRaw:     'rate_cards',
          rowsProcessed: rateResult.data.length,
          warningCount:  rateResult.validation?.issues.filter((i: { severity: string }) => i.severity !== 'error').length ?? 0,
          errorCount:    0,
          status:        'fallback',
          message:       'Auto-detection incomplete; imported using column matching.',
        };
      }

      // 3. Unrecognised — non-blocking; shows warning in results list
      return {
        filename,
        vendorLabel:   VENDOR_DISPLAY[meta.vendor],
        schemaLabel:   SCHEMA_DISPLAY[meta.schema],
        schemaRaw:     meta.schema,
        rowsProcessed: 0,
        warningCount:  meta.warnings.length,
        errorCount:    meta.errors.length + 1,
        status:        'unrecognised',
        message:       'Some fields were not recognised. Check column headers match a supported format.',
      };

    } catch (err) {
      console.warn('[intake] Unexpected error processing', file.name, err);
      return {
        filename,
        vendorLabel:   '—',
        schemaLabel:   '—',
        schemaRaw:     'unknown',
        rowsProcessed: 0,
        warningCount:  0,
        errorCount:    1,
        status:        'failed',
        message:       err instanceof Error ? err.message : 'Unexpected error during processing.',
      };
    }
  }

  // Process files sequentially to avoid applyImport race conditions
  async function processFiles(files: File[]) {
    if (files.length === 0) return;

    if (importsExceeded) {
      setResults(prev => [...prev, {
        id:            `quota-${Date.now()}`,
        filename:      files.map(f => f.name).join(', '),
        vendorLabel:   '—',
        schemaLabel:   '—',
        schemaRaw:     'unknown' as SchemaType,
        rowsProcessed: 0,
        warningCount:  0,
        errorCount:    1,
        status:        'failed' as IntakeStatus,
        message:       'Monthly import quota reached. Upgrade your plan to import more data.',
      }]);
      return;
    }

    setIsProcessing(true);

    // Reserve slots in the results list immediately (shows "Parsing…")
    const ids    = files.map(() => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const stubs: IntakeResult[] = files.map((f, i) => ({
      id:            ids[i],
      filename:      f.name,
      vendorLabel:   '—',
      schemaLabel:   '—',
      schemaRaw:     'unknown' as SchemaType,
      rowsProcessed: 0,
      warningCount:  0,
      errorCount:    0,
      status:        'processing' as IntakeStatus,
    }));

    setResults(prev => [...prev, ...stubs]);

    for (let i = 0; i < files.length; i++) {
      const partial = await processOneFile(files[i]);
      const id = ids[i];
      setResults(prev => prev.map(r => r.id === id ? { ...partial, id } : r));
    }

    setIsProcessing(false);

    // Persist to Supabase, write meter event, and refresh quota
    if (client && orgId && user?.id) {
      persistImport(client, orgId, user.id, imported).catch(err =>
        console.error('[useEnterpriseIntake] persistImport failed:', err),
      );
      writeMeterEvent(client, orgId, 'import', 1, { fileCount: files.length }).then(refreshQuota);
    }

    log('import_completed', {
      fileCount:   files.length,
      filenames:   files.map(f => f.name),
      rowCounts: {
        workers:     imported.workers?.length     ?? 0,
        usageEvents: imported.usageEvents?.length ?? 0,
        rateCards:   imported.rateCards?.length   ?? 0,
      },
    });
  }

  // ── Public interface ────────────────────────────────────────────────────

  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);

  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (files.length > 0) await processFiles(files);
    e.target.value = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onZoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (files.length > 0) await processFiles(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = useCallback(() => {
    resetToMock();
    setResults([]);
    log('import_reset', {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToMock]);

  const downloadSample = useCallback((type: CsvFileType) => {
    const { filename, path } = SAMPLE_FILE[type];
    const a    = document.createElement('a');
    a.href     = path;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return {
    results,
    isProcessing,
    expanded,
    toggleExpanded,
    inputRef,
    onFileInputChange,
    onZoneDrop,
    handleReset,
    downloadSample,
  };
}
