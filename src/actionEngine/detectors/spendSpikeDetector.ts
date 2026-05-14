/**
 * spendSpikeDetector.ts
 *
 * Detects employees with material spend increases relative to:
 *   (a) their individual allocation  — always available
 *   (b) their department peer median — when ≥ minPeerGroupSize peers exist
 *
 * Deduplicates: one ActionItem per employee per dimension.
 * Pure function — same input always produces same output.
 */

import { Employee } from '../../data/types';
import { ActionItem, ActionSeverity } from '../types';
import { ACTION_ENGINE_CONFIG as CFG } from '../config';
import {
  calcSpendSpike, arrMedian,
  fmt$, fmtPct,
} from '../financialCalculations';
import { computePriorityScore } from '../priorityScoring';
import { interpretSpendSpike } from '../governanceInterpreter';

const SC   = CFG.spendSpike;
const CONF = CFG.confidence.fromAggregated;

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function classifyAllocationSeverity(varianceFrac: number): ActionSeverity | null {
  if (varianceFrac >= SC.allocationVarianceCritical) return 'critical';
  if (varianceFrac >= SC.allocationVarianceHigh)     return 'high';
  if (varianceFrac >= SC.allocationVarianceMedium)   return 'medium';
  return null;
}

function classifyPeerSeverity(devFrac: number): ActionSeverity | null {
  if (devFrac >= SC.peerMedianDevCritical) return 'critical';
  if (devFrac >= SC.peerMedianDevHigh)     return 'high';
  if (devFrac >= SC.peerMedianDevMedium)   return 'medium';
  return null;
}

function buildItem(
  id: string,
  title: string,
  emp: Employee,
  severity: ActionSeverity,
  calc: ReturnType<typeof calcSpendSpike>,
  interp: ReturnType<typeof interpretSpendSpike>,
  evidenceExtra: string[],
  inputSummary: string,
  calcSummary: string,
  thresholdLabel: string,
  threshold: string,
  period: string,
): ActionItem {
  return {
    id,
    type:                    'spend_spike',
    title,
    severity,
    confidence:              CONF,
    priorityScore:           computePriorityScore(severity, CONF, calc.estimatedAnnualSavings),
    financialImpact:         calc.overage,
    estimatedMonthlySavings: calc.estimatedMonthlySavings,
    estimatedAnnualSavings:  calc.estimatedAnnualSavings,
    department:              emp.dept,
    costCenter:              emp.center,
    ownerSuggestion:         interp.ownerSuggestion,
    evidence:                evidenceExtra,
    inputDataSummary:        inputSummary,
    calculationSummary:      calcSummary,
    thresholdComparison: {
      metric:    thresholdLabel,
      actual:    fmtPct(calc.variancePct),
      threshold,
      exceeded:  true,
    },
    governanceInterpretation: interp.governanceInterpretation,
    recommendedAction:        interp.recommendedAction,
    status:           'open',
    createdAt:        new Date().toISOString(),
    periodKey:        period,
    relatedEntityIds: [emp.eid],
  };
}

export function detectSpendSpikes(employees: Employee[]): ActionItem[] {
  if (employees.length === 0) return [];

  const period  = currentPeriod();
  const results: ActionItem[] = [];
  const seen    = new Set<string>();

  // ── (a) vs allocation ──────────────────────────────────────────────────────
  for (const emp of employees) {
    if (emp.alloc <= 0 || emp.variance <= 0) continue;

    const varianceFrac = emp.variance / 100;
    const severity     = classifyAllocationSeverity(varianceFrac);
    if (!severity) continue;

    const id = `SS::${emp.eid}::alloc`;
    if (seen.has(id)) continue;
    seen.add(id);

    const calc   = calcSpendSpike(emp.spend, emp.alloc);
    const interp = interpretSpendSpike(
      emp.name, 'employee', emp.spend, emp.alloc,
      calc.variancePct, calc.estimatedAnnualSavings, severity,
    );

    results.push(buildItem(
      id,
      `${emp.name} — spend ${fmtPct(emp.variance)} over allocation`,
      emp, severity, calc, interp,
      [
        `Actual spend: ${fmt$(emp.spend)}/month`,
        `Allocation: ${fmt$(emp.alloc)}/month`,
        `Monthly overage: ${fmt$(calc.overage)}`,
      ],
      `${emp.name} spend: ${fmt$(emp.spend)} · Allocation: ${fmt$(emp.alloc)} · Variance: ${fmtPct(emp.variance)}`,
      `Overage = ${fmt$(emp.spend)} − ${fmt$(emp.alloc)} = ${fmt$(calc.overage)}/month` +
        ` · Savings = ${fmt$(calc.overage)} × ${(SC.savingsRecoveryRate * 100).toFixed(0)}% × 12 = ${fmt$(calc.estimatedAnnualSavings)}/yr`,
      'Spend variance vs allocation',
      severity === 'critical' ? '> 150%' : severity === 'high' ? '> 75%' : '> 25%',
      period,
    ));
  }

  // ── (b) vs department peer median ──────────────────────────────────────────
  const byDept: Record<string, Employee[]> = {};
  for (const emp of employees) {
    (byDept[emp.dept] = byDept[emp.dept] || []).push(emp);
  }

  for (const [dept, peers] of Object.entries(byDept)) {
    if (peers.length < SC.minPeerGroupSize) continue;

    const medianSpend = arrMedian(peers.map(p => p.spend));
    if (medianSpend <= 0) continue;

    for (const emp of peers) {
      if (emp.spend <= medianSpend) continue;

      const devFrac  = (emp.spend - medianSpend) / medianSpend;
      const severity = classifyPeerSeverity(devFrac);
      if (!severity) continue;

      const id = `SS::${emp.eid}::peer`;
      if (seen.has(id)) continue;
      seen.add(id);

      const calc   = calcSpendSpike(emp.spend, medianSpend);
      const interp = interpretSpendSpike(
        emp.name, 'employee', emp.spend, medianSpend,
        calc.variancePct, calc.estimatedAnnualSavings, severity,
      );
      const threshold = severity === 'critical' ? '> 150%' : severity === 'high' ? '> 75%' : '> 35%';

      results.push(buildItem(
        id,
        `${emp.name} — ${fmtPct(devFrac * 100)} above ${dept} peer median`,
        emp, severity, calc, interp,
        [
          `${emp.name} spend: ${fmt$(emp.spend)}/month`,
          `${dept} peer median: ${fmt$(medianSpend)}/month (n=${peers.length})`,
          `Excess vs peers: ${fmt$(calc.overage)}/month`,
        ],
        `${emp.name}: ${fmt$(emp.spend)} · ${dept} peer median: ${fmt$(medianSpend)} (n=${peers.length})`,
        `Excess = ${fmt$(emp.spend)} − ${fmt$(medianSpend)} = ${fmt$(calc.overage)}/month` +
          ` · Annual: ${fmt$(calc.estimatedAnnualSavings)}`,
        `Spend vs ${dept} peer median`,
        threshold,
        period,
      ));
    }
  }

  return results;
}
