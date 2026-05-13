import { Employee, DeptSpend, GovernanceException } from '../data/types';

type Severity = 'critical' | 'high' | 'medium';

// ─── Pure math ────────────────────────────────────────────────────────────────

function arrMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function sampleStddev(arr: number[], m: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function arrMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function safeDiv(n: number, d: number): number {
  return d === 0 || !isFinite(d) ? 0 : n / d;
}

function classify(value: number, t: { medium: number; high: number; critical: number }): Severity | null {
  if (value >= t.critical) return 'critical';
  if (value >= t.high)     return 'high';
  if (value >= t.medium)   return 'medium';
  return null;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtPct(n: number, d = 1): string {
  return (n >= 0 ? '+' : '') + n.toFixed(d) + '%';
}

function fmtNum(n: number, d = 2): string {
  return n.toFixed(d);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityWeight(s: Severity): number {
  return s === 'critical' ? 3 : s === 'high' ? 2 : 1;
}

function makeSortKey(s: Severity, metric: number): number {
  return severityWeight(s) * 1_000_000 + Math.min(Math.round(Math.abs(metric) * 10), 999_999);
}

function makeId(ruleId: string, entityId: string): string {
  return `${ruleId}::${entityId.replace(/[^a-z0-9]/gi, '-')}`;
}

// ─── Rule R1: Employee Spend Variance ─────────────────────────────────────────

function ruleR1(employees: Employee[]): GovernanceException[] {
  const T = { medium: 25, high: 75, critical: 150 };
  const results: GovernanceException[] = [];

  for (const emp of employees) {
    if (emp.variance <= 0) continue;
    const severity = classify(emp.variance, T);
    if (!severity) continue;

    const over = emp.spend - emp.alloc;
    const interp: Record<Severity, string> = {
      critical: `${emp.name}'s spend is ${fmtPct(emp.variance)} over allocation (${fmt$(emp.spend)} vs ${fmt$(emp.alloc)} budgeted, ${fmt$(over)} overage). This critical breach requires CFO review before month lock.`,
      high:     `${emp.name}'s spend is ${fmtPct(emp.variance)} over allocation (${fmt$(emp.spend)} vs ${fmt$(emp.alloc)} budgeted, ${fmt$(over)} overage). Finance leadership approval is required.`,
      medium:   `${emp.name}'s spend is ${fmtPct(emp.variance)} over allocation (${fmt$(emp.spend)} vs ${fmt$(emp.alloc)} budgeted, ${fmt$(over)} overage). Manager review is recommended before period close.`,
    };
    const actions: Record<Severity, string[]> = {
      critical: ['Escalate to CFO — required before month lock', 'Obtain written business justification and attach to audit ledger', 'Review approved tool list for all active subscriptions'],
      high:     ['Request manager confirmation and written justification', 'Review tool usage breakdown and approved vendor list', 'Consider allocation adjustment for next period if spend is recurring'],
      medium:   ['Send manager review request with spend detail', 'Confirm usage is project-justified for the period', 'Update next-period allocation if this is a consistent trend'],
    };

    results.push({
      id:          makeId('R1', emp.eid),
      title:       `Spend ${fmtPct(emp.variance)} above allocation`,
      entityType:  'employee',
      entityId:    emp.eid,
      entityName:  emp.name,
      department:  emp.dept,
      costCenter:  emp.center,
      manager:     emp.manager,
      severity,
      ruleId:   'R1',
      ruleName: 'Spend vs Allocation',
      inputData: [
        { label: 'Actual spend',  value: fmt$(emp.spend) },
        { label: 'Allocated',     value: fmt$(emp.alloc) },
        { label: 'Overage',       value: fmt$(over) },
      ],
      calculations: [
        { label: 'Variance',  value: fmtPct(emp.variance) },
        { label: 'Formula',   value: '(spend − alloc) / alloc × 100' },
      ],
      thresholdComparison: {
        metricLabel: 'Spend variance',
        actual:    fmtPct(emp.variance),
        threshold: severity === 'critical' ? '> 150%' : severity === 'high' ? '> 75%' : '> 25%',
        exceeded:  true,
      },
      governanceInterpretation: interp[severity],
      recommendedActions:       actions[severity],
      sortKey: makeSortKey(severity, emp.variance),
    });
  }

  return results;
}

// ─── Rule R2: Org-Wide Spend Outlier (z-score) ───────────────────────────────

function ruleR2(employees: Employee[]): GovernanceException[] {
  if (employees.length < 5) return [];
  const T = { medium: 1.3, high: 1.8, critical: 2.5 };

  const spends = employees.map(e => e.spend);
  const m  = arrMean(spends);
  const sd = sampleStddev(spends, m);
  if (sd === 0) return [];

  const results: GovernanceException[] = [];

  for (const emp of employees) {
    if (emp.spend <= m) continue;
    const z = safeDiv(emp.spend - m, sd);
    const severity = classify(z, T);
    if (!severity) continue;

    const percentile = Math.round(employees.filter(e => e.spend <= emp.spend).length / employees.length * 100);

    results.push({
      id:         makeId('R2', emp.eid),
      title:      `Org-wide spend outlier — z-score ${fmtNum(z)} (${percentile}th percentile)`,
      entityType: 'employee',
      entityId:   emp.eid,
      entityName: emp.name,
      department: emp.dept,
      costCenter: emp.center,
      manager:    emp.manager,
      severity,
      ruleId:   'R2',
      ruleName: 'Org Spend Outlier',
      inputData: [
        { label: 'Employee spend', value: fmt$(emp.spend) },
        { label: 'Company mean',   value: fmt$(m) },
        { label: 'Std deviation',  value: fmt$(sd) },
      ],
      calculations: [
        { label: 'Z-score',    value: fmtNum(z) },
        { label: 'Formula',    value: '(spend − μ) / σ' },
        { label: 'Percentile', value: `${percentile}th` },
      ],
      thresholdComparison: {
        metricLabel: 'Z-score',
        actual:    fmtNum(z),
        threshold: severity === 'critical' ? '≥ 2.5' : severity === 'high' ? '≥ 1.8' : '≥ 1.3',
        exceeded:  true,
      },
      governanceInterpretation: `${emp.name}'s spend of ${fmt$(emp.spend)} is ${fmtNum(z)} standard deviations above the company mean of ${fmt$(m)}, placing them in the ${percentile}th percentile. This statistical outlier warrants verification that the spend is business-justified and not anomalous.`,
      recommendedActions: [
        'Review all active AI subscriptions and usage events for this employee',
        'Confirm with manager that activity aligns with role and current project scope',
        'Assess whether departmental allocation is appropriately sized for this role',
      ],
      sortKey: makeSortKey(severity, z * 100),
    });
  }

  return results;
}

// ─── Rule R3: Department Budget Variance ─────────────────────────────────────

function ruleR3(deptSpend: DeptSpend[]): GovernanceException[] {
  const T = { medium: 10, high: 25, critical: 50 };
  const results: GovernanceException[] = [];

  for (const dept of deptSpend) {
    const variancePct = safeDiv(dept.spend - dept.budget, dept.budget) * 100;
    if (variancePct <= 0) continue;
    const severity = classify(variancePct, T);
    if (!severity) continue;

    const over    = dept.spend - dept.budget;
    const perHead = safeDiv(over, dept.employees);

    const closing: Record<Severity, string> = {
      critical: 'This critical overage requires immediate Finance intervention and spend freeze until CFO approves.',
      high:     'Department head review is required before the period can close.',
      medium:   'Budget owner should confirm this is within acceptable tolerance or submit an adjustment.',
    };

    results.push({
      id:         makeId('R3', dept.name),
      title:      `${dept.name} — ${fmtPct(variancePct)} over AI budget`,
      entityType: 'department',
      entityId:   dept.name,
      entityName: dept.name,
      department: dept.name,
      costCenter: '',
      manager:    '',
      severity,
      ruleId:   'R3',
      ruleName: 'Dept Budget Variance',
      inputData: [
        { label: 'Actual spend', value: fmt$(dept.spend) },
        { label: 'Budget',       value: fmt$(dept.budget) },
        { label: 'Overage',      value: fmt$(over) },
        { label: 'Employees',    value: String(dept.employees) },
      ],
      calculations: [
        { label: 'Variance',         value: fmtPct(variancePct) },
        { label: 'Formula',          value: '(spend − budget) / budget × 100' },
        { label: 'Per-head overage', value: fmt$(perHead) },
      ],
      thresholdComparison: {
        metricLabel: 'Budget variance',
        actual:    fmtPct(variancePct),
        threshold: severity === 'critical' ? '> 50%' : severity === 'high' ? '> 25%' : '> 10%',
        exceeded:  true,
      },
      governanceInterpretation: `${dept.name} is ${fmtPct(variancePct)} over its AI budget (${fmt$(dept.spend)} actual vs ${fmt$(dept.budget)} budgeted — ${fmt$(over)} overage, ${fmt$(perHead)} per head). ${closing[severity]}`,
      recommendedActions: severity === 'critical'
        ? ['Freeze non-critical AI spend for this department immediately', 'Require CFO approval for any further spend this period', 'Initiate formal budget review for the next planning cycle']
        : severity === 'high'
        ? ['Department head must review and formally approve the overage', 'Identify the highest-spend employees and review their allocations', 'Submit a budget adjustment request if spend is expected to continue']
        : ['Budget owner to acknowledge and provide justification note', 'Monitor spend through the remainder of the period', 'Adjust next-period budget if this is a repeating pattern'],
      sortKey: makeSortKey(severity, variancePct),
    });
  }

  return results;
}

// ─── Rule R4: High Risk Score ─────────────────────────────────────────────────

function ruleR4(employees: Employee[]): GovernanceException[] {
  const T = { medium: 60, high: 75, critical: 90 };
  const results: GovernanceException[] = [];

  for (const emp of employees) {
    const severity = classify(emp.risk, T);
    if (!severity) continue;

    const thresholdVal = severity === 'critical' ? 90 : severity === 'high' ? 75 : 60;
    const margin = emp.risk - thresholdVal;

    results.push({
      id:         makeId('R4', emp.eid),
      title:      `Risk score ${emp.risk}/100 — ${severity} threshold breached`,
      entityType: 'employee',
      entityId:   emp.eid,
      entityName: emp.name,
      department: emp.dept,
      costCenter: emp.center,
      manager:    emp.manager,
      severity,
      ruleId:   'R4',
      ruleName: 'Risk Score',
      inputData: [
        { label: 'Risk score',    value: `${emp.risk}/100` },
        { label: 'Policy status', value: emp.policy },
        { label: 'Spend',         value: fmt$(emp.spend) },
        { label: 'Tools',         value: emp.apps.join(', ') },
      ],
      calculations: [
        { label: 'Score',     value: String(emp.risk) },
        { label: 'Threshold', value: `≥ ${thresholdVal}` },
        { label: 'Margin',    value: `+${margin} above threshold` },
      ],
      thresholdComparison: {
        metricLabel: 'Risk score',
        actual:    String(emp.risk),
        threshold: `≥ ${thresholdVal}`,
        exceeded:  true,
      },
      governanceInterpretation: `${emp.name} has a composite risk score of ${emp.risk}/100, ${margin} points above the ${severity} governance threshold of ${thresholdVal}. Risk is derived from spend variance, policy compliance status, tool diversity, and usage volume patterns.`,
      recommendedActions: severity === 'critical'
        ? ['Immediate compliance and finance team review required', 'Consider temporary spend restriction pending justification', 'Escalate to CFO for executive awareness before month lock']
        : severity === 'high'
        ? ['Manager must review tool usage and confirm policy adherence', 'Verify all active tools appear on the approved vendor list', 'Request written business justification for the period']
        : ['Add employee to the monitoring watchlist for this period', 'Review policy status and confirm compliance at next close', 'Manager to confirm usage aligns with role expectations'],
      sortKey: makeSortKey(severity, emp.risk),
    });
  }

  return results;
}

// ─── Rule R5: Usage Concentration (top-3 employees) ──────────────────────────

function ruleR5(employees: Employee[]): GovernanceException[] {
  if (employees.length < 3) return [];
  const T = { medium: 30, high: 45, critical: 60 };

  const totalSpend = employees.reduce((s, e) => s + e.spend, 0);
  if (totalSpend === 0) return [];

  const sorted = [...employees].sort((a, b) => b.spend - a.spend);
  const top3      = sorted.slice(0, 3);
  const top3Spend = top3.reduce((s, e) => s + e.spend, 0);
  const concPct   = safeDiv(top3Spend, totalSpend) * 100;

  const severity = classify(concPct, T);
  if (!severity) return [];

  return [{
    id:         'R5::org',
    title:      `Top-3 employees hold ${concPct.toFixed(1)}% of org AI spend`,
    entityType: 'organization',
    entityId:   'org',
    entityName: 'Organization',
    department: 'All Departments',
    costCenter: '',
    manager:    '',
    severity,
    ruleId:   'R5',
    ruleName: 'Spend Concentration',
    inputData: [
      { label: 'Total org spend', value: fmt$(totalSpend) },
      { label: 'Top-3 employees', value: top3.map(e => e.name).join(', ') },
      { label: 'Top-3 spend',     value: fmt$(top3Spend) },
    ],
    calculations: [
      { label: 'Concentration', value: concPct.toFixed(1) + '%' },
      { label: 'Formula',       value: 'top-3 spend / total spend × 100' },
      { label: 'Remaining',     value: `${employees.length - 3} employees share ${(100 - concPct).toFixed(1)}%` },
    ],
    thresholdComparison: {
      metricLabel: 'Top-3 concentration',
      actual:    concPct.toFixed(1) + '%',
      threshold: severity === 'critical' ? '> 60%' : severity === 'high' ? '> 45%' : '> 30%',
      exceeded:  true,
    },
    governanceInterpretation: `Three employees account for ${concPct.toFixed(1)}% of total AI spend (${fmt$(top3Spend)} of ${fmt$(totalSpend)}). High concentration increases audit exposure and reduces governance visibility — if any of these employees leave or are challenged, it can materially distort period-over-period comparisons.`,
    recommendedActions: [
      'Review per-employee spend caps and allocation policy for the top-3 spenders',
      'Audit tool usage and business justification for each concentrated employee',
      'Evaluate whether AI access should be distributed more broadly across the team',
      'Consider introducing per-head spend ceiling controls in the policy engine',
    ],
    sortKey: makeSortKey(severity, concPct),
  }];
}

// ─── Rule R6: Cost-per-1k-Token Outlier ──────────────────────────────────────

function ruleR6(employees: Employee[]): GovernanceException[] {
  const eligible = employees.filter(e => e.tokens > 0 && e.spend > 0);
  if (eligible.length < 4) return [];

  const T = { medium: 20, high: 45, critical: 80 };

  const costPerKt    = eligible.map(e => safeDiv(e.spend, e.tokens));
  const medianCostKt = arrMedian(costPerKt);
  if (medianCostKt === 0) return [];

  const results: GovernanceException[] = [];

  for (const emp of eligible) {
    const empCostKt = safeDiv(emp.spend, emp.tokens);
    if (empCostKt <= medianCostKt) continue;
    const excessPct = safeDiv(empCostKt - medianCostKt, medianCostKt) * 100;
    const severity  = classify(excessPct, T);
    if (!severity) continue;

    results.push({
      id:         makeId('R6', emp.eid),
      title:      `Token cost ${fmtPct(excessPct)} above company median`,
      entityType: 'employee',
      entityId:   emp.eid,
      entityName: emp.name,
      department: emp.dept,
      costCenter: emp.center,
      manager:    emp.manager,
      severity,
      ruleId:   'R6',
      ruleName: 'Token Efficiency',
      inputData: [
        { label: 'Spend',            value: fmt$(emp.spend) },
        { label: 'Tokens (K)',        value: emp.tokens.toLocaleString() },
        { label: 'Cost per 1k tokens', value: '$' + empCostKt.toFixed(2) },
        { label: 'Company median',    value: '$' + medianCostKt.toFixed(2) },
      ],
      calculations: [
        { label: 'Employee $/Kt', value: '$' + empCostKt.toFixed(2) },
        { label: 'Median $/Kt',   value: '$' + medianCostKt.toFixed(2) },
        { label: 'Excess',        value: fmtPct(excessPct) },
        { label: 'Formula',       value: '(emp − median) / median × 100' },
      ],
      thresholdComparison: {
        metricLabel: 'Cost/1k-token excess vs median',
        actual:    fmtPct(excessPct),
        threshold: severity === 'critical' ? '> 80%' : severity === 'high' ? '> 45%' : '> 20%',
        exceeded:  true,
      },
      governanceInterpretation: `${emp.name}'s effective cost of $${empCostKt.toFixed(2)}/1k tokens is ${fmtPct(excessPct)} above the company median of $${medianCostKt.toFixed(2)}/1k tokens. This suggests the employee may be using premium model tiers, running low-efficiency prompts, or accessing services not warranted by their output volume.`,
      recommendedActions: [
        'Review which AI providers and model tiers this employee is accessing',
        'Confirm premium model access is justified by the role and current workload',
        'Compare prompt patterns and model mix against departmental peers',
        'Consider adding model-tier guidance to the employee\'s usage policy',
      ],
      sortKey: makeSortKey(severity, excessPct),
    });
  }

  return results;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateGovernanceExceptions(
  employees: Employee[],
  deptSpend: DeptSpend[],
): GovernanceException[] {
  const all = [
    ...ruleR1(employees),
    ...ruleR2(employees),
    ...ruleR3(deptSpend),
    ...ruleR4(employees),
    ...ruleR5(employees),
    ...ruleR6(employees),
  ];

  return all.sort((a, b) =>
    b.sortKey !== a.sortKey
      ? b.sortKey - a.sortKey
      : a.entityName.localeCompare(b.entityName),
  );
}
