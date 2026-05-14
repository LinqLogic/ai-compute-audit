/**
 * financialCalculations.ts
 *
 * Pure, deterministic financial math functions.
 * No React, no I/O, no side effects.
 *
 * All monetary outputs are in USD. Every calculation is explicit:
 *   Input → Formula → Output
 * so the audit trail in ActionItem.calculationSummary can faithfully
 * reproduce the arithmetic shown here.
 */

import { ACTION_ENGINE_CONFIG } from './config';

const CFG = ACTION_ENGINE_CONFIG;

// ─── Numeric utilities ────────────────────────────────────────────────────────

/** Clamp a value to [min, max]. Returns a finite number. */
export function clamp(v: number, min: number, max: number): number {
  if (!isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/** Safe division — returns 0 when divisor is zero or non-finite. */
export function safeDiv(n: number, d: number): number {
  if (!isFinite(d) || d === 0) return 0;
  const r = n / d;
  return isFinite(r) ? r : 0;
}

/** Arithmetic mean of an array. Returns 0 for empty input. */
export function arrMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Median of an array. Returns 0 for empty input. Non-destructive. */
export function arrMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s   = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

// ─── Spend spike ──────────────────────────────────────────────────────────────

export interface SpendSpikeCalc {
  /** spend − benchmark (always ≥ 0). */
  overage: number;
  /** (spend − benchmark) / benchmark × 100. */
  variancePct: number;
  /** overage × savingsRecoveryRate. */
  estimatedMonthlySavings: number;
  /** estimatedMonthlySavings × 12. */
  estimatedAnnualSavings: number;
}

export function calcSpendSpike(spend: number, benchmark: number): SpendSpikeCalc {
  const overage    = Math.max(0, spend - benchmark);
  const variancePct = safeDiv(overage, benchmark) * 100;
  const monthly    = overage * CFG.spendSpike.savingsRecoveryRate;
  return {
    overage,
    variancePct,
    estimatedMonthlySavings: monthly,
    estimatedAnnualSavings:  monthly * CFG.spendSpike.annualizationMonths,
  };
}

// ─── Idle seat ────────────────────────────────────────────────────────────────

export interface IdleSeatCalc {
  /** prompts / lowUsagePromptThreshold, clamped [0, 1]. */
  utilizationRatio: number;
  /** seatCost × (1 − utilizationRatio). */
  wastedSeatCostMonthly: number;
  /** wastedSeatCostMonthly × 12. */
  estimatedAnnualWaste: number;
}

export function calcIdleSeat(prompts: number, seatCost: number): IdleSeatCalc {
  const threshold       = CFG.idleSeat.lowUsagePromptThreshold;
  const utilizationRatio = clamp(safeDiv(prompts, threshold), 0, 1);
  const monthly         = seatCost * (1 - utilizationRatio);
  return {
    utilizationRatio,
    wastedSeatCostMonthly: monthly,
    estimatedAnnualWaste:  monthly * CFG.idleSeat.annualizationMonths,
  };
}

// ─── Model optimization ───────────────────────────────────────────────────────

export interface ModelOptCalc {
  qualifyingSpend: number;
  savingsRate: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
}

export function calcModelOptimization(spend: number): ModelOptCalc {
  const rate    = CFG.modelOptimization.conservativeSavingsRate;
  const monthly = spend * rate;
  return {
    qualifyingSpend:         spend,
    savingsRate:             rate,
    estimatedMonthlySavings: monthly,
    estimatedAnnualSavings:  monthly * CFG.modelOptimization.annualizationMonths,
  };
}

// ─── Budget overrun ───────────────────────────────────────────────────────────

export interface BudgetOverrunCalc {
  overage: number;
  variancePct: number;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
}

export function calcBudgetOverrun(spend: number, budget: number): BudgetOverrunCalc {
  const overage     = Math.max(0, spend - budget);
  const variancePct = safeDiv(overage, budget) * 100;
  const monthly     = overage * CFG.budgetOverrun.savingsRecoveryRate;
  return {
    overage,
    variancePct,
    estimatedMonthlySavings: monthly,
    estimatedAnnualSavings:  monthly * CFG.budgetOverrun.annualizationMonths,
  };
}

// ─── Formatting utilities (no React dependency) ───────────────────────────────

/** '$12,345' */
export function fmt$(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/** '$12.3K' for large amounts, '$999' for small. */
export function fmtK$(n: number): string {
  return n >= 1_000 ? '$' + (n / 1_000).toFixed(1) + 'K' : fmt$(n);
}

/** '+25.5%' or '-3.2%' */
export function fmtPct(n: number, decimals = 1): string {
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
}

/**
 * Executive-safe variance display.
 * Caps at 500% — beyond that, switches to multiplier language to avoid
 * alarming but uninformative percentage strings like '+224,965%'.
 * Examples: '+45.0%', '+185.0%', '~23× above benchmark'
 */
export function fmtVariance(variancePct: number): string {
  if (!isFinite(variancePct) || variancePct < 0) return 'N/A';
  if (variancePct > 500) {
    const times = Math.round(variancePct / 100 + 1);
    return `~${times.toLocaleString('en-US')}× above benchmark`;
  }
  return fmtPct(variancePct);
}
