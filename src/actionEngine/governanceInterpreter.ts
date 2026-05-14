/**
 * governanceInterpreter.ts
 *
 * Translates detector findings into CFO/executive language.
 * Pure functions — no React, no I/O.
 *
 * Each interpreter returns:
 *   governanceInterpretation — why this matters financially and operationally
 *   recommendedAction        — one clear action for the suggested owner
 *   ownerSuggestion          — who should take action
 */

import { ActionSeverity } from './types';
import { fmt$, fmtK$, fmtPct } from './financialCalculations';

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
  const isEmp    = entityType === 'employee';
  const subject  = isEmp ? `${entityName}'s spend` : `the ${entityName} department spend`;
  const baseline = isEmp ? 'their allocation' : 'budget';
  const urgency  = severity === 'critical'
    ? 'Immediate CFO intervention is required before month lock.'
    : severity === 'high'
    ? 'Finance leadership approval is required before the next close.'
    : 'Review is recommended before the period closes.';

  return {
    governanceInterpretation:
      `${subject} of ${fmt$(spend)}/month is ${fmtPct(variancePct)} above ${baseline} of ${fmt$(benchmark)}/month. ` +
      `If this run-rate continues, the recoverable annual impact is ${fmtK$(annualSavings)}. ${urgency}`,

    recommendedAction: isEmp
      ? `Require ${entityName}'s manager to submit a written business justification. ` +
        `If unsubstantiated, reduce AI tool access to match the ${fmt$(benchmark)}/month allocation.`
      : `The ${entityName} department head must submit a remediation plan. ` +
        `Consider a spend freeze on non-essential AI tools until the overage is resolved.`,

    ownerSuggestion: severity === 'critical'
      ? 'CFO + Department Head'
      : isEmp ? 'Department Head' : 'Finance Business Partner + Department Head',
  };
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
  return {
    governanceInterpretation:
      `${entityName} holds an active ${seatTool} seat licence at ${fmt$(seatCost)}/month ` +
      `but generated only ${prompts.toLocaleString()} prompts this period — ` +
      `${utilizationPct.toFixed(0)}% of expected utilisation. ` +
      `At this rate the unused seat represents an estimated ${fmtK$(annualWaste)}/year in ` +
      `unrecovered licence cost.`,

    recommendedAction:
      `Review ${entityName}'s ${seatTool} usage with their manager. ` +
      `If the tool is not actively used in this role, deprovision the seat and ` +
      `reallocate to a team member with higher demand.`,

    ownerSuggestion: 'IT Administrator + Line Manager',
  };
}

// ─── Model optimization ───────────────────────────────────────────────────────

export function interpretModelOptimization(
  entityName: string,
  spend: number,
  providers: string[],
  annualSavings: number,
  savingsRate: number,
  severity: ActionSeverity,
): InterpretationResult {
  const providerStr = providers.join(', ');
  return {
    governanceInterpretation:
      `${entityName} is spending ${fmt$(spend)}/month across ${providers.length} AI providers ` +
      `(${providerStr}). Based on multi-provider usage patterns, a conservative ` +
      `${(savingsRate * 100).toFixed(0)}% of this spend may be suitable for lower-cost model ` +
      `tiers without material impact on output quality — representing ${fmtK$(annualSavings)}/year ` +
      `in potential savings.`,

    recommendedAction:
      `Audit ${entityName}'s workloads: identify tasks using premium models (GPT-4o, Claude Opus) ` +
      `that could run on cost-optimised alternatives (GPT-4o mini, Claude Haiku). ` +
      `Implement model-tier guidance in the AI usage policy for this role.`,

    ownerSuggestion: severity === 'critical' || severity === 'high'
      ? 'AI/ML Team Lead + FinOps'
      : 'Line Manager',
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
  const overage   = spend - budget;
  const escalation = severity === 'critical'
    ? ' This level of overage requires immediate CFO escalation.'
    : '';

  return {
    governanceInterpretation:
      `The ${deptName} department is spending ${fmt$(spend)}/month against a ` +
      `${fmt$(budget)}/month approved budget — ${fmtPct(variancePct)} over, a ` +
      `${fmt$(overage)} monthly overage. Annualised, the recoverable impact is ` +
      `${fmtK$(annualSavings)}.${escalation}`,

    recommendedAction:
      `The ${deptName} department head must acknowledge the overage and submit a ` +
      `remediation plan within 5 business days. Identify the top-3 spenders in the ` +
      `department, require manager-approved justifications, and implement a monthly ` +
      `spend alert at 80% of the approved budget.`,

    ownerSuggestion: severity === 'critical'
      ? 'CFO + Department Head'
      : 'Finance Business Partner + Department Head',
  };
}
