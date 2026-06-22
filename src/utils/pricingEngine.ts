/**
 * pricingEngine.ts
 *
 * Pure functions. No side effects, no React imports.
 * All computation is deterministic given the same inputs.
 *
 * Responsibility:
 *   1. Build an indexed rate card lookup structure from RateCardRow[]
 *   2. Price each UsageEventRow against the index
 *   3. Fall back to billed_amount when no rate card matches
 *   4. Return PricedEvent[] for downstream aggregation
 */

import { RateCardRow, UsageEventRow } from '../types/csvRows';
import { IndexedRateCard, PricedEvent, ToolId } from '../data/types';
import { normalizeToolId } from '../ingestion/normalization/normalizeToolId';

// ─── 1. Build rate card index ───────────────────────────────────────────────

/**
 * Normalise a string for matching: lowercase, strip extra whitespace.
 */
function norm(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Parse a date string to a Date, returning null on failure.
 * Accepts ISO 8601 (2026-01-01) and common variants.
 */
function parseDate(s: string | undefined | null): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Convert RateCardRow[] into an IndexedRateCard[] ready for fast lookup.
 * Rows with missing provider, model, or non-positive rate are silently dropped.
 */
export function buildRateCardIndex(rows: RateCardRow[]): IndexedRateCard[] {
  const index: IndexedRateCard[] = [];

  for (const row of rows) {
    const provider = norm(row.provider);
    const model    = norm(row.model);
    const rate     = parseFloat(row.rate);
    const markup   = parseFloat(row.markup);

    if (!provider || !model || isNaN(rate) || rate <= 0) continue;

    index.push({
      provider,
      model,
      unitBasis:      norm(row.unit_basis) || 'unknown',
      rate,
      markup:         isNaN(markup) ? 0 : markup,
      effectiveStart: parseDate(row.effective_start),
      effectiveEnd:   parseDate(row.effective_end),
    });
  }

  return index;
}

// ─── 2. Rate card lookup ────────────────────────────────────────────────────

/**
 * Find the best matching rate card for a (provider, model, eventDate) triple.
 *
 * Matching priority:
 *   1. Exact provider + exact model, within effective date range
 *   2. Exact provider + exact model, no date constraints
 *   3. Exact provider + model prefix match (handles versioning like "gpt-4o-*")
 *
 * Returns null when no match is found.
 */
export function findRateCard(
  index:    IndexedRateCard[],
  provider: string,
  model:    string,
  eventDate: Date,
): IndexedRateCard | null {
  const p = norm(provider);
  const m = norm(model);

  // Pass 1: exact provider + exact model, date-constrained candidates
  const exactMatches = index.filter(rc =>
    rc.provider === p && rc.model === m
  );

  if (exactMatches.length > 0) {
    // Prefer date-range-constrained entries that cover the event date
    const dated = exactMatches.filter(rc => {
      const afterStart  = !rc.effectiveStart || eventDate >= rc.effectiveStart;
      const beforeEnd   = !rc.effectiveEnd   || eventDate <= rc.effectiveEnd;
      return afterStart && beforeEnd;
    });

    if (dated.length > 0) {
      // If multiple dated entries match, pick the one with the latest effectiveStart
      return dated.sort((a, b) =>
        (b.effectiveStart?.getTime() ?? 0) - (a.effectiveStart?.getTime() ?? 0)
      )[0];
    }

    // Fall back to undated exact match
    const undated = exactMatches.filter(rc => !rc.effectiveStart && !rc.effectiveEnd);
    if (undated.length > 0) return undated[0];

    // No dated match and no undated fallback — return null so priceEvent uses billedAmount.
    // Pricing against a stale/future-dated card produces a wrong, confident dollar figure.
    return null;
  }

  // Pass 2: provider + model prefix (e.g. "gpt-4o" matches "gpt-4o-mini")
  const prefixMatches = index.filter(rc =>
    rc.provider === p && (m.startsWith(rc.model) || rc.model.startsWith(m))
  );
  if (prefixMatches.length > 0) return prefixMatches[0];

  // Pass 3: provider-only fallback using a "*" or "default" model entry
  const providerDefault = index.find(rc =>
    rc.provider === p && (rc.model === '*' || rc.model === 'default')
  );
  if (providerDefault) return providerDefault;

  return null;
}

// ─── 3. Unit computation ────────────────────────────────────────────────────

/**
 * Compute usage units from raw event fields based on the rate card's unit_basis.
 *
 * Supported unit_basis values (normalised to lowercase, underscores):
 *   "1k_tokens"  / "per_1k_tokens"  / "tokens"   → (tokens_in + tokens_out) / 1000
 *   "1m_tokens"  / "per_1m_tokens"                → (tokens_in + tokens_out) / 1_000_000
 *   "gpu_hour"   / "gpu_hours"                     → gpu_hours
 *   "per_image"  / "image"          / "render"     → usage_units field, default 1
 *   "per_seat"   / "seat"           / "month"      → 1 (seat = one unit per period)
 *   "per_call"   / "call"           / "request"    → 1
 *   anything else                                  → null (caller must treat event as unrated)
 */
export function computeUnits(
  unitBasis:  string,
  tokensIn:   number,
  tokensOut:  number,
  gpuHours:   number,
  usageUnits: number,
): number | null {
  const basis = norm(unitBasis).replace(/-/g, '_').replace(/\s+/g, '_');

  // Token-based billing
  if (
    basis.includes('1k_token') ||
    basis.includes('per_1k')   ||
    basis === 'tokens'          ||
    basis === 'token'
  ) {
    return (tokensIn + tokensOut) / 1_000;
  }

  if (
    basis.includes('1m_token') ||
    basis.includes('per_1m')   ||
    basis === '1m'
  ) {
    return (tokensIn + tokensOut) / 1_000_000;
  }

  // GPU billing
  if (basis.includes('gpu_hour') || basis.includes('gpu')) {
    return gpuHours;
  }

  // Image / render billing
  if (
    basis.includes('per_image') ||
    basis.includes('image')     ||
    basis.includes('render')
  ) {
    return usageUnits > 0 ? usageUnits : 1;
  }

  // Seat / subscription — one unit per period
  if (
    basis.includes('per_seat') ||
    basis.includes('seat')     ||
    basis.includes('month')    ||
    basis.includes('subscription')
  ) {
    return 1;
  }

  // Per-call / per-request
  if (
    basis.includes('per_call')    ||
    basis.includes('call')        ||
    basis.includes('request')     ||
    basis.includes('per_request')
  ) {
    return 1;
  }

  // Unknown unit_basis — caller must treat the event as unrated.
  return null;
}

// ─── 4. Price a single event ────────────────────────────────────────────────

/**
 * Apply rate card pricing to one UsageEventRow.
 * Returns a fully-typed PricedEvent.
 *
 * Cost formula:
 *   computedCost = units * rate * (1 + markup)
 *
 * If no rate card matches, rated=false and finalCost=billedAmount.
 */
export function priceEvent(
  row:   UsageEventRow,
  index: IndexedRateCard[],
): PricedEvent {
  const tokensIn    = parseFloat(row.tokens_in)    || 0;
  const tokensOut   = parseFloat(row.tokens_out)   || 0;
  const gpuHours    = parseFloat(row.gpu_hours)    || 0;
  const rawUnits    = parseFloat((row as any).usage_units) || 0;
  const billedAmount= parseFloat(row.billed_amount) || 0;
  const eventDate   = parseDate(row.timestamp) ?? new Date();

  const rc = findRateCard(index, row.provider, row.model, eventDate);

  if (!rc) {
    return {
      eventId:      row.event_id   || '',
      employeeId:   row.employee_id|| '',
      provider:     row.provider   || '',
      model:        row.model      || '',
      eventType:    row.event_type || '',
      timestamp:    row.timestamp  || '',
      tokensIn,
      tokensOut,
      gpuHours,
      usageUnits:   rawUnits,
      unitBasis:    'unrated',
      billedAmount,
      computedCost: 0,
      finalCost:    billedAmount,
      rated:        false,
      rateKey:      'unrated',
    };
  }

  const units = computeUnits(rc.unitBasis, tokensIn, tokensOut, gpuHours, rawUnits);

  // null means the rate card's unit_basis is unrecognised — treat as unrated rather
  // than silently multiplying 1 × rate and producing a confidently wrong dollar figure.
  if (units === null) {
    return {
      eventId:      row.event_id   || '',
      employeeId:   row.employee_id|| '',
      provider:     row.provider   || '',
      model:        row.model      || '',
      eventType:    row.event_type || '',
      timestamp:    row.timestamp  || '',
      tokensIn,
      tokensOut,
      gpuHours,
      usageUnits:   rawUnits,
      unitBasis:    'unrated',
      billedAmount,
      computedCost: 0,
      finalCost:    billedAmount,
      rated:        false,
      rateKey:      'unrated',
    };
  }

  const computedCost = units * rc.rate * (1 + rc.markup);

  return {
    eventId:      row.event_id   || '',
    employeeId:   row.employee_id|| '',
    provider:     row.provider   || '',
    model:        row.model      || '',
    eventType:    row.event_type || '',
    timestamp:    row.timestamp  || '',
    tokensIn,
    tokensOut,
    gpuHours,
    usageUnits:   units,
    unitBasis:    rc.unitBasis,
    billedAmount,
    computedCost: Math.round(computedCost * 10_000) / 10_000,
    finalCost:    Math.round(computedCost * 10_000) / 10_000,
    rated:        true,
    rateKey:      `${rc.provider}::${rc.model}`,
  };
}

// ─── 5. Price all events ────────────────────────────────────────────────────

/**
 * Price every event in the list. Returns PricedEvent[].
 * This is the main entry point called by the context.
 *
 * When rateCardRows is empty/null, every event falls back to billed_amount.
 */
export function priceAllEvents(
  events:       UsageEventRow[],
  rateCardRows: RateCardRow[] | null,
): PricedEvent[] {
  const index = rateCardRows && rateCardRows.length > 0
    ? buildRateCardIndex(rateCardRows)
    : [];

  return events.map(ev => priceEvent(ev, index));
}

// ─── 6. Aggregate priced events by employee ─────────────────────────────────

/**
 * Sum finalCost, tokens, gpu, and prompts for one employee's events.
 */
export interface EmployeeAggregation {
  spend:   number;
  tokens:  number;
  gpu:     number;
  prompts: number;
  apps:    ToolId[];
  unratedCount: number;
}

export function aggregateByEmployee(
  events: PricedEvent[],
): Map<string, EmployeeAggregation> {
  const map = new Map<string, EmployeeAggregation>();

  for (const ev of events) {
    const id  = ev.employeeId;
    const agg = map.get(id) ?? {
      spend: 0, tokens: 0, gpu: 0, prompts: 0,
      apps: [], unratedCount: 0,
    };

    agg.spend  += ev.finalCost;
    agg.tokens += ev.tokensIn + ev.tokensOut;
    agg.gpu    += ev.gpuHours;
    agg.prompts+= 1;
    agg.unratedCount += ev.rated ? 0 : 1;

    const rawName = ev.provider || ev.model || '';
    const toolId  = rawName ? normalizeToolId(rawName) : '';
    if (toolId && !agg.apps.includes(toolId)) agg.apps.push(toolId);

    map.set(id, agg);
  }

  return map;
}
