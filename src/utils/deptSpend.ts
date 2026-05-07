/**
 * deptSpend.ts
 *
 * Responsibility: aggregate Employee[] into DeptSpend[] for cost-centre views.
 * Pure function. No I/O, no React.
 *
 * Consumed by: DomainContext
 */

import { Employee, DeptSpend } from '../data/types';

/**
 * Roll up per-employee spend and allocation figures to department level.
 * Output is sorted descending by spend so charts render highest-cost
 * departments first without any additional sorting in consumers.
 */
export function buildDeptSpendFromEmployees(employees: Employee[]): DeptSpend[] {
  const map = new Map<string, { spend: number; alloc: number; count: number }>();

  for (const e of employees) {
    const existing = map.get(e.dept) ?? { spend: 0, alloc: 0, count: 0 };
    map.set(e.dept, {
      spend: existing.spend + e.spend,
      alloc: existing.alloc + e.alloc,
      count: existing.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([name, d]) => ({
      name,
      spend:     Math.round(d.spend),
      budget:    Math.round(d.alloc),
      employees: d.count,
    }))
    .sort((a, b) => b.spend - a.spend);
}
