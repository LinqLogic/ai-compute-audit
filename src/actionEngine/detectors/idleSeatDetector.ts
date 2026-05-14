/**
 * idleSeatDetector.ts
 *
 * Detects employees who hold seat-licensed AI tools (e.g. Microsoft Copilot,
 * GitHub Copilot) but show below-threshold usage, resulting in wasted seat cost.
 *
 * Seat tools are identified by matching Employee.apps[] names against the
 * seatCostByApp config map. Only raises an action item when the estimated
 * monthly waste exceeds minimumWasteMonthly.
 *
 * Pure function — same input always produces same output.
 */

import { Employee } from '../../data/types';
import { ActionItem, ActionSeverity } from '../types';
import { ACTION_ENGINE_CONFIG as CFG } from '../config';
import { calcIdleSeat, fmt$, fmtK$ } from '../financialCalculations';
import { computePriorityScore } from '../priorityScoring';
import { interpretIdleSeat } from '../governanceInterpreter';

const IC   = CFG.idleSeat;
const CONF = CFG.confidence.fromAggregated;

const SEAT_APPS = new Set(Object.keys(IC.seatCostByApp));

function findSeatApps(apps: string[]): string[] {
  return apps.filter(a => SEAT_APPS.has(a));
}

function totalSeatCost(seatApps: string[]): number {
  return seatApps.reduce((total, app) => total + (IC.seatCostByApp[app] ?? 0), 0);
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function classifySeverity(annualWaste: number): ActionSeverity {
  if (annualWaste >= 300) return 'high';
  if (annualWaste >= 120) return 'medium';
  return 'low';
}

export function detectIdleSeats(employees: Employee[]): ActionItem[] {
  if (employees.length === 0) return [];

  const period  = currentPeriod();
  const results: ActionItem[] = [];

  for (const emp of employees) {
    const seatApps = findSeatApps(emp.apps);
    if (seatApps.length === 0) continue;

    const seatCost = totalSeatCost(seatApps);
    if (seatCost <= 0) continue;

    // Already above utilisation threshold — not idle
    if (emp.prompts >= IC.lowUsagePromptThreshold) continue;

    const calc = calcIdleSeat(emp.prompts, seatCost);
    if (calc.wastedSeatCostMonthly < IC.minimumWasteMonthly) continue;

    const severity      = classifySeverity(calc.estimatedAnnualWaste);
    const utilizationPct = calc.utilizationRatio * 100;
    const toolLabel     = seatApps.join(' + ');
    const interp        = interpretIdleSeat(
      emp.name, toolLabel, emp.prompts, seatCost,
      calc.estimatedAnnualWaste, utilizationPct,
    );
    const priorityScore = computePriorityScore(severity, CONF, calc.estimatedAnnualWaste);

    results.push({
      id:                      `IS::${emp.eid}`,
      type:                    'idle_seat',
      title:                   `${emp.name} — ${toolLabel} seat underutilised (${utilizationPct.toFixed(0)}%)`,
      severity,
      confidence:              CONF,
      priorityScore,
      financialImpact:         calc.wastedSeatCostMonthly,
      estimatedMonthlySavings: calc.wastedSeatCostMonthly,
      estimatedAnnualSavings:  calc.estimatedAnnualWaste,
      department:              emp.dept,
      costCenter:              emp.center,
      ownerSuggestion:         interp.ownerSuggestion,
      evidence: [
        `${toolLabel} seat cost: ${fmt$(seatCost)}/month`,
        `Prompts this period: ${emp.prompts.toLocaleString()} (threshold: ${IC.lowUsagePromptThreshold.toLocaleString()})`,
        `Utilisation: ${utilizationPct.toFixed(0)}% of expected activity`,
      ],
      inputDataSummary:
        `Seat tool: ${toolLabel} · Licence cost: ${fmt$(seatCost)}/month` +
        ` · Prompts: ${emp.prompts} · Threshold: ${IC.lowUsagePromptThreshold}`,
      calculationSummary:
        `Waste = ${fmt$(seatCost)} × (1 − ${emp.prompts}/${IC.lowUsagePromptThreshold})` +
        ` = ${fmt$(calc.wastedSeatCostMonthly)}/month · Annual: ${fmtK$(calc.estimatedAnnualWaste)}`,
      thresholdComparison: {
        metric:    'Prompts vs seat utilisation threshold',
        actual:    `${emp.prompts.toLocaleString()} prompts/month`,
        threshold: `≥ ${IC.lowUsagePromptThreshold.toLocaleString()} prompts/month`,
        exceeded:  false, // metric is BELOW threshold (underutilisation)
      },
      governanceInterpretation: interp.governanceInterpretation,
      recommendedAction:        interp.recommendedAction,
      status:           'open',
      createdAt:        new Date().toISOString(),
      periodKey:        period,
      relatedEntityIds: [emp.eid],
    });
  }

  return results;
}
