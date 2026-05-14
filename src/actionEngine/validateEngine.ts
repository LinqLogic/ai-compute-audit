/**
 * validateEngine.ts
 *
 * Sanity-check suite for the Action Engine.
 * Not imported by production code — call from browser console:
 *
 *   import { validateActionEngine } from './actionEngine/validateEngine';
 *   validateActionEngine();
 *
 * Validates:
 *   ✓ Empty input does not crash
 *   ✓ Demo data produces deterministic results (same order on repeat calls)
 *   ✓ No NaN or Infinity in any financial field
 *   ✓ Priority scores clamped to [0, 1000]
 *   ✓ Confidence values clamped to [0, 100]
 *   ✓ Annual savings ≥ monthly savings
 *   ✓ Sort order: first item has the highest or equal priorityScore
 *   ✓ All status values are valid
 *   ✓ All id values are unique
 */

import { generateActionItems } from './generateActionItems';
import { employees as mockEmployees, deptSpend as mockDeptSpend } from '../data/mockData';

export function validateActionEngine(): void {
  console.group('[ActionEngine] Validation suite');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string): void {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.warn(`  ✗ FAIL: ${label}`);
      failed++;
    }
  }

  // ── 1. Empty input does not crash ──────────────────────────────────────────
  let emptyResult: ReturnType<typeof generateActionItems> = [];
  try {
    emptyResult = generateActionItems([], []);
    assert(Array.isArray(emptyResult) && emptyResult.length === 0, 'Empty input → returns []');
  } catch (e) {
    assert(false, `Empty input → no exception (threw: ${String(e)})`);
  }

  // ── 2. Partial input (employees only, no deptSpend) ────────────────────────
  try {
    const partial = generateActionItems(mockEmployees, []);
    assert(Array.isArray(partial), 'Partial input (employees only) → no crash');
  } catch (e) {
    assert(false, `Partial input → no exception (threw: ${String(e)})`);
  }

  // ── 3. Deterministic output ────────────────────────────────────────────────
  const run1 = generateActionItems(mockEmployees, mockDeptSpend);
  const run2 = generateActionItems(mockEmployees, mockDeptSpend);
  assert(run1.length === run2.length, `Deterministic count (${run1.length} items on both runs)`);
  assert(
    run1.every((item, i) => item.id === run2[i]?.id),
    'Deterministic order (same IDs in same positions)',
  );

  // ── 4. No NaN / Infinity in financial fields ───────────────────────────────
  const financialFields: Array<keyof typeof run1[0]> = [
    'financialImpact', 'estimatedMonthlySavings', 'estimatedAnnualSavings',
    'priorityScore', 'confidence',
  ];
  const badFinancials = run1.filter(item =>
    financialFields.some(f => !isFinite(item[f] as number)),
  );
  assert(badFinancials.length === 0, 'No NaN/Infinity in financial fields');

  // ── 5. Priority scores in [0, 1000] ───────────────────────────────────────
  const badScores = run1.filter(i => i.priorityScore < 0 || i.priorityScore > 1000);
  assert(badScores.length === 0, 'All priority scores in [0, 1000]');

  // ── 6. Confidence in [0, 100] ─────────────────────────────────────────────
  const badConf = run1.filter(i => i.confidence < 0 || i.confidence > 100);
  assert(badConf.length === 0, 'All confidence values in [0, 100]');

  // ── 7. Annual ≥ monthly savings ───────────────────────────────────────────
  const mismatch = run1.filter(i => i.estimatedAnnualSavings < i.estimatedMonthlySavings);
  assert(mismatch.length === 0, 'estimatedAnnualSavings ≥ estimatedMonthlySavings for all items');

  // ── 8. Sort order: priority descending ────────────────────────────────────
  if (run1.length >= 2) {
    assert(
      run1[0].priorityScore >= run1[1].priorityScore,
      `Sort order: first item priorityScore (${run1[0].priorityScore}) ≥ second (${run1[1].priorityScore})`,
    );
  }

  // ── 9. Valid status values ────────────────────────────────────────────────
  const validStatuses = new Set(['open', 'in_review', 'resolved', 'dismissed']);
  const invalidStatus = run1.filter(i => !validStatuses.has(i.status));
  assert(invalidStatus.length === 0, 'All status values are valid');

  // ── 10. Unique IDs ────────────────────────────────────────────────────────
  const ids   = run1.map(i => i.id);
  const uniq  = new Set(ids);
  assert(uniq.size === ids.length, `All IDs are unique (${uniq.size} unique of ${ids.length} total)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalSavings = run1.reduce((s, i) => s + i.estimatedAnnualSavings, 0);
  console.groupCollapsed('  📊 Demo data results');
  console.log(`     Total items    : ${run1.length}`);
  console.log(`     Critical       : ${run1.filter(i => i.severity === 'critical').length}`);
  console.log(`     High           : ${run1.filter(i => i.severity === 'high').length}`);
  console.log(`     Medium         : ${run1.filter(i => i.severity === 'medium').length}`);
  console.log(`     Low            : ${run1.filter(i => i.severity === 'low').length}`);
  console.log(`     Est. annual    : $${Math.round(totalSavings).toLocaleString()}`);
  console.log(`     Top item       : ${run1[0]?.title ?? '(none)'}`);
  console.groupEnd();

  const status = failed === 0 ? '✅ ALL PASSED' : `❌ ${failed} FAILED`;
  console.log(`\n  ${status} (${passed}/${passed + failed})`);
  console.groupEnd();
}
