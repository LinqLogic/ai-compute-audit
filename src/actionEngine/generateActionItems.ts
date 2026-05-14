/**
 * generateActionItems.ts
 *
 * Primary entry point of the Action Engine.
 *
 * Orchestrates all four detectors and returns a deterministically sorted
 * list of ActionItem[]. The function is pure: identical inputs always
 * produce identical outputs in identical order.
 *
 * Phase 1 detectors operate on aggregated Employee[] and DeptSpend[].
 * The optional AIUsageEvent[] parameter is reserved for Phase 2 event-level
 * detectors (per-model analysis, cross-period comparison, etc.) and has
 * no effect in Phase 1.
 */

import { Employee, DeptSpend } from '../data/types';
import { AIUsageEvent } from '../telemetry/types';
import { ActionItem } from './types';
import { sortActionItems } from './priorityScoring';
import { detectSpendSpikes }                    from './detectors/spendSpikeDetector';
import { detectIdleSeats }                      from './detectors/idleSeatDetector';
import { detectModelOptimizationOpportunities } from './detectors/modelOptimizationDetector';
import { detectBudgetOverruns }                 from './detectors/budgetOverrunDetector';

export { sortActionItems } from './priorityScoring';

export function generateActionItems(
  employees: Employee[],
  deptSpend: DeptSpend[],
  _events?: AIUsageEvent[],   // reserved — Phase 2 event-level detectors
): ActionItem[] {
  if (employees.length === 0 && deptSpend.length === 0) return [];

  return sortActionItems([
    ...detectSpendSpikes(employees),
    ...detectIdleSeats(employees),
    ...detectModelOptimizationOpportunities(employees),
    ...detectBudgetOverruns(deptSpend),
  ]);
}
