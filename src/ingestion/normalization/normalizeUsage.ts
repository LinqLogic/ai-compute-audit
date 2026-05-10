import { CanonicalUsageRecord } from '../canonical/CanonicalUsageRecord';
import { IngestionWarning } from '../types';

export function normalizeUsageRecords(
  records: CanonicalUsageRecord[],
): { records: CanonicalUsageRecord[]; warnings: IngestionWarning[] } {
  const warnings: IngestionWarning[] = [];
  const seen     = new Set<string>();
  const out: CanonicalUsageRecord[] = [];

  records.forEach((r, i) => {
    // Deduplicate by explicit id
    if (r.id) {
      if (seen.has(r.id)) {
        warnings.push({ row: i + 1, message: `Duplicate event id ${r.id} — skipped` });
        return;
      }
      seen.add(r.id);
    }

    // Derive totalTokens if not provided
    const totalTokens =
      r.totalTokens ??
      (r.tokensIn !== undefined || r.tokensOut !== undefined
        ? (r.tokensIn ?? 0) + (r.tokensOut ?? 0)
        : undefined);

    out.push({ ...r, totalTokens, billedAmount: r.billedAmount ?? 0 });
  });

  return { records: out, warnings };
}
