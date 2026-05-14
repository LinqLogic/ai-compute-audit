/**
 * governanceInterpreter.ts
 *
 * Translates detector findings into CFO/executive-ready language.
 * Pure functions — no React, no I/O.
 *
 * Language principles:
 *   - Prefer "review," "validate," "optimise," "right-size," "assign owner"
 *   - Never default to "reduce access" — propose constructive next steps
 *   - Vary recommendations by severity AND dollar impact
 *   - Use multiplier language (3×) rather than extreme percentages (>500%)
 */

import { ActionSeverity } from './types';
import { fmt$, fmtK$, fmtVariance } from './financialCalculations';

export interface InterpretationResult {
  governanceInterpretation: string;
  recommendedAction: string;
  ownerSuggestion: string;
}

// ─── Spend spike ──────────────────────────────────────────────────────────────

export function interpretSpendSpike(
  entityName: string,
  entityType: 'employee' | 'department',
  spend: number,
  benchmark: number,
  variancePct: number,
  annualSavings: number,
  severity: ActionSeverity,
): InterpretationResult {
  const isEmp         = entityType === 'employee';
  const varianceStr   = fmtVariance(variancePct);
  const benchmarkType = isEmp ? 'approved allocation' : 'approved budget';
  const annualStr     = fmtK$(annualSavings);

  const governanceInterpretation =
    `${isEmp ? entityName : `The ${entityName} department`} is running at ${fmt$(spend)}/month — ` +
    `${varianceStr} above the ${benchmarkType} of ${fmt$(benchmark)}/month. ` +
    `Sustaining this run-rate represents an estimated ${annualStr} in recoverable annual spend.`;

  let recommendedAction: string;
  let ownerSuggestion: string;

  if (severity === 'critical') {
    recommendedAction = isEmp
      ? `Assign this item to ${entityName}'s department head for immediate validation. ` +
        `Determine whether the spend is project-backed with an approved budget exception. ` +
        `If not, right-size the AI tool configuration to align with the ${fmt$(benchmark)}/month allocation ` +
        `or submit a formal allocation increase request.`
      : `Engage the ${entityName} department head to validate and explain the current spend profile. ` +
        `Identify the top-5 individual spenders, validate business justification, and right-size ` +
        `tool allocations to match the approved budget. Assign a named finance owner for monthly tracking.`;
    ownerSuggestion = 'CFO + Department Head';
  } else if (severity === 'high') {
    recommendedAction = isEmp
      ? `Ask ${entityName}'s line manager to review and confirm the business rationale for current spend. ` +
        `If usage is driven by a specific project, request a short-term allocation adjustment. ` +
        `If ongoing, optimise the toolchain or update the allocation to reflect actual needs.`
      : `The ${entityName} department head should review the current AI spend profile against the ` +
        `approved budget and document any variance drivers. ` +
        `Assign an owner to monitor spend monthly and alert at 80% of budget.`;
    ownerSuggestion = isEmp ? 'Department Head' : 'Finance Business Partner + Department Head';
  } else {
    recommendedAction = isEmp
      ? `Review ${entityName}'s AI tool usage with their line manager. ` +
        `Validate that tools in use align with role requirements and the approved allocation. ` +
        `Right-size if the current level is not expected to continue.`
      : `Review AI spend for the ${entityName} department against the approved budget. ` +
        `Assign a named owner to track and report monthly.`;
    ownerSuggestion = isEmp ? 'Line Manager' : 'Finance Business Partner';
  }

  return { governanceInterpretation, recommendedAction, ownerSuggestion };
}

// ─── Idle seat ────────────────────────────────────────────────────────────────

export function interpretIdleSeat(
  entityName: string,
  seatTool: string,
  prompts: number,
  seatCost: number,
  annualWaste: number,
  utilizationPct: number,
): InterpretationResult {
  const usageStr     = utilizationPct < 5
    ? 'near-zero activity'
    : `${utilizationPct.toFixed(0)}% of expected activity`;

  return {
    governanceInterpretation:
      `${entityName} holds an active ${seatTool} seat licence at ${fmt$(seatCost)}/month ` +
      `but recorded only ${prompts.toLocaleString()} prompts this period — ${usageStr}. ` +
      `At this utilisation rate the seat represents an estimated ${fmtK$(annualWaste)}/year ` +
      `in unrecovered licence cost.`,

    recommendedAction:
      `Validate with ${entityName}'s line manager whether ${seatTool} is actively used in their workflow. ` +
      `If usage is not expected to increase, right-size by reassigning the seat to a team member ` +
      `with higher demand, or flag it for removal at the next renewal.`,

    ownerSuggestion: 'IT Administrator + Line Manager',
  };
}

// ─── Model optimisation ───────────────────────────────────────────────────────

export function interpretModelOptimization(
  entityName: string,
  spend: number,
  providers: string[],
  annualSavings: number,
  savingsRate: number,
  severity: ActionSeverity,
  isInferred = false,
): InterpretationResult {
  const providerStr = providers.length > 0 && providers[0] !== '(tool data unavailable)'
    ? `across ${providers.join(', ')}`
    : 'on AI tooling';

  const savingsPct = (savingsRate * 100).toFixed(0);

  const governanceInterpretation = isInferred
    ? `${entityName} is spending ${fmt$(spend)}/month on AI tools. ` +
      `At this spend level, a conservative ${savingsPct}% may be optimisable through ` +
      `model-tier routing — routing appropriate workloads to cost-efficient alternatives ` +
      `without reducing capability. Estimated annual opportunity: ${fmtK$(annualSavings)}.`
    : `${entityName} is spending ${fmt$(spend)}/month ${providerStr}. ` +
      `Based on multi-provider usage, a conservative ${savingsPct}% of this spend ` +
      `may be suitable for lower-cost model tiers — representing ${fmtK$(annualSavings)}/year ` +
      `in potential savings without material impact on output quality.`;

  const recommendedAction =
    `Audit ${entityName}'s AI task mix: identify routine, high-volume, or structured workloads ` +
    `that can run on cost-optimised model tiers (e.g., smaller reasoning models, batch APIs) ` +
    `without impacting quality. ` +
    (severity === 'critical' || severity === 'high'
      ? `Assign an AI/FinOps lead to own a model-tier optimisation review for this role.`
      : `Review with the line manager and document which tools are used for which tasks.`);

  return {
    governanceInterpretation,
    recommendedAction,
    ownerSuggestion: severity === 'critical' || severity === 'high'
      ? 'AI/ML Team Lead + FinOps'
      : 'Line Manager + IT',
  };
}

// ─── Budget overrun ───────────────────────────────────────────────────────────

export function interpretBudgetOverrun(
  deptName: string,
  spend: number,
  budget: number,
  variancePct: number,
  annualSavings: number,
  severity: ActionSeverity,
): InterpretationResult {
  const overage      = spend - budget;
  const varianceStr  = fmtVariance(variancePct);
  const escalation   = severity === 'critical'
    ? ' This exceeds the 50% overage threshold and warrants executive review.'
    : '';

  return {
    governanceInterpretation:
      `The ${deptName} department is running at ${fmt$(spend)}/month against a ` +
      `${fmt$(budget)}/month approved AI budget — ${varianceStr} over, a ` +
      `${fmt$(overage)} monthly gap. Annualised, the recoverable opportunity is ` +
      `${fmtK$(annualSavings)}.${escalation}`,

    recommendedAction:
      `Assign a named finance owner to the ${deptName} AI budget. ` +
      `Review the top-3 spenders in the department and validate whether usage is ` +
      `project-justified or reflects an allocation gap. ` +
      `Set up a monthly spend alert at 80% of the approved budget to prevent future overruns.`,

    ownerSuggestion: severity === 'critical'
      ? 'CFO + Department Head'
      : 'Finance Business Partner + Department Head',
  };
}
