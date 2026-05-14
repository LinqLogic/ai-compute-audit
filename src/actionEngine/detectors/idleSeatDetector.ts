/**
 * idleSeatDetector.ts
 *
 * Detects employees who hold seat-licensed AI tools but show below-threshold
 * usage, resulting in wasted licence cost.
 *
 * App name matching is case-insensitive and keyword-aware so that common
 * naming variants from different data sources ("GitHub Copilot", "github copilot",
 * "Copilot for GitHub") all resolve correctly.
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
const CONF = CFG.confidence;

// Build a lowercase → cost lookup for case-insensitive exact matching
const SEAT_COST_LOWER = new Map<string, number>(
  Object.entries(IC.seatCostByApp).map(([k, v]) => [k.toLowerCase(), v]),
);

// Keyword rules for fuzzy fallback — evaluated in order, first match wins
const KEYWORD_RULES: Array<{ keyword: string; cost: number }> = [
  { keyword: 'github copilot', cost: 19 },
  { keyword: 'copilot',        cost: 30 },
  { keyword: 'cursor',         cost: 20 },
  { keyword: 'tabnine',        cost: 15 },
  { keyword: 'codewhisperer',  cost: 19 },
];

interface SeatMatch { name: string; cost: number }

function resolveSeatCost(app: string): number | null {
  const lower = app.toLowerCase().trim();

  // 1. Exact match (case-insensitive)
  const exact = SEAT_COST_LOWER.get(lower);
  if (exact !== undefined) return exact;

  // 2. Keyword fallback
  for (const rule of KEYWORD_RULES) {
    if (lower.includes(rule.keyword)) return rule.cost;
  }

  return null;
}

function findSeatMatches(apps: string[]): SeatMatch[] {
  const seen   = new Set<string>();
  const result: SeatMatch[] = [];
  for (const app of apps) {
    const cost = resolveSeatCost(app);
    if (cost !== null && !seen.has(app)) {
      seen.add(app);
      result.push({ name: app, cost });
    }
  }
  return result;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function classifySeverity(annualWaste: number): ActionSeverity {
  if (annualWaste >= 360) return 'high';
  if (annualWaste >= 120) return 'medium';
  return 'low';
}

export function detectIdleSeats(employees: Employee[]): ActionItem[] {
  if (employees.length === 0) return [];

  const period  = currentPeriod();
  const results: ActionItem[] = [];

  for (const emp of employees) {
    const seatMatches = findSeatMatches(emp.apps);
    if (seatMatches.length === 0) continue;

    const seatCost = seatMatches.reduce((t, m) => t + m.cost, 0);
    if (seatCost <= 0) continue;

    // Already above utilisation threshold — not idle
    if (emp.prompts >= IC.lowUsagePromptThreshold) continue;

    const calc = calcIdleSeat(emp.prompts, seatCost);
    if (calc.wastedSeatCostMonthly < IC.minimumWasteMonthly) continue;

    const severity      = classifySeverity(calc.estimatedAnnualWaste);
    const utilizationPct = calc.utilizationRatio * 100;
    const toolLabel     = seatMatches.map(m => m.name).join(' + ');
    const interp        = interpretIdleSeat(
      emp.name, toolLabel, emp.prompts, seatCost,
      calc.estimatedAnnualWaste, utilizationPct,
    );
    // Idle seat evidence is concrete (known seat cost) — slightly higher confidence
    const confidence    = CONF.fromAggregated + 5;
    const priorityScore = computePriorityScore(severity, confidence, calc.estimatedAnnualWaste);

    results.push({
      id:                      `IS::${emp.eid}`,
      type:                    'idle_seat',
      title:                   `${emp.name} — ${toolLabel} seat ${utilizationPct < 5 ? 'unused' : 'underutilised'} (${utilizationPct.toFixed(0)}%)`,
      severity,
      confidence,
      priorityScore,
      financialImpact:         calc.wastedSeatCostMonthly,
      estimatedMonthlySavings: calc.wastedSeatCostMonthly,
      estimatedAnnualSavings:  calc.estimatedAnnualWaste,
      department:              emp.dept,
      costCenter:              emp.center,
      ownerSuggestion:         interp.ownerSuggestion,
      evidence: [
        `${toolLabel} seat cost: ${fmt$(seatCost)}/month`,
        `Prompts this period: ${emp.prompts.toLocaleString()} (active benchmark: ${IC.lowUsagePromptThreshold.toLocaleString()})`,
        `Utilisation: ${utilizationPct.toFixed(0)}%`,
        `Estimated monthly waste: ${fmt$(calc.wastedSeatCostMonthly)}`,
      ],
      inputDataSummary:
        `Seat tool: ${toolLabel} · Licence cost: ${fmt$(seatCost)}/month` +
        ` · Prompts: ${emp.prompts.toLocaleString()} · Benchmark: ${IC.lowUsagePromptThreshold.toLocaleString()}`,
      calculationSummary:
        `Waste = ${fmt$(seatCost)} × (1 − ${emp.prompts}/${IC.lowUsagePromptThreshold})` +
        ` = ${fmt$(calc.wastedSeatCostMonthly)}/month · Annual: ${fmtK$(calc.estimatedAnnualWaste)}`,
      thresholdComparison: {
        metric:    'Prompts vs seat utilisation benchmark',
        actual:    `${emp.prompts.toLocaleString()} prompts/month`,
        threshold: `≥ ${IC.lowUsagePromptThreshold.toLocaleString()} prompts/month`,
        exceeded:  false,
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
