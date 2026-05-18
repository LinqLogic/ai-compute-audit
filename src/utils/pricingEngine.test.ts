import {
  buildRateCardIndex,
  findRateCard,
  computeUnits,
  priceEvent,
  priceAllEvents,
  aggregateByEmployee,
} from './pricingEngine';
import { RateCardRow, UsageEventRow } from '../types/csvRows';

// ─── buildRateCardIndex ───────────────────────────────────────────────────────

describe('buildRateCardIndex', () => {
  it('indexes valid rows', () => {
    const rows: RateCardRow[] = [
      { provider: 'OpenAI', model: 'GPT-4o', unit_basis: '1m_tokens', rate: '5.00', markup: '0.15', effective_start: '', effective_end: '' },
    ];
    const index = buildRateCardIndex(rows);
    expect(index).toHaveLength(1);
    expect(index[0].provider).toBe('openai');
    expect(index[0].model).toBe('gpt-4o');
    expect(index[0].rate).toBe(5);
    expect(index[0].markup).toBe(0.15);
  });

  it('drops rows with missing provider or model', () => {
    const rows: RateCardRow[] = [
      { provider: '', model: 'GPT-4o', unit_basis: '1m_tokens', rate: '5.00', markup: '0', effective_start: '', effective_end: '' },
      { provider: 'OpenAI', model: '', unit_basis: '1m_tokens', rate: '5.00', markup: '0', effective_start: '', effective_end: '' },
    ];
    expect(buildRateCardIndex(rows)).toHaveLength(0);
  });

  it('drops rows with non-positive rate', () => {
    const rows: RateCardRow[] = [
      { provider: 'OpenAI', model: 'GPT-4o', unit_basis: '1m_tokens', rate: '-1', markup: '0', effective_start: '', effective_end: '' },
      { provider: 'OpenAI', model: 'GPT-4o', unit_basis: '1m_tokens', rate: 'NaN', markup: '0', effective_start: '', effective_end: '' },
    ];
    expect(buildRateCardIndex(rows)).toHaveLength(0);
  });

  it('normalises casing on provider and model', () => {
    const rows: RateCardRow[] = [
      { provider: 'ANTHROPIC', model: 'Claude Sonnet 4', unit_basis: '1m_tokens', rate: '3', markup: '0', effective_start: '', effective_end: '' },
    ];
    const [entry] = buildRateCardIndex(rows);
    expect(entry.provider).toBe('anthropic');
    expect(entry.model).toBe('claude sonnet 4');
  });

  it('parses effective_start and effective_end as Dates', () => {
    const rows: RateCardRow[] = [
      { provider: 'OpenAI', model: 'gpt-4o', unit_basis: '1m_tokens', rate: '5', markup: '0', effective_start: '2026-01-01', effective_end: '2026-12-31' },
    ];
    const [entry] = buildRateCardIndex(rows);
    expect(entry.effectiveStart).toBeInstanceOf(Date);
    expect(entry.effectiveEnd).toBeInstanceOf(Date);
  });
});

// ─── findRateCard ─────────────────────────────────────────────────────────────

describe('findRateCard', () => {
  const index = buildRateCardIndex([
    { provider: 'openai', model: 'gpt-4o', unit_basis: '1m_tokens', rate: '5', markup: '0', effective_start: '', effective_end: '' },
    { provider: 'anthropic', model: 'claude-3', unit_basis: '1m_tokens', rate: '3', markup: '0', effective_start: '', effective_end: '' },
  ]);

  it('returns the exact match', () => {
    const rc = findRateCard(index, 'openai', 'gpt-4o', new Date());
    expect(rc).not.toBeNull();
    expect(rc!.rate).toBe(5);
  });

  it('is case-insensitive', () => {
    const rc = findRateCard(index, 'OpenAI', 'GPT-4O', new Date());
    expect(rc).not.toBeNull();
  });

  it('returns null when no match', () => {
    const rc = findRateCard(index, 'unknown-vendor', 'model-x', new Date());
    expect(rc).toBeNull();
  });

  it('returns prefix match when exact not found', () => {
    const rc = findRateCard(index, 'openai', 'gpt-4o-mini', new Date());
    expect(rc).not.toBeNull();
    expect(rc!.model).toBe('gpt-4o');
  });
});

// ─── computeUnits ─────────────────────────────────────────────────────────────

describe('computeUnits', () => {
  it('computes 1m_tokens basis', () => {
    expect(computeUnits('1m_tokens', 500_000, 500_000, 0, 0)).toBeCloseTo(1);
  });

  it('computes 1k_tokens basis', () => {
    expect(computeUnits('1k_tokens', 2000, 1000, 0, 0)).toBeCloseTo(3);
  });

  it('computes gpu_hour basis', () => {
    expect(computeUnits('gpu_hour', 0, 0, 4.5, 0)).toBeCloseTo(4.5);
  });

  it('returns 1 for seat basis', () => {
    expect(computeUnits('per_seat', 0, 0, 0, 0)).toBe(1);
  });

  it('returns 1 for unknown basis (fallback)', () => {
    expect(computeUnits('mystery-unit', 1000, 1000, 2, 5)).toBe(1);
  });

  it('returns usageUnits for image basis when provided', () => {
    expect(computeUnits('per_image', 0, 0, 0, 10)).toBe(10);
  });
});

// ─── priceEvent ───────────────────────────────────────────────────────────────

describe('priceEvent', () => {
  const index = buildRateCardIndex([
    { provider: 'openai', model: 'gpt-4o', unit_basis: '1m_tokens', rate: '5', markup: '0.15', effective_start: '', effective_end: '' },
  ]);

  const baseRow: UsageEventRow = {
    event_id: 'E1', employee_id: 'EMP1', provider: 'openai', model: 'gpt-4o',
    event_type: 'completion', timestamp: '2026-04-01T00:00:00Z',
    tokens_in: '500000', tokens_out: '500000', gpu_hours: '0', billed_amount: '10',
  };

  it('computes cost from rate card when matched', () => {
    const ev = priceEvent(baseRow, index);
    expect(ev.rated).toBe(true);
    expect(ev.computedCost).toBeCloseTo(1 * 5 * 1.15, 4); // 1M tokens = 1 unit, rate=5, markup=0.15
  });

  it('falls back to billedAmount when no rate card', () => {
    const ev = priceEvent({ ...baseRow, provider: 'unknown', model: 'model-x' }, index);
    expect(ev.rated).toBe(false);
    expect(ev.finalCost).toBe(10);
  });

  it('sets rateKey correctly', () => {
    const ev = priceEvent(baseRow, index);
    expect(ev.rateKey).toBe('openai::gpt-4o');
  });
});

// ─── priceAllEvents ───────────────────────────────────────────────────────────

describe('priceAllEvents', () => {
  it('returns empty array for empty events', () => {
    expect(priceAllEvents([], null)).toHaveLength(0);
  });

  it('falls back to billedAmount when rate cards are empty', () => {
    const events: UsageEventRow[] = [
      { event_id: 'E1', employee_id: 'EMP1', provider: 'openai', model: 'gpt-4o', event_type: 'completion', timestamp: '2026-04-01', tokens_in: '1000', tokens_out: '1000', gpu_hours: '0', billed_amount: '5' },
    ];
    const [ev] = priceAllEvents(events, []);
    expect(ev.rated).toBe(false);
    expect(ev.finalCost).toBe(5);
  });
});

// ─── aggregateByEmployee ──────────────────────────────────────────────────────

describe('aggregateByEmployee', () => {
  it('sums spend and tokens for one employee', () => {
    const events = priceAllEvents([
      { event_id: 'E1', employee_id: 'EMP1', provider: 'openai', model: 'gpt-4o', event_type: 'completion', timestamp: '2026-04-01', tokens_in: '1000', tokens_out: '500', gpu_hours: '0', billed_amount: '3' },
      { event_id: 'E2', employee_id: 'EMP1', provider: 'openai', model: 'gpt-4o', event_type: 'completion', timestamp: '2026-04-01', tokens_in: '2000', tokens_out: '500', gpu_hours: '0', billed_amount: '7' },
    ], null);

    const agg = aggregateByEmployee(events);
    expect(agg.get('EMP1')!.prompts).toBe(2);
    expect(agg.get('EMP1')!.spend).toBeCloseTo(10);
  });

  it('tracks multiple employees separately', () => {
    const events = priceAllEvents([
      { event_id: 'E1', employee_id: 'EMP1', provider: 'openai', model: 'gpt-4o', event_type: 'completion', timestamp: '2026-04-01', tokens_in: '1000', tokens_out: '0', gpu_hours: '0', billed_amount: '2' },
      { event_id: 'E2', employee_id: 'EMP2', provider: 'openai', model: 'gpt-4o', event_type: 'completion', timestamp: '2026-04-01', tokens_in: '1000', tokens_out: '0', gpu_hours: '0', billed_amount: '3' },
    ], null);

    const agg = aggregateByEmployee(events);
    expect(agg.size).toBe(2);
  });
});
