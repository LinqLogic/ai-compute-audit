import { generateActionItems } from './generateActionItems';
import { Employee, DeptSpend } from '../data/types';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1, name: 'Test User', dept: 'Engineering', manager: 'Manager A',
    role: 'Engineer', eid: 'E-0001', fte: 1,
    spend: 100, tokens: 50, gpu: 1, prompts: 200,
    apps: [], policy: 'Compliant', variance: 0, alloc: 100,
    center: 'ENG-100', risk: 10, entity: 'US HQ',
    ...overrides,
  };
}

// ─── Empty input ──────────────────────────────────────────────────────────────

describe('generateActionItems — empty input', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(generateActionItems([], [])).toHaveLength(0);
  });

  it('still runs dept detectors when employees is empty', () => {
    const dept: DeptSpend = { name: 'Engineering', spend: 10_000, budget: 5_000, employees: 5 };
    const items = generateActionItems([], [dept]);
    // Budget overrun should fire (10k vs 5k = 100% over)
    expect(items.some(i => i.type === 'budget_overrun')).toBe(true);
  });
});

// ─── Spend spike detection ────────────────────────────────────────────────────

describe('generateActionItems — spend spikes', () => {
  it('generates spend_spike for employee >50% above allocation', () => {
    // variance=80 → high; spend=1000, alloc=500 → overage=500/month = $6000/yr > $2400 minimum
    const emp = makeEmployee({ spend: 1000, alloc: 500, variance: 100 });
    const items = generateActionItems([emp], []);
    expect(items.some(i => i.type === 'spend_spike')).toBe(true);
  });

  it('does NOT generate spend_spike when variance is zero', () => {
    const emp = makeEmployee({ spend: 100, alloc: 100, variance: 0 });
    const items = generateActionItems([emp], []);
    expect(items.every(i => i.type !== 'spend_spike')).toBe(true);
  });

  it('spend_spike items are sorted by priorityScore descending', () => {
    const emps = [
      makeEmployee({ eid: 'E-001', spend: 600, alloc: 200, variance: 200 }),
      makeEmployee({ eid: 'E-002', spend: 5000, alloc: 500, variance: 900 }),
    ];
    const items = generateActionItems(emps, []);
    const spikes = items.filter(i => i.type === 'spend_spike');
    if (spikes.length >= 2) {
      expect(spikes[0].priorityScore).toBeGreaterThanOrEqual(spikes[1].priorityScore);
    }
  });
});

// ─── Idle seat detection ──────────────────────────────────────────────────────

describe('generateActionItems — idle seats', () => {
  it('generates idle_seat for Copilot holder with low prompts', () => {
    // Copilot = $30/month; prompts=10 well below threshold → wasted seat
    const emp = makeEmployee({ apps: ['Copilot'], prompts: 10, spend: 50 });
    const items = generateActionItems([emp], []);
    expect(items.some(i => i.type === 'idle_seat')).toBe(true);
  });

  it('does NOT flag idle seat for employee with no seat tools', () => {
    const emp = makeEmployee({ apps: ['Some-Unknown-Tool'], prompts: 10, spend: 50 });
    const items = generateActionItems([emp], []);
    expect(items.every(i => i.type !== 'idle_seat')).toBe(true);
  });

  it('does NOT flag idle seat when prompts are above threshold', () => {
    // Threshold is 1,000 — 1,200 prompts should not trigger
    const emp = makeEmployee({ apps: ['Copilot'], prompts: 1200, spend: 50 });
    const items = generateActionItems([emp], []);
    expect(items.every(i => i.type !== 'idle_seat')).toBe(true);
  });
});

// ─── Model optimization detection ────────────────────────────────────────────

describe('generateActionItems — model optimization', () => {
  it('generates model_optimization for premium provider user above spend threshold', () => {
    const emp = makeEmployee({ apps: ['OpenAI', 'Anthropic'], spend: 300, prompts: 1000 });
    const items = generateActionItems([emp], []);
    expect(items.some(i => i.type === 'model_optimization')).toBe(true);
  });

  it('does NOT generate model_optimization for low spenders', () => {
    const emp = makeEmployee({ apps: ['OpenAI'], spend: 50, prompts: 500 });
    const items = generateActionItems([emp], []);
    expect(items.every(i => i.type !== 'model_optimization')).toBe(true);
  });
});

// ─── Budget overrun detection ─────────────────────────────────────────────────

describe('generateActionItems — budget overruns', () => {
  it('generates budget_overrun when dept spend significantly exceeds budget', () => {
    const dept: DeptSpend = { name: 'Legal', spend: 5000, budget: 2000, employees: 3 };
    const items = generateActionItems([], [dept]);
    expect(items.some(i => i.type === 'budget_overrun')).toBe(true);
  });

  it('does NOT generate budget_overrun when spend is within budget', () => {
    const dept: DeptSpend = { name: 'HR', spend: 1000, budget: 1200, employees: 2 };
    const items = generateActionItems([], [dept]);
    expect(items.every(i => i.type !== 'budget_overrun')).toBe(true);
  });
});

// ─── Output shape ─────────────────────────────────────────────────────────────

describe('generateActionItems — output shape', () => {
  it('all items have required fields', () => {
    const emp = makeEmployee({ spend: 1000, alloc: 400, variance: 150, apps: ['Copilot'], prompts: 5 });
    const items = generateActionItems([emp], []);
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.type).toBeTruthy();
      expect(item.severity).toMatch(/critical|high|medium|low/);
      expect(typeof item.priorityScore).toBe('number');
      expect(typeof item.estimatedAnnualSavings).toBe('number');
    }
  });

  it('is deterministic — same input produces same output', () => {
    const emp = makeEmployee({ spend: 800, alloc: 300, variance: 166, apps: ['OpenAI'], prompts: 50 });
    const a = generateActionItems([emp], []);
    const b = generateActionItems([emp], []);
    expect(a.map(i => i.id)).toEqual(b.map(i => i.id));
  });
});
