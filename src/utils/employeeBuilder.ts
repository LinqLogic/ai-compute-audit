/**
 * employeeBuilder.ts
 *
 * Responsibility: join WorkerRow[] to aggregated PricedEvent data and
 * produce the typed Employee[] domain objects consumed by all UI pages.
 *
 * Depends on:
 *   - pricingEngine.ts  (priceAllEvents, aggregateByEmployee)
 *   - policyRules.ts    (derivePolicy, deriveRisk, APPROVED_TOOLS)
 *
 * Pure function. No I/O, no React, no PapaParse references.
 *
 * Consumed by: DomainContext
 */

import { Employee } from '../data/types';
import { WorkerRow, UsageEventRow, RateCardRow } from '../types/csvRows';
import { priceAllEvents, aggregateByEmployee } from './pricingEngine';
import { derivePolicy, deriveRisk, APPROVED_TOOLS } from './policyRules';

/**
 * Build Employee[] from workers, usage events, and (optionally) rate card rows.
 *
 * Data flow:
 *   1. Price every event via pricingEngine (rate card match or billed_amount fallback)
 *   2. Aggregate priced events by employee_id
 *   3. Join each WorkerRow to its aggregation to produce an Employee
 *
 * When rateCardRows is null or empty, every event falls back transparently
 * to its billed_amount — the output shape is identical either way.
 */
export function buildEmployeesFromCsv(
  workers:      WorkerRow[],
  events:       UsageEventRow[],
  rateCardRows: RateCardRow[] | null = null,
): Employee[] {
  // Step 1: price all events
  const pricedEvents = priceAllEvents(events, rateCardRows);

  // Step 2: aggregate by employee_id
  const aggMap = aggregateByEmployee(pricedEvents);

  // Step 3: join workers → aggregated usage → Employee
  return workers
    .filter(w => w.status?.toLowerCase() !== 'inactive' && w.name?.trim())
    .map((w, i) => {
      const empId = w.employee_id?.trim() || `E-${1000 + i}`;
      const agg   = aggMap.get(empId) ?? {
        spend: 0, tokens: 0, gpu: 0, prompts: 0,
        apps: [], unratedCount: 0,
      };

      const spend      = Math.round(agg.spend * 100) / 100;
      // Target ~80 % budget utilisation so variance figures are informative
      const alloc      = Math.max(100, Math.round(spend / 0.80));
      const variance   = alloc > 0 ? Math.round(((spend - alloc) / alloc) * 100) : 0;
      const hasShadow  = agg.apps.some(a => !APPROVED_TOOLS.has(a));

      return {
        id:       i + 1,
        name:     w.name.trim(),
        dept:     w.department?.trim()  || 'Unknown',
        manager:  w.manager?.trim()     || '—',
        role:     '—',
        eid:      empId,
        fte:      1,
        spend,
        tokens:   Math.round(agg.tokens / 1_000),  // stored as thousands for display
        gpu:      Math.round(agg.gpu * 10) / 10,
        prompts:  agg.prompts,
        apps:     agg.apps.length > 0 ? agg.apps : ['—'],
        policy:   derivePolicy(variance, agg.apps, agg.unratedCount),
        variance,
        alloc,
        center:   w.cost_center?.trim() || '—',
        risk:     deriveRisk(variance, spend, hasShadow, agg.unratedCount),
        entity:   'Imported',
      } as Employee;
    });
}
