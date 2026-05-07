/**
 * rateCardMapper.ts
 *
 * Responsibility: map raw RateCardRow[] (CSV strings) to the typed RateCard[]
 * display model consumed by the Rate Cards page.
 *
 * Distinct from pricingEngine.ts, which builds the IndexedRateCard lookup
 * structure for per-event cost calculations. This module only handles the
 * display representation shown in the UI table.
 *
 * Pure function. No I/O, no React.
 *
 * Consumed by: DomainContext
 */

import { RateCard } from '../data/types';
import { RateCardRow } from '../types/csvRows';

/**
 * Convert raw CSV rows into display-ready RateCard objects.
 * Rows with missing provider or model are silently dropped — they
 * cannot be meaningfully shown or used for pricing.
 */
export function buildRateCardsFromCsv(rows: RateCardRow[]): RateCard[] {
  return rows
    .filter(r => r.provider?.trim() && r.model?.trim())
    .map(r => ({
      provider:  r.provider.trim(),
      model:     r.model.trim(),
      unit:      r.unit_basis?.trim()      || '—',
      cost:      parseFloat(r.rate)        || 0,
      markup:    parseFloat(r.markup)      || 0,
      effective: r.effective_start?.trim() || '—',
    }));
}
