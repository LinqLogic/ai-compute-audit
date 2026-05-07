/**
 * summaryAnalytics.ts
 *
 * Pure functions. Derives executive-level insights from domain data.
 * No React, no I/O. Consumed by ExecutiveSummary component via DomainContext.
 */

import { Employee, DeptSpend, RateCard } from '../data/types';

export interface TopCostDriver {
  label:   string;
  type:    'employee' | 'department' | 'model';
  spend:   number;
  sharePct: number;
}

export interface ConcentrationRisk {
  level:   'high' | 'medium' | 'low';
  message: string;
}

export interface ExecutiveSummary {
  totalSpend:       number;
  totalBudget:      number;
  budgetVariancePct: number;
  employeeCount:    number;
  activeUserCount:  number;
  avgCostPerUser:   number;

  topDrivers:       TopCostDriver[];

  compliantCount:   number;
  reviewCount:      number;
  escalateCount:    number;

  concentrationRisk: ConcentrationRisk;
  insights:          string[];
}

// ─── Top cost drivers ────────────────────────────────────────────────────────

function topEmployeeDrivers(employees: Employee[], total: number, n = 3): TopCostDriver[] {
  return [...employees]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, n)
    .map(e => ({
      label:    e.name,
      type:     'employee' as const,
      spend:    e.spend,
      sharePct: total > 0 ? Math.round((e.spend / total) * 100) : 0,
    }));
}

function topDeptDrivers(deptSpend: DeptSpend[], total: number, n = 3): TopCostDriver[] {
  return deptSpend.slice(0, n).map(d => ({
    label:    d.name,
    type:     'department' as const,
    spend:    d.spend,
    sharePct: total > 0 ? Math.round((d.spend / total) * 100) : 0,
  }));
}

// ─── Concentration risk ───────────────────────────────────────────────────────

function assessConcentration(employees: Employee[], total: number): ConcentrationRisk {
  if (employees.length === 0 || total === 0) {
    return { level: 'low', message: 'No usage data available.' };
  }

  const sorted   = [...employees].sort((a, b) => b.spend - a.spend);
  const top1Pct  = (sorted[0]?.spend ?? 0) / total;
  const top3Pct  = sorted.slice(0, 3).reduce((s, e) => s + e.spend, 0) / total;

  if (top1Pct > 0.30) {
    return {
      level:   'high',
      message: `${sorted[0].name} accounts for ${Math.round(top1Pct * 100)}% of total AI spend — single-point concentration risk.`,
    };
  }
  if (top3Pct > 0.60) {
    return {
      level:   'medium',
      message: `Top 3 employees account for ${Math.round(top3Pct * 100)}% of total spend. Review allocation strategy.`,
    };
  }
  return {
    level:   'low',
    message: `Spend is distributed across ${employees.length} employees. Concentration risk is low.`,
  };
}

// ─── Narrative insights ───────────────────────────────────────────────────────

function deriveInsights(
  employees:  Employee[],
  deptSpend:  DeptSpend[],
  totalSpend: number,
  totalBudget: number,
): string[] {
  const insights: string[] = [];

  // Over budget
  const overBudgetDepts = deptSpend.filter(d => d.spend > d.budget);
  if (overBudgetDepts.length > 0) {
    insights.push(
      `${overBudgetDepts.length} department${overBudgetDepts.length > 1 ? 's are' : ' is'} over budget: ${overBudgetDepts.map(d => d.name).join(', ')}.`
    );
  }

  // Overall variance
  const variancePct = totalBudget > 0 ? ((totalSpend - totalBudget) / totalBudget) * 100 : 0;
  if (variancePct > 15) {
    insights.push(`Total spend is ${Math.round(variancePct)}% above total allocation — escalation threshold exceeded.`);
  }

  // Shadow / unrated tools
  const shadowUsers = employees.filter(e => e.policy === 'Escalate');
  if (shadowUsers.length > 0) {
    insights.push(
      `${shadowUsers.length} employee${shadowUsers.length > 1 ? 's require' : ' requires'} immediate review: ${shadowUsers.slice(0, 2).map(e => e.name).join(', ')}${shadowUsers.length > 2 ? ` +${shadowUsers.length - 2} more` : ''}.`
    );
  }

  // Zero-usage employees with allocations
  const zeroUsage = employees.filter(e => e.prompts === 0 && e.alloc > 0);
  if (zeroUsage.length > 0) {
    insights.push(`${zeroUsage.length} employee${zeroUsage.length > 1 ? 's have' : ' has'} zero usage this period but hold active allocations.`);
  }

  if (insights.length === 0) {
    insights.push('All departments are within budget. No escalations this period.');
  }

  return insights;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function buildExecutiveSummary(
  employees: Employee[],
  deptSpend: DeptSpend[],
  _ratecards: RateCard[],
): ExecutiveSummary {
  const totalSpend  = employees.reduce((s, e) => s + e.spend, 0);
  const totalBudget = employees.reduce((s, e) => s + e.alloc, 0);
  const budgetVariancePct = totalBudget > 0
    ? Math.round(((totalSpend - totalBudget) / totalBudget) * 100)
    : 0;

  const activeUserCount = employees.filter(e => e.prompts > 0).length;

  const compliantCount = employees.filter(e => e.policy === 'Compliant').length;
  const reviewCount    = employees.filter(e => e.policy === 'Review').length;
  const escalateCount  = employees.filter(e => e.policy === 'Escalate').length;

  const topEmployees   = topEmployeeDrivers(employees, totalSpend);
  const topDepts       = topDeptDrivers(deptSpend, totalSpend);
  // Interleave: show top dept first, then top employees
  const topDrivers     = [topDepts[0], ...topEmployees].filter(Boolean) as TopCostDriver[];

  return {
    totalSpend:       Math.round(totalSpend * 100) / 100,
    totalBudget:      Math.round(totalBudget * 100) / 100,
    budgetVariancePct,
    employeeCount:    employees.length,
    activeUserCount,
    avgCostPerUser:   activeUserCount > 0 ? Math.round((totalSpend / activeUserCount) * 100) / 100 : 0,
    topDrivers,
    compliantCount,
    reviewCount,
    escalateCount,
    concentrationRisk: assessConcentration(employees, totalSpend),
    insights:          deriveInsights(employees, deptSpend, totalSpend, totalBudget),
  };
}
