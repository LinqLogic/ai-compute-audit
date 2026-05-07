/**
 * policyRules.ts
 *
 * Responsibility: pure functions for compliance classification.
 * No I/O, no React, no PapaParse references.
 *
 * Consumed by: employeeBuilder.ts, DomainContext
 */

import { Employee } from '../data/types';

// ─── Approved tool list ──────────────────────────────────────────────────────

export const APPROVED_TOOLS = new Set<string>([
  'openai', 'copilot', 'anthropic', 'gemini', 'vertex',
  'github copilot', 'microsoft', 'google', 'adobe',
]);

// ─── Per-employee classification ─────────────────────────────────────────────

/**
 * Classify an employee's policy status from spend variance, tool list,
 * and the count of events that could not be priced against a rate card.
 */
export function derivePolicy(
  variance:    number,
  apps:        string[],
  unratedCount: number,
): 'Compliant' | 'Review' | 'Escalate' {
  const hasShadow = apps.some(a => !APPROVED_TOOLS.has(a.toLowerCase()));
  if (variance > 80 || (hasShadow && variance > 40)) return 'Escalate';
  if (variance > 25 || hasShadow || unratedCount > 0)  return 'Review';
  return 'Compliant';
}

/**
 * Produce a 0–99 risk score from spend variance, absolute spend,
 * shadow tool presence, and unrated event count.
 */
export function deriveRisk(
  variance:    number,
  spend:       number,
  hasShadow:   boolean,
  unratedCount: number,
): number {
  let score = 0;
  score += Math.min(50, Math.round(Math.abs(variance) * 0.5));
  score += spend > 700 ? 20 : spend > 400 ? 10 : 0;
  score += hasShadow    ? 15 : 0;
  score += unratedCount > 0 ? 8 : 0;
  return Math.min(99, score);
}

// ─── Aggregate policy distribution ──────────────────────────────────────────

/**
 * Count employees per policy status for the compliance pie chart.
 * Returns data in the shape expected by recharts.
 */
export function buildPolicyMix(
  employees: Pick<Employee, 'policy'>[],
): { name: string; value: number }[] {
  const counts = { Compliant: 0, Review: 0, Escalate: 0 };
  for (const e of employees) {
    counts[e.policy] = (counts[e.policy] ?? 0) + 1;
  }
  return [
    { name: 'Compliant', value: counts.Compliant },
    { name: 'Review',    value: counts.Review    },
    { name: 'Escalate',  value: counts.Escalate  },
  ];
}
