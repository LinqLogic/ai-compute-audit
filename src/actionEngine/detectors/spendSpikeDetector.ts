/**
 * spendSpikeDetector.ts
 *
 * Detects employees with material spend increases relative to:
 *   (a) their individual allocation  — always available
 *   (b) their department peer median — when ≥ minPeerGroupSize peers exist
 *
 * Materiality gates:
 *   - Minimum annual savings: $2,400 (config.minimumAnnualSavings)
 *   - Minimum monthly overage: $100  (config.minimumOvreageMonthly)
 *
 * Dynamic confidence:
 *   - Allocation comparison: 70 (explicit allocation data)
 *   - Peer comparison: 58–75 depending on peer group size
 *
 * Pure function — same input always produces same output.
 */

import { Employee } from '../../data/types';
import { ActionItem, ActionSeverity } from '../types';
import { ACTION_ENGINE_CONFIG as CFG } from '../config';
import {
  calcSpendSpike, arrMedian,
  fmt$, fmtK$, fmtVariance,
} from '../financialCalculations';
import { computePriorityScore } from '../priorityScoring';
import { interpretSpendSpike } from '../governanceInterpreter';

const SC   = CFG.spendSpike;
const CONF = CFG.confidence;

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

/** Confidence scales with peer group size — larger groups produce more reliable medians. */
function peerConfidence(peerCount: number): number {
  if (peerCount >= 15) return 75;
  if (peerCount >= 8)  return 70;
  if (peerCount >= 5)  return 65;
  return 58;
}

function buildItem(
  id: string,
  title: string,
  emp: Employee,
  severity: ActionSeverity,
  confidence: number,
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
    confidence,
    priorityScore:           computePriorityScore(severity, confidence, calc.estimatedAnnualSavings),
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
      actual:    fmtVariance(calc.variancePct),
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

    const calc = calcSpendSpike(emp.spend, emp.alloc);

    // Materiality gates
    if (calc.overage              < SC.minimumOvreageMonthly) continue;
    if (calc.estimatedAnnualSavings < SC.minimumAnnualSavings)  continue;

    const id = `SS::${emp.eid}::alloc`;
    if (seen.has(id)) continue;
    seen.add(id);

    const interp = interpretSpendSpike(
      emp.name, 'employee', emp.spend, emp.alloc,
      calc.variancePct, calc.estimatedAnnualSavings, severity,
    );
    const confidence = CONF.fromAggregated;
    const threshold  = severity === 'critical' ? '> 300%' : severity === 'high' ? '> 150%' : '> 50%';

    results.push(buildItem(
      id,
      `${emp.name} — spend ${fmtVariance(emp.variance)} above allocation`,
      emp, severity, confidence, calc, interp,
      [
        `Actual spend: ${fmt$(emp.spend)}/month`,
        `Approved allocation: ${fmt$(emp.alloc)}/month`,
        `Monthly overage: ${fmt$(calc.overage)}`,
        `Est. recoverable annual: ${fmtK$(calc.estimatedAnnualSavings)}`,
      ],
      `${emp.name} spend: ${fmt$(emp.spend)} · Allocation: ${fmt$(emp.alloc)} · Variance: ${fmtVariance(emp.variance)}`,
      `Overage = ${fmt$(emp.spend)} − ${fmt$(emp.alloc)} = ${fmt$(calc.overage)}/month` +
        ` · Recoverable = ${fmt$(calc.overage)} × ${(SC.savingsRecoveryRate * 100).toFixed(0)}% × 12 = ${fmtK$(calc.estimatedAnnualSavings)}/yr`,
      'Spend variance vs approved allocation',
      threshold,
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

      const calc = calcSpendSpike(emp.spend, medianSpend);

      // Materiality gates
      if (calc.overage              < SC.minimumOvreageMonthly) continue;
      if (calc.estimatedAnnualSavings < SC.minimumAnnualSavings)  continue;

      const id = `SS::${emp.eid}::peer`;
      if (seen.has(id)) continue;
      seen.add(id);

      const confidence = peerConfidence(peers.length);
      const interp     = interpretSpendSpike(
        emp.name, 'employee', emp.spend, medianSpend,
        calc.variancePct, calc.estimatedAnnualSavings, severity,
      );
      const threshold = severity === 'critical' ? '> 300%' : severity === 'high' ? '> 150%' : '> 75%';

      results.push(buildItem(
        id,
        `${emp.name} — spend ${fmtVariance(devFrac * 100)} above ${dept} peer median`,
        emp, severity, confidence, calc, interp,
        [
          `${emp.name} spend: ${fmt$(emp.spend)}/month`,
          `${dept} peer median: ${fmt$(medianSpend)}/month (n=${peers.length})`,
          `Excess vs peers: ${fmt$(calc.overage)}/month`,
          `Est. recoverable annual: ${fmtK$(calc.estimatedAnnualSavings)}`,
        ],
        `${emp.name}: ${fmt$(emp.spend)} · ${dept} peer median: ${fmt$(medianSpend)} (n=${peers.length})`,
        `Excess = ${fmt$(emp.spend)} − ${fmt$(medianSpend)} = ${fmt$(calc.overage)}/month · Annual: ${fmtK$(calc.estimatedAnnualSavings)}`,
        `Spend vs ${dept} peer median`,
        threshold,
        period,
      ));
    }
  }

  return results;
}
