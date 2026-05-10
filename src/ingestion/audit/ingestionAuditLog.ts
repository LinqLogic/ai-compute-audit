import { IngestionMeta } from '../types';

export interface IngestionAuditEntry {
  auditId:      string;
  processedAt:  string;
  filename:     string;
  vendor:       string;
  schema:       string;
  rowsIn:       number;
  rowsOut:      number;
  warningCount: number;
  errorCount:   number;
}

export function createAuditEntry(meta: IngestionMeta): IngestionAuditEntry {
  return {
    auditId:      meta.auditId,
    processedAt:  meta.processedAt,
    filename:     meta.filename,
    vendor:       meta.vendor,
    schema:       meta.schema,
    rowsIn:       meta.rowsIn,
    rowsOut:      meta.rowsOut,
    warningCount: meta.warnings.length,
    errorCount:   meta.errors.length,
  };
}
