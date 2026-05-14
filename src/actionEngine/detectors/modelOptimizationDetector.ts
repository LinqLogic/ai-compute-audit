/**
 * modelOptimizationDetector.ts
 *
 * Identifies employees whose AI spend pattern suggests an opportunity to
 * route workloads to cost-efficient model tiers without reducing capability.
 *
 * Two detection paths:
 *   Primary   — spend ≥ $200/month AND apps include a known premium provider
 *               (case-insensitive match; confidence = 70)
 *   Fallback  — spend ≥ $500/month with no provider data available
 *               (confidence = 50; labelled as indicative)
 *
 * Premium provider matching is case-insensitive and keyword-aware so that
 * entries like 'openai', 'OpenAI', 'azure openai' all resolve.
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
const CONF = CFG.confidence;

// Premium-tier providers — case-insensitive keyword matching
const PREMIUM_KEYWORDS = [
  'openai', 'anthropic', 'claude', 'gpt',
  'vertex', 'gemini', 'bedrock', 'azure openai',
  'mistral', 'cohere', 'perplexity',
];

function hasPremiumProvider(apps: string[]): boolean {
  return apps.some(a => {
    const lower = a.toLowerCase().trim();
    return PREMIUM_KEYWORDS.some(kw => lower.includes(kw));
  });
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

    const hasAppsData   = emp.apps.length > 0;
    const isPremiumUser = hasAppsData && hasPremiumProvider(emp.apps);
    const isHighSpend   = emp.spend >= MC.highSpendThreshold;

    // Qualify: premium provider detected, OR high spend without provider data
    const primaryPath  = isPremiumUser;
    const fallbackPath = !hasAppsData && isHighSpend;

    if (!primaryPath && !fallbackPath) continue;

    const confidence = primaryPath ? CONF.fromAggregated : CONF.fromInferred;
    const severity   = classifySeverity(emp.spend);
    const calc       = calcModelOptimization(emp.spend);
    const providers  = hasAppsData ? emp.apps : ['(tool data unavailable)'];
    const interp     = interpretModelOptimization(
      emp.name, emp.spend, providers,
      calc.estimatedAnnualSavings, calc.savingsRate, severity,
      !primaryPath,
    );
    const priorityScore = computePriorityScore(severity, confidence, calc.estimatedAnnualSavings, 0.9);

    const titleSuffix = primaryPath
      ? `${fmtK$(calc.estimatedAnnualSavings)}/yr via model-tier optimisation`
      : `high AI spend (${fmtK$(calc.estimatedAnnualSavings)}/yr optimisation opportunity)`;

    results.push({
      id:                      `MO::${emp.eid}`,
      type:                    'model_optimization',
      title:                   `${emp.name} — ${titleSuffix}`,
      severity,
      confidence,
      priorityScore,
      financialImpact:         emp.spend,
      estimatedMonthlySavings: calc.estimatedMonthlySavings,
      estimatedAnnualSavings:  calc.estimatedAnnualSavings,
      department:              emp.dept,
      costCenter:              emp.center,
      ownerSuggestion:         interp.ownerSuggestion,
      evidence: [
        `Total AI spend: ${fmt$(emp.spend)}/month`,
        hasAppsData
          ? `Providers in use: ${emp.apps.join(', ')}`
          : 'Provider data not available for this employee',
        `Conservative ${(calc.savingsRate * 100).toFixed(0)}% optimisation rate applied`,
        `Est. annual saving: ${fmtK$(calc.estimatedAnnualSavings)}`,
      ],
      inputDataSummary:
        `${emp.name} spend: ${fmt$(emp.spend)}/month` +
        (hasAppsData ? ` · Providers: ${emp.apps.join(', ')}` : ' · Provider data unavailable'),
      calculationSummary:
        `Saving = ${fmt$(emp.spend)} × ${(calc.savingsRate * 100).toFixed(0)}%` +
        ` = ${fmt$(calc.estimatedMonthlySavings)}/month · Annual: ${fmtK$(calc.estimatedAnnualSavings)}`,
      thresholdComparison: {
        metric:    'Monthly AI spend vs optimisation threshold',
        actual:    fmt$(emp.spend),
        threshold: `≥ ${fmt$(primaryPath ? MC.mediumSpendThreshold : MC.highSpendThreshold)}/month`,
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
