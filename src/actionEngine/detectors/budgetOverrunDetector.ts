/**
 * budgetOverrunDetector.ts
 *
 * Detects departments or cost centres whose current-period AI spend exceeds
 * their approved budget, and quantifies the recoverable financial impact.
 *
 * Uses DeptSpend[] from DomainContext — always available (mock or imported).
 * Pure function — same input always produces same output.
 */

import { DeptSpend } from '../../data/types';
import { ActionItem, ActionSeverity } from '../types';
import { ACTION_ENGINE_CONFIG as CFG } from '../config';
import { calcBudgetOverrun, fmt$, fmtK$, fmtPct, safeDiv } from '../financialCalculations';
import { computePriorityScore } from '../priorityScoring';
import { interpretBudgetOverrun } from '../governanceInterpreter';

const BC   = CFG.budgetOverrun;
const CONF = CFG.confidence.fromAggregated;

function classifySeverity(varianceFrac: number): ActionSeverity | null {
  if (varianceFrac >= BC.criticalThreshold) return 'critical';
  if (varianceFrac >= BC.highThreshold)     return 'high';
  if (varianceFrac >= BC.mediumThreshold)   return 'medium';
  return null;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export function detectBudgetOverruns(deptSpend: DeptSpend[]): ActionItem[] {
  if (deptSpend.length === 0) return [];

  const period  = currentPeriod();
  const results: ActionItem[] = [];

  for (const dept of deptSpend) {
    if (dept.budget <= 0 || dept.spend <= dept.budget) continue;

    const varianceFrac = safeDiv(dept.spend - dept.budget, dept.budget);
    const severity     = classifySeverity(varianceFrac);
    if (!severity) continue;

    const calc   = calcBudgetOverrun(dept.spend, dept.budget);
    const interp = interpretBudgetOverrun(
      dept.name, dept.spend, dept.budget,
      calc.variancePct, calc.estimatedAnnualSavings, severity,
    );
    // Budget overruns carry slightly higher governance weight
    const priorityScore = computePriorityScore(severity, CONF, calc.estimatedAnnualSavings, 1.1);
    const threshold = severity === 'critical' ? '> 50%' : severity === 'high' ? '> 25%' : '> 10%';

    results.push({
      id:                      `BO::${dept.name.replace(/\s+/g, '_')}`,
      type:                    'budget_overrun',
      title:                   `${dept.name} — ${fmtPct(calc.variancePct)} over budget · ${fmtK$(calc.estimatedAnnualSavings)}/yr recoverable`,
      severity,
      confidence:              CONF,
      priorityScore,
      financialImpact:         calc.overage,
      estimatedMonthlySavings: calc.estimatedMonthlySavings,
      estimatedAnnualSavings:  calc.estimatedAnnualSavings,
      department:              dept.name,
      costCenter:              '',
      ownerSuggestion:         interp.ownerSuggestion,
      evidence: [
        `${dept.name} AI spend: ${fmt$(dept.spend)}/month`,
        `Approved budget: ${fmt$(dept.budget)}/month`,
        `Monthly overage: ${fmt$(calc.overage)} (${fmtPct(calc.variancePct)})`,
        `${dept.employees} employees in department`,
      ],
      inputDataSummary:
        `${dept.name}: spend ${fmt$(dept.spend)} · budget ${fmt$(dept.budget)}` +
        ` · ${dept.employees} employees`,
      calculationSummary:
        `Overage = ${fmt$(dept.spend)} − ${fmt$(dept.budget)} = ${fmt$(calc.overage)}/month` +
        ` · Recoverable = overage × ${(BC.savingsRecoveryRate * 100).toFixed(0)}% × 12` +
        ` = ${fmtK$(calc.estimatedAnnualSavings)}/year`,
      thresholdComparison: {
        metric:    'Dept spend vs approved budget',
        actual:    fmtPct(calc.variancePct),
        threshold,
        exceeded:  true,
      },
      governanceInterpretation: interp.governanceInterpretation,
      recommendedAction:        interp.recommendedAction,
      status:           'open',
      createdAt:        new Date().toISOString(),
      periodKey:        period,
      relatedEntityIds: [dept.name],
    });
  }

  return results;
}
