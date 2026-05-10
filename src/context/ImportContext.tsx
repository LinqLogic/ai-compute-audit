/**
 * ImportContext.tsx
 *
 * Responsibility: manage raw uploaded CSV data and import lifecycle state.
 *
 * Holds:
 *   - Raw typed rows exactly as PapaParse produced them (WorkerRow[] etc.)
 *   - Validation/parse errors per file
 *   - A flag indicating whether any import data is present
 *
 * Does NOT derive employees, dept spend, or any domain objects.
 * Domain derivation is the responsibility of DomainContext.
 *
 * Consumers that need raw rows: DomainContext, useCsvImport hook.
 * Consumers that need domain objects: pages via DomainContext.
 */

import React, {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';
import { ImportedDataState, ImportError } from '../types/csvRows';

// ─── Public interface ────────────────────────────────────────────────────────

export interface ImportContextValue {
  /** Raw typed rows from each uploaded file, or null if not yet uploaded. */
  imported: ImportedDataState;

  /** Accumulated parse/validation errors across all files. */
  importErrors: ImportError[];

  /** True when at least one file has been uploaded successfully. */
  isUsingImport: boolean;

  /** Merge new raw data into import state (partial update OK). */
  applyImport: (next: Partial<ImportedDataState>) => void;

  /**
   * Like applyImport, but only sets a domain key when it is currently empty
   * (null or zero-length). Safe to call from async processing loops because
   * the check happens inside the setImported functional update against the
   * current prev state, avoiding stale-closure race conditions.
   */
  applyImportIfEmpty: (next: Partial<ImportedDataState>) => void;

  /** Clear all import data and errors, returning to mock-data fallback. */
  resetToMock: () => void;

  /** Append errors from a failed parse attempt. */
  pushErrors: (errors: ImportError[]) => void;

  /** Clear all accumulated errors. */
  clearErrors: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const EMPTY_STATE: ImportedDataState = {
  workers:     null,
  usageEvents: null,
  rateCards:   null,
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ImportContext = createContext<ImportContextValue | null>(null);

export function ImportProvider({ children }: { children: ReactNode }) {
  const [imported,     setImported]     = useState<ImportedDataState>(EMPTY_STATE);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);

  const isUsingImport =
    (imported.workers?.length    ?? 0) > 0 ||
    (imported.usageEvents?.length ?? 0) > 0 ||
    (imported.rateCards?.length  ?? 0) > 0;

  const applyImport = useCallback((next: Partial<ImportedDataState>) => {
    setImported(prev => ({ ...prev, ...next }));
  }, []);

  const applyImportIfEmpty = useCallback((next: Partial<ImportedDataState>) => {
    setImported(prev => {
      const merged = { ...prev };
      if (next.workers     !== undefined && (prev.workers?.length     ?? 0) === 0) merged.workers     = next.workers;
      if (next.usageEvents !== undefined && (prev.usageEvents?.length ?? 0) === 0) merged.usageEvents = next.usageEvents;
      if (next.rateCards   !== undefined && (prev.rateCards?.length   ?? 0) === 0) merged.rateCards   = next.rateCards;
      return merged;
    });
  }, []);

  const resetToMock = useCallback(() => {
    setImported(EMPTY_STATE);
    setImportErrors([]);
  }, []);

  const pushErrors = useCallback((errors: ImportError[]) => {
    setImportErrors(prev => [...prev, ...errors]);
  }, []);

  const clearErrors = useCallback(() => {
    setImportErrors([]);
  }, []);

  return (
    <ImportContext.Provider value={{
      imported,
      importErrors,
      isUsingImport,
      applyImport,
      applyImportIfEmpty,
      resetToMock,
      pushErrors,
      clearErrors,
    }}>
      {children}
    </ImportContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useImport(): ImportContextValue {
  const ctx = useContext(ImportContext);
  if (!ctx) throw new Error('useImport must be used inside ImportProvider');
  return ctx;
}
