/**
 * exportData.ts
 *
 * Pure serialisation functions. No React.
 * Triggers a browser download via a DOM-appended anchor element.
 *
 * Fixes applied vs original:
 *   - downloadFile now appends <a> to document.body before .click() and
 *     removes it after, ensuring Firefox and all browsers reliably trigger
 *     the download before the object URL is revoked.
 *   - URL.revokeObjectURL is deferred 100 ms to guarantee the browser has
 *     consumed the URL before it is released.
 */

import { Employee, DeptSpend, RateCard } from '../data/types';

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const s = String(value ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const header = headers.map(escapeCsv).join(',');
  const body   = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
  return `${header}\n${body}`;
}

/**
 * Trigger a browser file download.
 *
 * The anchor must be appended to the DOM before .click() is called —
 * Firefox silently ignores clicks on detached elements. The object URL
 * is revoked after a short delay to allow the browser to initiate the
 * download before the Blob reference is released.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revocation so the browser can consume the URL first
  setTimeout(() => URL.revokeObjectURL(url), 150);
}

// ─── Employee export ──────────────────────────────────────────────────────────

const EMPLOYEE_HEADERS = [
  'employee_id', 'name', 'department', 'manager', 'cost_center',
  'spend', 'allocation', 'variance_pct', 'tokens_k', 'gpu_hours',
  'prompts', 'apps', 'policy', 'risk_score', 'entity',
];

function employeeRows(employees: Employee[]): unknown[][] {
  return employees.map(e => [
    e.eid, e.name, e.dept, e.manager, e.center,
    e.spend.toFixed(2), e.alloc, e.variance,
    e.tokens, e.gpu, e.prompts,
    e.apps.join(' | '), e.policy, e.risk, e.entity,
  ]);
}

export function exportEmployeesCsv(employees: Employee[]): void {
  downloadFile(
    toCsv(EMPLOYEE_HEADERS, employeeRows(employees)),
    'ai_audit_employees.csv',
    'text/csv',
  );
}

export function exportEmployeesJson(employees: Employee[]): void {
  downloadFile(
    JSON.stringify(employees, null, 2),
    'ai_audit_employees.json',
    'application/json',
  );
}

// ─── Department spend export ──────────────────────────────────────────────────

const DEPT_HEADERS = [
  'department', 'spend', 'budget', 'variance_pct', 'employee_count',
];

export function exportDeptSpendCsv(deptSpend: DeptSpend[]): void {
  const rows = deptSpend.map(d => {
    const variance = d.budget > 0
      ? Math.round(((d.spend - d.budget) / d.budget) * 100)
      : 0;
    return [d.name, d.spend, d.budget, variance, d.employees];
  });
  downloadFile(toCsv(DEPT_HEADERS, rows), 'ai_audit_dept_spend.csv', 'text/csv');
}

// ─── Policy / risk mix export ─────────────────────────────────────────────────

export function exportPolicyMixCsv(employees: Employee[]): void {
  const headers = ['policy_status', 'count', 'pct_of_total'];
  const counts  = { Compliant: 0, Review: 0, Escalate: 0 };
  for (const e of employees) {
    counts[e.policy] = (counts[e.policy] ?? 0) + 1;
  }
  const total = employees.length;
  const rows  = Object.entries(counts).map(([status, count]) => [
    status,
    count,
    total > 0 ? ((count / total) * 100).toFixed(1) : '0',
  ]);
  downloadFile(toCsv(headers, rows), 'ai_audit_policy_mix.csv', 'text/csv');
}

// ─── Rate card export ─────────────────────────────────────────────────────────

const RATE_HEADERS = [
  'provider', 'model', 'unit_basis',
  'external_cost', 'markup_pct', 'internal_rate', 'effective_date',
];

export function exportRateCardsCsv(ratecards: RateCard[]): void {
  const rows = ratecards.map(r => [
    r.provider,
    r.model,
    r.unit,
    r.cost.toFixed(2),
    (r.markup * 100).toFixed(0),
    (r.cost * (1 + r.markup)).toFixed(2),
    r.effective,
  ]);
  downloadFile(toCsv(RATE_HEADERS, rows), 'ai_audit_rate_cards.csv', 'text/csv');
}

// ─── Full bundle export ───────────────────────────────────────────────────────

export function exportFullBundle(
  employees: Employee[],
  deptSpend: DeptSpend[],
  ratecards: RateCard[],
): void {
  const bundle = {
    exportedAt: new Date().toISOString(),
    summary: {
      totalSpend:      Math.round(employees.reduce((s, e) => s + e.spend, 0) * 100) / 100,
      totalAllocation: employees.reduce((s, e) => s + e.alloc, 0),
      employeeCount:   employees.length,
    },
    employees,
    deptSpend,
    ratecards,
  };
  downloadFile(
    JSON.stringify(bundle, null, 2),
    'ai_audit_full_export.json',
    'application/json',
  );
}
