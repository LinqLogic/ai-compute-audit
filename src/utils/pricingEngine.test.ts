import {
  buildRateCardIndex,
  findRateCard,
  computeUnits,
  priceEvent,
  priceAllEvents,
  aggregateByEmployee,
} from './pricingEngine';
import { RateCardRow, UsageEventRow } from '../types/csvRows';
import { PricedEvent } from '../data/types';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeRC(overrides: Partial<RateCardRow> = {}): RateCardRow {
  return {
    provider:        'openai',
    model:           'gpt-4o',
    unit_basis:      '1m_tokens',
    rate:            '5.00',
    markup:          '0.10',
    effective_start: '',
    effective_end:   '',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<UsageEventRow> = {}): UsageEventRow {
  return {
    event_id:      'E1',
    employee_id:   'EMP1',
    provider:      'openai',
    model:         'gpt-4o',
    product:       'gpt-4o',
    event_type:    'completion',
    timestamp:     '2026-06-01T00:00:00Z',
    tokens_in:     '1000000',
    tokens_out:    '0',
    gpu_hours:     '0',
    billed_amount: '5.00',
    ...overrides,
  };
}

function makePricedEvent(overrides: Partial<PricedEvent> = {}): PricedEvent {
  return {
    eventId:      'E1',
    employeeId:   'EMP1',
    provider:     'openai',
    model:        'gpt-4o',
    eventType:    'completion',
    timestamp:    '2026-06-01T00:00:00Z',
    tokensIn:     500_000,
    tokensOut:    500_000,
    gpuHours:     0,
    usageUnits:   1,
    unitBasis:    '1m_tokens',
    billedAmount: 5,
    computedCost: 5.5,
    finalCost:    5.5,
    rated:        true,
    rateKey:      'openai::gpt-4o',
    ...overrides,
  };
}

// ─── buildRateCardIndex ───────────────────────────────────────────────────────

describe('buildRateCardIndex', () => {
  it('indexes a valid row with all fields', () => {
    const [rc] = buildRateCardIndex([makeRC()]);
    expect(rc.provider).toBe('openai');
    expect(rc.model).toBe('gpt-4o');
    expect(rc.rate).toBe(5);
    expect(rc.markup).toBe(0.1);
    expect(rc.unitBasis).toBe('1m_tokens');
  });

  it('normalises provider and model to lowercase and trims surrounding whitespace', () => {
    const [rc] = buildRateCardIndex([makeRC({ provider: '  ANTHROPIC  ', model: '  Claude Sonnet 4  ' })]);
    expect(rc.provider).toBe('anthropic');
    expect(rc.model).toBe('claude sonnet 4');
  });

  it('parses effective_start and effective_end as Date objects', () => {
    const [rc] = buildRateCardIndex([makeRC({ effective_start: '2026-01-01', effective_end: '2026-12-31' })]);
    expect(rc.effectiveStart).toBeInstanceOf(Date);
    expect(rc.effectiveEnd).toBeInstanceOf(Date);
    expect(rc.effectiveStart!.getUTCFullYear()).toBe(2026);
  });

  it('stores null for blank effective_start and effective_end', () => {
    const [rc] = buildRateCardIndex([makeRC({ effective_start: '', effective_end: '' })]);
    expect(rc.effectiveStart).toBeNull();
    expect(rc.effectiveEnd).toBeNull();
  });

  it('stores null for whitespace-only date strings', () => {
    const [rc] = buildRateCardIndex([makeRC({ effective_start: '   ', effective_end: '   ' })]);
    expect(rc.effectiveStart).toBeNull();
    expect(rc.effectiveEnd).toBeNull();
  });

  it('stores null for malformed date strings', () => {
    const [rc] = buildRateCardIndex([makeRC({ effective_start: 'not-a-date', effective_end: 'also-not' })]);
    expect(rc.effectiveStart).toBeNull();
    expect(rc.effectiveEnd).toBeNull();
  });

  it('drops rows with empty provider', () => {
    expect(buildRateCardIndex([makeRC({ provider: '' })])).toHaveLength(0);
  });

  it('drops rows with whitespace-only provider', () => {
    expect(buildRateCardIndex([makeRC({ provider: '   ' })])).toHaveLength(0);
  });

  it('drops rows with empty model', () => {
    expect(buildRateCardIndex([makeRC({ model: '' })])).toHaveLength(0);
  });

  it('drops rows with whitespace-only model', () => {
    expect(buildRateCardIndex([makeRC({ model: '   ' })])).toHaveLength(0);
  });

  it('drops rows with negative rate', () => {
    expect(buildRateCardIndex([makeRC({ rate: '-1' })])).toHaveLength(0);
  });

  it('drops rows with NaN rate', () => {
    expect(buildRateCardIndex([makeRC({ rate: 'not-a-number' })])).toHaveLength(0);
  });

  it('drops rows with empty rate string (parses as NaN)', () => {
    expect(buildRateCardIndex([makeRC({ rate: '' })])).toHaveLength(0);
  });

  it('drops rows with zero rate (non-positive guard now matches docstring)', () => {
    expect(buildRateCardIndex([makeRC({ rate: '0' })])).toHaveLength(0);
  });

  it('defaults markup to 0 when markup is NaN', () => {
    const [rc] = buildRateCardIndex([makeRC({ markup: 'bad' })]);
    expect(rc.markup).toBe(0);
  });

  it('defaults markup to 0 when markup field is empty', () => {
    const [rc] = buildRateCardIndex([makeRC({ markup: '' })]);
    expect(rc.markup).toBe(0);
  });

  it('defaults unitBasis to "unknown" when unit_basis is blank', () => {
    const [rc] = buildRateCardIndex([makeRC({ unit_basis: '' })]);
    expect(rc.unitBasis).toBe('unknown');
  });

  it('defaults unitBasis to "unknown" when unit_basis is whitespace only', () => {
    const [rc] = buildRateCardIndex([makeRC({ unit_basis: '   ' })]);
    expect(rc.unitBasis).toBe('unknown');
  });

  it('returns empty array for empty input', () => {
    expect(buildRateCardIndex([])).toHaveLength(0);
  });
});

// ─── findRateCard ─────────────────────────────────────────────────────────────

describe('findRateCard', () => {
  const EVENT_DATE = new Date('2026-06-01');
  const PAST_DATE  = new Date('2025-01-01');
  const FUT_DATE   = new Date('2027-01-01');

  it('returns exact provider+model match', () => {
    const index = buildRateCardIndex([makeRC()]);
    const rc = findRateCard(index, 'openai', 'gpt-4o', EVENT_DATE);
    expect(rc).not.toBeNull();
    expect(rc!.rate).toBe(5);
  });

  it('is case-insensitive for both provider and model', () => {
    const index = buildRateCardIndex([makeRC()]);
    expect(findRateCard(index, 'OpenAI', 'GPT-4O', EVENT_DATE)).not.toBeNull();
    expect(findRateCard(index, 'OPENAI', 'gpt-4O', EVENT_DATE)).not.toBeNull();
  });

  it('returns null when no provider matches', () => {
    const index = buildRateCardIndex([makeRC()]);
    expect(findRateCard(index, 'anthropic', 'gpt-4o', EVENT_DATE)).toBeNull();
  });

  it('returns null when provider matches but model does not (and no wildcard)', () => {
    const index = buildRateCardIndex([makeRC()]);
    expect(findRateCard(index, 'openai', 'completely-different-model', EVENT_DATE)).toBeNull();
  });

  // Pass 1 date logic ─────────────────────────────────────────────────────────

  it('returns dated entry that covers the event date', () => {
    const index = buildRateCardIndex([
      makeRC({ effective_start: '2026-01-01', effective_end: '2026-12-31' }),
    ]);
    expect(findRateCard(index, 'openai', 'gpt-4o', EVENT_DATE)).not.toBeNull();
  });

  it('when multiple dated entries cover event date, picks the one with latest effectiveStart', () => {
    const index = buildRateCardIndex([
      makeRC({ rate: '3.00', effective_start: '2026-01-01' }),
      makeRC({ rate: '7.00', effective_start: '2026-05-01' }),
    ]);
    const rc = findRateCard(index, 'openai', 'gpt-4o', EVENT_DATE);
    expect(rc!.rate).toBe(7);
  });

  it('falls back to undated exact match when no dated entry covers event date', () => {
    const index = buildRateCardIndex([
      makeRC({ rate: '3.00', effective_start: '2026-01-01', effective_end: '2026-05-31' }),
      makeRC({ rate: '9.00', effective_start: '', effective_end: '' }),
    ]);
    const rc = findRateCard(index, 'openai', 'gpt-4o', FUT_DATE);
    expect(rc!.rate).toBe(9);
  });

  it('returns null when exact match exists but event falls outside all dated ranges (no undated fallback)', () => {
    const index = buildRateCardIndex([
      makeRC({ rate: '99.00', effective_start: '2025-01-01', effective_end: '2025-12-31' }),
    ]);
    expect(findRateCard(index, 'openai', 'gpt-4o', FUT_DATE)).toBeNull();
  });

  it('expired date range: priceEvent returns rated:false and falls back to billedAmount', () => {
    const rateCards = [makeRC({ rate: '99.00', effective_start: '2025-01-01', effective_end: '2025-12-31' })];
    const ev = priceEvent(makeEvent({ billed_amount: '7.77', timestamp: '2027-03-01T00:00:00Z' }), buildRateCardIndex(rateCards));
    expect(ev.rated).toBe(false);
    expect(ev.finalCost).toBe(7.77);
    expect(ev.computedCost).toBe(0);
  });

  // Pass 2: prefix matching ───────────────────────────────────────────────────

  it('matches when event model starts with rate card model (versioned model lookup)', () => {
    const index = buildRateCardIndex([makeRC({ model: 'gpt-4o' })]);
    const rc = findRateCard(index, 'openai', 'gpt-4o-mini', EVENT_DATE);
    expect(rc).not.toBeNull();
    expect(rc!.model).toBe('gpt-4o');
  });

  it('matches when rate card model starts with event model (reverse prefix)', () => {
    const index = buildRateCardIndex([makeRC({ model: 'gpt-4o-mini' })]);
    const rc = findRateCard(index, 'openai', 'gpt-4o', EVENT_DATE);
    expect(rc).not.toBeNull();
    expect(rc!.model).toBe('gpt-4o-mini');
  });

  it('exact match takes priority over prefix match', () => {
    const index = buildRateCardIndex([
      makeRC({ model: 'gpt-4o',      rate: '5.00' }),
      makeRC({ model: 'gpt-4o-mini', rate: '1.00' }),
    ]);
    const rc = findRateCard(index, 'openai', 'gpt-4o-mini', EVENT_DATE);
    expect(rc!.rate).toBe(1);
  });

  // Pass 3: provider wildcard ─────────────────────────────────────────────────

  it('matches provider-level wildcard model "*"', () => {
    const index = buildRateCardIndex([makeRC({ model: '*', rate: '2.00' })]);
    const rc = findRateCard(index, 'openai', 'gpt-4o', EVENT_DATE);
    expect(rc).not.toBeNull();
    expect(rc!.rate).toBe(2);
  });

  it('matches provider-level "default" model', () => {
    const index = buildRateCardIndex([makeRC({ model: 'default', rate: '2.00' })]);
    const rc = findRateCard(index, 'openai', 'gpt-4o', EVENT_DATE);
    expect(rc).not.toBeNull();
    expect(rc!.rate).toBe(2);
  });

  it('wildcard does not match a different provider', () => {
    const index = buildRateCardIndex([makeRC({ provider: 'anthropic', model: '*' })]);
    expect(findRateCard(index, 'openai', 'gpt-4o', EVENT_DATE)).toBeNull();
  });
});

// ─── computeUnits ─────────────────────────────────────────────────────────────

describe('computeUnits', () => {
  // Per-1M token variants ────────────────────────────────────────────────────

  it('1m_tokens → (in + out) / 1_000_000', () => {
    expect(computeUnits('1m_tokens', 600_000, 400_000, 0, 0)).toBeCloseTo(1);
  });

  it('per_1m_tokens → (in + out) / 1_000_000', () => {
    expect(computeUnits('per_1m_tokens', 2_000_000, 0, 0, 0)).toBeCloseTo(2);
  });

  it('mixed case normalised before matching', () => {
    expect(computeUnits('1M_Tokens', 1_000_000, 0, 0, 0)).toBeCloseTo(1);
  });

  it('hyphenated form normalised: 1m-tokens', () => {
    expect(computeUnits('1m-tokens', 1_000_000, 0, 0, 0)).toBeCloseTo(1);
  });

  it('"1m" exact match → (in + out) / 1_000_000', () => {
    expect(computeUnits('1m', 2_000_000, 0, 0, 0)).toBeCloseTo(2);
  });

  // Per-1K token variants ────────────────────────────────────────────────────

  it('1k_tokens → (in + out) / 1_000', () => {
    expect(computeUnits('1k_tokens', 2_000, 1_000, 0, 0)).toBeCloseTo(3);
  });

  it('per_1k_tokens → (in + out) / 1_000', () => {
    expect(computeUnits('per_1k_tokens', 5_000, 0, 0, 0)).toBeCloseTo(5);
  });

  it('"tokens" exact match → (in + out) / 1_000 (not 1M)', () => {
    expect(computeUnits('tokens', 5_000, 0, 0, 0)).toBeCloseTo(5);
  });

  it('"token" exact match → (in + out) / 1_000', () => {
    expect(computeUnits('token', 1_000, 0, 0, 0)).toBeCloseTo(1);
  });

  // GPU hours ────────────────────────────────────────────────────────────────

  it('gpu_hour → gpuHours value', () => {
    expect(computeUnits('gpu_hour', 0, 0, 3.5, 0)).toBeCloseTo(3.5);
  });

  it('gpu_hours → gpuHours value', () => {
    expect(computeUnits('gpu_hours', 0, 0, 2.0, 0)).toBeCloseTo(2);
  });

  it('gpu-hours (hyphen) normalised correctly', () => {
    expect(computeUnits('gpu-hours', 0, 0, 1.25, 0)).toBeCloseTo(1.25);
  });

  // Image / render ───────────────────────────────────────────────────────────

  it('per_image → usageUnits when usageUnits > 0', () => {
    expect(computeUnits('per_image', 0, 0, 0, 4)).toBe(4);
  });

  it('per_image → 1 when usageUnits is 0', () => {
    expect(computeUnits('per_image', 0, 0, 0, 0)).toBe(1);
  });

  it('"image" basis → usageUnits when > 0', () => {
    expect(computeUnits('image', 0, 0, 0, 10)).toBe(10);
  });

  it('"render" basis → usageUnits when > 0', () => {
    expect(computeUnits('render', 0, 0, 0, 3)).toBe(3);
  });

  // Seat / subscription ──────────────────────────────────────────────────────

  it('per_seat → 1', () => {
    expect(computeUnits('per_seat', 0, 0, 0, 0)).toBe(1);
  });

  it('seat → 1', () => {
    expect(computeUnits('seat', 0, 0, 0, 0)).toBe(1);
  });

  it('month → 1', () => {
    expect(computeUnits('month', 0, 0, 0, 0)).toBe(1);
  });

  it('subscription → 1', () => {
    expect(computeUnits('subscription', 0, 0, 0, 0)).toBe(1);
  });

  // Per-call ─────────────────────────────────────────────────────────────────

  it('per_call → 1', () => {
    expect(computeUnits('per_call', 0, 0, 0, 0)).toBe(1);
  });

  it('call → 1', () => {
    expect(computeUnits('call', 0, 0, 0, 0)).toBe(1);
  });

  it('request → 1', () => {
    expect(computeUnits('request', 0, 0, 0, 0)).toBe(1);
  });

  it('unknown basis returns null (caller treats event as unrated)', () => {
    expect(computeUnits('completely_unknown', 999_999, 0, 3, 7)).toBeNull();
  });

  it('unknown basis does not throw', () => {
    expect(() => computeUnits('completely_unknown', 999_999, 0, 3, 7)).not.toThrow();
  });
});

// ─── priceEvent ───────────────────────────────────────────────────────────────

describe('priceEvent', () => {
  const baseIndex = buildRateCardIndex([
    makeRC({ rate: '5.00', markup: '0.15', unit_basis: '1m_tokens' }),
  ]);

  it('rated:true when rate card matches', () => {
    expect(priceEvent(makeEvent(), baseIndex).rated).toBe(true);
  });

  it('exact cost: 1M tokens, rate=5.00, markup=0.15 → computedCost=5.75', () => {
    const ev = priceEvent(makeEvent({ tokens_in: '1000000', tokens_out: '0' }), baseIndex);
    expect(ev.computedCost).toBe(5.75);
  });

  it('exact cost: 2M tokens, rate=3.00, markup=0.15 → computedCost=6.9', () => {
    const idx = buildRateCardIndex([makeRC({ rate: '3.00', markup: '0.15', unit_basis: '1m_tokens' })]);
    const ev = priceEvent(makeEvent({ tokens_in: '2000000', tokens_out: '0' }), idx);
    expect(ev.computedCost).toBe(6.9);
  });

  it('rounds computedCost to 4 decimal places', () => {
    const idx = buildRateCardIndex([makeRC({ rate: '1.00', markup: '0.3333', unit_basis: '1m_tokens' })]);
    const ev = priceEvent(makeEvent({ tokens_in: '1000000', tokens_out: '0' }), idx);
    expect(ev.computedCost).toBe(1.3333);
  });

  it('computedCost === finalCost when rated', () => {
    const ev = priceEvent(makeEvent(), baseIndex);
    expect(ev.finalCost).toBe(ev.computedCost);
  });

  it('rateKey is "provider::model" when rated', () => {
    expect(priceEvent(makeEvent(), baseIndex).rateKey).toBe('openai::gpt-4o');
  });

  it('unitBasis on result matches matched rate card', () => {
    expect(priceEvent(makeEvent(), baseIndex).unitBasis).toBe('1m_tokens');
  });

  it('rated:false when no rate card matches', () => {
    const ev = priceEvent(makeEvent({ provider: 'unknown', model: 'x' }), baseIndex);
    expect(ev.rated).toBe(false);
  });

  it('finalCost = billedAmount when unrated', () => {
    const ev = priceEvent(makeEvent({ provider: 'unknown', model: 'x', billed_amount: '9.99' }), baseIndex);
    expect(ev.finalCost).toBe(9.99);
  });

  it('computedCost = 0 when unrated', () => {
    const ev = priceEvent(makeEvent({ provider: 'unknown', model: 'x' }), baseIndex);
    expect(ev.computedCost).toBe(0);
  });

  it('rateKey = "unrated" when no rate card matches', () => {
    const ev = priceEvent(makeEvent({ provider: 'unknown', model: 'x' }), baseIndex);
    expect(ev.rateKey).toBe('unrated');
  });

  it('unitBasis = "unrated" when no rate card matches', () => {
    const ev = priceEvent(makeEvent({ provider: 'unknown', model: 'x' }), baseIndex);
    expect(ev.unitBasis).toBe('unrated');
  });

  it('zero billedAmount falls back to 0 finalCost when unrated', () => {
    const ev = priceEvent(makeEvent({ provider: 'unknown', model: 'x', billed_amount: '0' }), baseIndex);
    expect(ev.finalCost).toBe(0);
  });

  it('empty tokens_in treated as 0, not NaN', () => {
    const ev = priceEvent(makeEvent({ tokens_in: '' }), baseIndex);
    expect(ev.tokensIn).toBe(0);
    expect(Number.isNaN(ev.computedCost)).toBe(false);
  });

  it('malformed timestamp does not throw (defaults to current date)', () => {
    expect(() =>
      priceEvent(makeEvent({ timestamp: 'not-a-date' }), baseIndex)
    ).not.toThrow();
  });

  it('event fields preserved on rated result', () => {
    const ev = priceEvent(makeEvent({ event_id: 'XYZ', employee_id: 'E99', event_type: 'batch' }), baseIndex);
    expect(ev.eventId).toBe('XYZ');
    expect(ev.employeeId).toBe('E99');
    expect(ev.eventType).toBe('batch');
  });

  it('empty provider/model preserved as empty strings on unrated result', () => {
    const ev = priceEvent(makeEvent({ provider: '', model: '' }), []);
    expect(ev.provider).toBe('');
    expect(ev.model).toBe('');
  });

  it('unknown-basis rate card: priceEvent returns rated:false and falls back to billedAmount', () => {
    const idx = buildRateCardIndex([makeRC({ unit_basis: 'completely_unknown', rate: '5.00', markup: '0' })]);
    const ev  = priceEvent(makeEvent({ tokens_in: '5000000', billed_amount: '12.34' }), idx);
    expect(ev.rated).toBe(false);
    expect(ev.computedCost).toBe(0);
    expect(ev.finalCost).toBe(12.34);
    expect(ev.unitBasis).toBe('unrated');
    expect(ev.rateKey).toBe('unrated');
  });

  // FINDING: priceEvent reads usage_units via `(row as any).usage_units`, which is
  // not a declared field on UsageEventRow. For any standard UsageEventRow the field
  // is undefined → coerced to 0, so image/render-basis rate cards always charge 1
  // unit regardless of actual image count. Uploading a CSV with a usage_units column
  // has no effect on pricing.
  it('FINDING: image-basis rate card always charges 1 unit (usage_units not on UsageEventRow)', () => {
    const idx = buildRateCardIndex([makeRC({ unit_basis: 'per_image', rate: '0.02', markup: '0' })]);
    const ev  = priceEvent(makeEvent(), idx);
    expect(ev.rated).toBe(true);
    expect(ev.usageUnits).toBe(1);
    expect(ev.computedCost).toBe(0.02);
  });

  it('zero-rate card is dropped by buildRateCardIndex, so event falls back to billedAmount', () => {
    const idx = buildRateCardIndex([makeRC({ rate: '0', markup: '0' })]);
    expect(idx).toHaveLength(0);
    const ev  = priceEvent(makeEvent({ billed_amount: '9.99' }), idx);
    expect(ev.rated).toBe(false);
    expect(ev.finalCost).toBe(9.99);
  });
});

// ─── priceAllEvents ───────────────────────────────────────────────────────────

describe('priceAllEvents', () => {
  it('returns empty array for empty events', () => {
    expect(priceAllEvents([], null)).toHaveLength(0);
  });

  it('returns empty array for empty events with empty rate cards', () => {
    expect(priceAllEvents([], [])).toHaveLength(0);
  });

  it('all events unrated when rate cards is null', () => {
    const events = [makeEvent(), makeEvent({ event_id: 'E2' })];
    const priced = priceAllEvents(events, null);
    expect(priced.every(ev => !ev.rated)).toBe(true);
  });

  it('all events unrated when rate cards is empty array', () => {
    const priced = priceAllEvents([makeEvent()], []);
    expect(priced[0].rated).toBe(false);
    expect(priced[0].finalCost).toBe(5);
  });

  it('prices events against matching rate cards', () => {
    const priced = priceAllEvents([makeEvent()], [makeRC()]);
    expect(priced[0].rated).toBe(true);
  });

  it('mixed: matched events rated, unmatched events unrated', () => {
    const events = [
      makeEvent({ provider: 'openai',   model: 'gpt-4o', billed_amount: '3' }),
      makeEvent({ provider: 'unknown',  model: 'model-x', billed_amount: '7' }),
    ];
    const priced = priceAllEvents(events, [makeRC()]);
    expect(priced[0].rated).toBe(true);
    expect(priced[1].rated).toBe(false);
    expect(priced[1].finalCost).toBe(7);
  });

  it('preserves event order in output', () => {
    const events = [
      makeEvent({ event_id: 'A' }),
      makeEvent({ event_id: 'B' }),
      makeEvent({ event_id: 'C' }),
    ];
    const priced = priceAllEvents(events, []);
    expect(priced.map(e => e.eventId)).toEqual(['A', 'B', 'C']);
  });
});

// ─── aggregateByEmployee ──────────────────────────────────────────────────────

describe('aggregateByEmployee', () => {
  it('returns empty map for empty events', () => {
    expect(aggregateByEmployee([]).size).toBe(0);
  });

  it('creates one entry per distinct employeeId', () => {
    const events = [
      makePricedEvent({ employeeId: 'A' }),
      makePricedEvent({ employeeId: 'B' }),
      makePricedEvent({ employeeId: 'A' }),
    ];
    expect(aggregateByEmployee(events).size).toBe(2);
  });

  it('sums finalCost into spend', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', finalCost: 3.5 }),
      makePricedEvent({ employeeId: 'A', finalCost: 6.5 }),
    ];
    expect(aggregateByEmployee(events).get('A')!.spend).toBeCloseTo(10);
  });

  it('sums tokensIn + tokensOut into tokens', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', tokensIn: 1_000, tokensOut: 500 }),
      makePricedEvent({ employeeId: 'A', tokensIn: 2_000, tokensOut: 1_000 }),
    ];
    expect(aggregateByEmployee(events).get('A')!.tokens).toBe(4_500);
  });

  it('sums gpuHours into gpu', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', gpuHours: 1.5 }),
      makePricedEvent({ employeeId: 'A', gpuHours: 2.0 }),
    ];
    expect(aggregateByEmployee(events).get('A')!.gpu).toBeCloseTo(3.5);
  });

  it('increments prompts by 1 per event', () => {
    const events = [
      makePricedEvent({ employeeId: 'A' }),
      makePricedEvent({ employeeId: 'A' }),
      makePricedEvent({ employeeId: 'A' }),
    ];
    expect(aggregateByEmployee(events).get('A')!.prompts).toBe(3);
  });

  it('tracks multiple employees independently', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', finalCost: 10, tokensIn: 1000, tokensOut: 0 }),
      makePricedEvent({ employeeId: 'B', finalCost: 20, tokensIn: 2000, tokensOut: 0 }),
    ];
    const agg = aggregateByEmployee(events);
    expect(agg.get('A')!.spend).toBe(10);
    expect(agg.get('B')!.spend).toBe(20);
    expect(agg.get('A')!.tokens).toBe(1000);
    expect(agg.get('B')!.tokens).toBe(2000);
  });

  it('increments unratedCount only for unrated events', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', rated: true  }),
      makePricedEvent({ employeeId: 'A', rated: false }),
      makePricedEvent({ employeeId: 'A', rated: false }),
    ];
    expect(aggregateByEmployee(events).get('A')!.unratedCount).toBe(2);
  });

  it('deduplicates same provider into one apps entry', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', provider: 'openai' }),
      makePricedEvent({ employeeId: 'A', provider: 'openai' }),
    ];
    expect(aggregateByEmployee(events).get('A')!.apps).toHaveLength(1);
  });

  it('deduplicates providers case-insensitively via normalizeToolId', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', provider: 'OpenAI' }),
      makePricedEvent({ employeeId: 'A', provider: 'openai' }),
    ];
    expect(aggregateByEmployee(events).get('A')!.apps).toHaveLength(1);
  });

  it('includes all distinct provider toolIds in apps', () => {
    const events = [
      makePricedEvent({ employeeId: 'A', provider: 'openai'    }),
      makePricedEvent({ employeeId: 'A', provider: 'anthropic' }),
    ];
    const apps = aggregateByEmployee(events).get('A')!.apps;
    expect(apps).toHaveLength(2);
    expect(apps).toContain('openai');
    expect(apps).toContain('anthropic');
  });

  it('uses provider for app identification when both provider and model are present', () => {
    const ev = makePricedEvent({ employeeId: 'A', provider: 'openai', model: 'claude-3' });
    const apps = aggregateByEmployee([ev]).get('A')!.apps;
    expect(apps).toContain('openai');
    expect(apps).not.toContain('anthropic');
  });

  it('falls back to model when provider is empty string', () => {
    const ev = makePricedEvent({ employeeId: 'A', provider: '', model: 'claude-3' });
    const apps = aggregateByEmployee([ev]).get('A')!.apps;
    expect(apps).toContain('anthropic');
  });

  it('does not add an app entry when both provider and model are empty', () => {
    const ev = makePricedEvent({ employeeId: 'A', provider: '', model: '' });
    expect(aggregateByEmployee([ev]).get('A')!.apps).toHaveLength(0);
  });

  it('empty employeeId is a valid key in the result map', () => {
    const ev = makePricedEvent({ employeeId: '' });
    const agg = aggregateByEmployee([ev]);
    expect(agg.has('')).toBe(true);
    expect(agg.get('')!.prompts).toBe(1);
  });
});
