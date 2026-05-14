/**
 * priorityScoring.ts
 *
 * Deterministic priority score computation and stable multi-key sort.
 * Pure functions — no React, no I/O.
 *
 * Score formula (0–1000):
 *   raw = (financialScore × 0.40)
 *       + (severityScore  × 0.25)
 *       + (confidenceScore × 0.15)
 *       + (governanceScore × 0.20)
 *
 *   Each sub-score is normalised to [0, 100] before weighting.
 *   Final score = clamp(round(raw × 10), 0, 1000).
 *
 * Sort order (ties broken sequentially):
 *   1. priorityScore  DESC
 *   2. severity       DESC  (critical > high > medium > low)
 *   3. estimatedAnnualSavings DESC
 *   4. confidence     DESC
 *   5. title          ASC
 *   6. id             ASC
 */

import { ActionItem, ActionSeverity } from './types';
import { ACTION_ENGINE_CONFIG } from './config';
import { clamp, safeDiv } from './financialCalculations';

const CFG = ACTION_ENGINE_CONFIG.priorityScoring;

// ─── Score computation ────────────────────────────────────────────────────────

/**
 * Compute a deterministic priority score for an action item.
 *
 * @param severity              - Governance severity level
 * @param confidence            - Detector confidence, 0–100
 * @param estimatedAnnualSavings - Estimated annual savings in USD
 * @param governanceMultiplier  - Optional governance risk amplifier (default 1.0)
 */
export function computePriorityScore(
  severity: ActionSeverity,
  confidence: number,
  estimatedAnnualSavings: number,
  governanceMultiplier = 1.0,
): number {
  const sevScore  = CFG.severityScores[severity] ?? 0;
  const finScore  = clamp(safeDiv(estimatedAnnualSavings, CFG.annualImpactCap) * 100, 0, 100);
  const confScore = clamp(confidence, 0, 100);
  const govScore  = clamp(sevScore * governanceMultiplier, 0, 100);

  const { financial, severity: sevW, confidence: confW, governance: govW } = CFG.weights;
  const raw = (finScore * financial) + (sevScore * sevW) + (confScore * confW) + (govScore * govW);

  return clamp(Math.round(raw * (CFG.maxScore / 100)), 0, CFG.maxScore);
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

const SEV_ORDER: Record<ActionSeverity, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};

/** Returns a new sorted array — does not mutate the input. */
export function sortActionItems(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore)
      return b.priorityScore - a.priorityScore;

    const sevDiff = SEV_ORDER[b.severity] - SEV_ORDER[a.severity];
    if (sevDiff !== 0) return sevDiff;

    if (b.estimatedAnnualSavings !== a.estimatedAnnualSavings)
      return b.estimatedAnnualSavings - a.estimatedAnnualSavings;

    if (b.confidence !== a.confidence)
      return b.confidence - a.confidence;

    const titleCmp = a.title.localeCompare(b.title);
    if (titleCmp !== 0) return titleCmp;

    return a.id.localeCompare(b.id);
  });
}
