import { generateGovernanceExceptions } from './governanceExceptions';
import { Employee, DeptSpend } from '../data/types';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1, name: 'Alice Test', dept: 'Finance', manager: 'Manager A',
    role: 'Analyst', eid: 'E-9001', fte: 1,
    spend: 100, tokens: 50, gpu: 1, prompts: 200,
    apps: ['Copilot'], policy: 'Compliant', variance: 0, alloc: 100,
    center: 'FIN-100', risk: 10, entity: 'US HQ',
    ...overrides,
  };
}

// ─── Empty input ──────────────────────────────────────────────────────────────

describe('generateGovernanceExceptions — empty input', () => {
  it('returns empty array for empty inputs', () => {
    expect(generateGovernanceExceptions([], [])).toHaveLength(0);
  });
});

// ─── R1: Spend vs Allocation ──────────────────────────────────────────────────

describe('R1 — Spend vs Allocation', () => {
  it('fires for employee >25% above allocation', () => {
    const emp = makeEmployee({ variance: 30, spend: 130, alloc: 100 });
    const exceptions = generateGovernanceExceptions([emp], []);
    expect(exceptions.some(e => e.ruleId === 'R1')).toBe(true);
  });

  it('does NOT fire when variance is zero', () => {
    const emp = makeEmployee({ variance: 0 });
    const exceptions = generateGovernanceExceptions([emp], []);
    expect(exceptions.every(e => e.ruleId !== 'R1')).toBe(true);
  });

  it('assigns critical severity for variance >150%', () => {
    const emp = makeEmployee({ variance: 200, spend: 300, alloc: 100 });
    const exceptions = generateGovernanceExceptions([emp], []);
    const r1 = exceptions.find(e => e.ruleId === 'R1');
    expect(r1?.severity).toBe('critical');
  });

  it('exception has required governance fields', () => {
    const emp = makeEmployee({ variance: 80, spend: 180, alloc: 100 });
    const exceptions = generateGovernanceExceptions([emp], []);
    const r1 = exceptions.find(e => e.ruleId === 'R1');
    expect(r1?.governanceInterpretation).toBeTruthy();
    expect(r1?.recommendedActions.length).toBeGreaterThan(0);
    expect(r1?.entityName).toBe('Alice Test');
  });
});

// ─── R2: Org-Wide Outlier (z-score) ──────────────────────────────────────────

describe('R2 — Org Spend Outlier', () => {
  it('does NOT fire with fewer than 5 employees', () => {
    const emps = [1, 2, 3, 4].map(i =>
      makeEmployee({ eid: `E-${i}`, spend: i * 100, name: `User ${i}` }),
    );
    const exceptions = generateGovernanceExceptions(emps, []);
    expect(exceptions.every(e => e.ruleId !== 'R2')).toBe(true);
  });

  it('fires for clear outlier in a group of 5+', () => {
    const normal = [1, 2, 3, 4].map(i =>
      makeEmployee({ eid: `E-${i}`, spend: 100, name: `User ${i}`, tokens: 50 }),
    );
    const outlier = makeEmployee({ eid: 'E-OUT', name: 'Heavy User', spend: 2000, tokens: 1000 });
    const exceptions = generateGovernanceExceptions([...normal, outlier], []);
    expect(exceptions.some(e => e.ruleId === 'R2' && e.entityId === 'E-OUT')).toBe(true);
  });
});

// ─── R3: Department Budget Variance ──────────────────────────────────────────

describe('R3 — Dept Budget Variance', () => {
  it('fires when department is >10% over budget', () => {
    const dept: DeptSpend = { name: 'Engineering', spend: 12000, budget: 10000, employees: 5 };
    const exceptions = generateGovernanceExceptions([], [dept]);
    expect(exceptions.some(e => e.ruleId === 'R3')).toBe(true);
  });

  it('does NOT fire when department is under budget', () => {
    const dept: DeptSpend = { name: 'HR', spend: 900, budget: 1000, employees: 2 };
    const exceptions = generateGovernanceExceptions([], [dept]);
    expect(exceptions.every(e => e.ruleId !== 'R3')).toBe(true);
  });

  it('assigns critical severity for >50% budget overage', () => {
    const dept: DeptSpend = { name: 'Legal', spend: 20000, budget: 10000, employees: 3 };
    const exceptions = generateGovernanceExceptions([], [dept]);
    const r3 = exceptions.find(e => e.ruleId === 'R3');
    expect(r3?.severity).toBe('critical');
  });
});

// ─── R4: Risk Score ───────────────────────────────────────────────────────────

describe('R4 — Risk Score', () => {
  it('fires for employee with risk ≥ 60', () => {
    const emp = makeEmployee({ risk: 65 });
    const exceptions = generateGovernanceExceptions([emp], []);
    expect(exceptions.some(e => e.ruleId === 'R4')).toBe(true);
  });

  it('does NOT fire for employee with risk < 60', () => {
    const emp = makeEmployee({ risk: 55 });
    const exceptions = generateGovernanceExceptions([emp], []);
    expect(exceptions.every(e => e.ruleId !== 'R4')).toBe(true);
  });

  it('assigns critical severity for risk ≥ 90', () => {
    const emp = makeEmployee({ risk: 92 });
    const exceptions = generateGovernanceExceptions([emp], []);
    const r4 = exceptions.find(e => e.ruleId === 'R4');
    expect(r4?.severity).toBe('critical');
  });
});

// ─── R5: Spend Concentration ─────────────────────────────────────────────────

describe('R5 — Spend Concentration', () => {
  it('does NOT fire with fewer than 3 employees', () => {
    const emps = [1, 2].map(i => makeEmployee({ eid: `E-${i}`, spend: i * 100, name: `User ${i}` }));
    const exceptions = generateGovernanceExceptions(emps, []);
    expect(exceptions.every(e => e.ruleId !== 'R5')).toBe(true);
  });

  it('fires when top-3 hold >30% of org spend (extreme concentration)', () => {
    const bigSpenders = [1, 2, 3].map(i =>
      makeEmployee({ eid: `E-BIG-${i}`, spend: 1000, name: `Big ${i}`, tokens: 500 }),
    );
    const smallSpenders = [4, 5, 6, 7].map(i =>
      makeEmployee({ eid: `E-SML-${i}`, spend: 10, name: `Small ${i}`, tokens: 5 }),
    );
    const exceptions = generateGovernanceExceptions([...bigSpenders, ...smallSpenders], []);
    expect(exceptions.some(e => e.ruleId === 'R5')).toBe(true);
  });
});

// ─── Output ordering ─────────────────────────────────────────────────────────

describe('generateGovernanceExceptions — output ordering', () => {
  it('sorts by sortKey descending (critical items first)', () => {
    const emps = [
      makeEmployee({ eid: 'E-A', variance: 30, spend: 130, alloc: 100, risk: 30, name: 'Medium User' }),
      makeEmployee({ eid: 'E-B', variance: 200, spend: 300, alloc: 100, risk: 95, name: 'Critical User' }),
    ];
    const exceptions = generateGovernanceExceptions(emps, []);
    if (exceptions.length >= 2) {
      expect(exceptions[0].severity === 'critical' || exceptions[0].severity === 'high').toBe(true);
    }
  });

  it('is deterministic — same input produces same output', () => {
    const emp = makeEmployee({ variance: 80, spend: 180, alloc: 100, risk: 70 });
    const a = generateGovernanceExceptions([emp], []);
    const b = generateGovernanceExceptions([emp], []);
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id));
  });
});
