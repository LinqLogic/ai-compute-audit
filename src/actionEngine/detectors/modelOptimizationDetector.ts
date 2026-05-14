/**
 * modelOptimizationDetector.ts
 *
 * Identifies employees whose spend and multi-provider usage pattern suggests
 * an opportunity to shift workloads from premium model tiers to cost-optimised
 * alternatives.
 *
 * Detection criteria:
 *   - Monthly spend ≥ mediumSpendThreshold ($200)
 *   - Uses ≥ multiProviderCount (2) different AI providers
 *   - At least one provider is a premium API provider
 *
 * Conservative savings assumption: 30% of qualifying spend could be migrated
 * to cheaper model tiers. This is deliberately understated.
 *
 * Pure function — same input always produces same output.
 */

import { Employee } from '../../data/types';
import { ActionItem, ActionSeverity } from '../types';
import { ACTION_ENGINE_CONFIG as CFG } from '../config';
import { calcModelOptimization, fmt$, fmtK$ } from '../financialCalculations';
import { computePriorityScore } from '../priorityScoring';
import { interpretModelOptimization } from '../governanceInterpreter';

const MC   = CFG.modelOptimization;
const CONF = CFG.confidence.fromAggregated;

// API-priced providers (token-based billing) that have premium tiers
const PREMIUM_PROVIDERS = new Set([
  'OpenAI', 'Anthropic', 'Google Vertex', 'Vertex', 'AWS Bedrock', 'Bedrock',
]);

function hasPremiumProvider(apps: string[]): boolean {
  return apps.some(a => PREMIUM_PROVIDERS.has(a));
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

function classifySeverity(spend: number): ActionSeverity {
  if (spend >= MC.criticalSpendThreshold) return 'critical';
  if (spend >= MC.highSpendThreshold)     return 'high';
  return 'medium';
}

export function detectModelOptimizationOpportunities(employees: Employee[]): ActionItem[] {
  if (employees.length === 0) return [];

  const period  = currentPeriod();
  const results: ActionItem[] = [];

  for (const emp of employees) {
    if (emp.spend < MC.mediumSpendThreshold) continue;
    if (emp.apps.length < MC.multiProviderCount) continue;
    if (!hasPremiumProvider(emp.apps)) continue;

    const severity = classifySeverity(emp.spend);
    const calc     = calcModelOptimization(emp.spend);
    const interp   = interpretModelOptimization(
      emp.name, emp.spend, emp.apps,
      calc.estimatedAnnualSavings, calc.savingsRate, severity,
    );
    const priorityScore = computePriorityScore(severity, CONF, calc.estimatedAnnualSavings, 0.9);

    results.push({
      id:                      `MO::${emp.eid}`,
      type:                    'model_optimization',
      title:                   `${emp.name} — ${fmtK$(calc.estimatedAnnualSavings)}/yr potential via model-tier shift`,
      severity,
      confidence:              CONF,
      priorityScore,
      financialImpact:         emp.spend,
      estimatedMonthlySavings: calc.estimatedMonthlySavings,
      estimatedAnnualSavings:  calc.estimatedAnnualSavings,
      department:              emp.dept,
      costCenter:              emp.center,
      ownerSuggestion:         interp.ownerSuggestion,
      evidence: [
        `Total AI spend: ${fmt$(emp.spend)}/month across ${emp.apps.length} providers`,
        `Providers in use: ${emp.apps.join(', ')}`,
        `Conservative ${(calc.savingsRate * 100).toFixed(0)}% of spend estimated as optimisable`,
      ],
      inputDataSummary:
        `${emp.name} spend: ${fmt$(emp.spend)}/month · Providers: ${emp.apps.join(', ')}`,
      calculationSummary:
        `Savings = ${fmt$(emp.spend)} × ${(calc.savingsRate * 100).toFixed(0)}%` +
        ` = ${fmt$(calc.estimatedMonthlySavings)}/month · Annual: ${fmtK$(calc.estimatedAnnualSavings)}`,
      thresholdComparison: {
        metric:    'Monthly spend (optimisation candidate)',
        actual:    fmt$(emp.spend),
        threshold: `≥ ${fmt$(MC.mediumSpendThreshold)}/month with ${MC.multiProviderCount}+ providers`,
        exceeded:  true,
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
