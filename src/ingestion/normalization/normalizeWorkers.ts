import { CanonicalWorkerRecord } from '../canonical/CanonicalWorkerRecord';
import { IngestionWarning } from '../types';

export function normalizeWorkerRecords(
  records: CanonicalWorkerRecord[],
): { records: CanonicalWorkerRecord[]; warnings: IngestionWarning[] } {
  const warnings: IngestionWarning[] = [];
  const seen = new Set<string>();
  const out: CanonicalWorkerRecord[] = [];

  records.forEach((r, i) => {
    if (seen.has(r.id)) {
      warnings.push({ row: i + 1, message: `Duplicate employee_id ${r.id} — skipped` });
      return;
    }
    seen.add(r.id);

    out.push({
      ...r,
      status:     r.status     ?? 'active',
      department: r.department ?? 'Unknown',
    });
  });

  return { records: out, warnings };
}
