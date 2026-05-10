import { CanonicalRateCardRecord } from '../canonical/CanonicalRateCardRecord';
import { IngestionWarning } from '../types';

export function normalizeRateCardRecords(
  records: CanonicalRateCardRecord[],
): { records: CanonicalRateCardRecord[]; warnings: IngestionWarning[] } {
  const warnings: IngestionWarning[] = [];
  const out: CanonicalRateCardRecord[] = [];

  records.forEach((r, i) => {
    if (!r.provider) {
      warnings.push({ row: i + 1, message: 'Missing provider — row skipped' });
      return;
    }
    out.push({
      ...r,
      unitBasis: r.unitBasis ?? '1m_tokens',
      markup:    r.markup    ?? 0.15,
      cost:      r.cost      ?? 0,
    });
  });

  return { records: out, warnings };
}
