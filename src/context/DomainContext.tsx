/**
 * DomainContext.tsx
 *
 * Responsibility: derive and memoize domain objects from ImportContext data.
 *
 * Reads raw rows from ImportContext (via useImport), applies the builder
 * pipeline, and exposes typed domain entities to all page components.
 *
 * Data flow:
 *   ImportContext (raw rows)
 *     → buildEmployeesFromCsv (pricing engine + employee builder)
 *     → buildDeptSpendFromEmployees
 *     → buildRateCardsFromCsv
 *     → buildPolicyMix
 *     → DomainContext (typed domain entities)
 *     → Pages
 *
 * Domain entities are memoized individually so an update to rateCards alone
 * only re-triggers the employee build (repricing), not the rate card display
 * model or policy mix independently.
 */

import React, {
  createContext, useContext, useMemo, ReactNode,
} from 'react';
import { Employee, DeptSpend, RateCard } from '../data/types';
import {
  employees as mockEmployees,
  deptSpend  as mockDeptSpend,
  ratecards  as mockRatecards,
  policyMix  as mockPolicyMix,
} from '../data/mockData';
import { useImport } from './ImportContext';
import { buildEmployeesFromCsv }       from '../utils/employeeBuilder';
import { buildDeptSpendFromEmployees }  from '../utils/deptSpend';
import { buildRateCardsFromCsv }        from '../utils/rateCardMapper';
import { buildPolicyMix }               from '../utils/policyRules';

// ─── Public interface ────────────────────────────────────────────────────────

export interface DomainContextValue {
  /** Employee-level records with spend, policy, risk etc. */
  employees: Employee[];

  /** Department-level spend/budget rollups. */
  deptSpend: DeptSpend[];

  /** Rate card display records (for the Rate Cards page). */
  ratecards: RateCard[];

  /** Policy compliance distribution (for the compliance pie chart). */
  policyMix: { name: string; value: number }[];

  /**
   * True when the pricing engine is fully active:
   * both usage_events and rate_cards have been imported.
   * Used by UI to surface "computed cost" vs "billed amount" labeling.
   */
  isPricingEngineActive: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const DomainContext = createContext<DomainContextValue | null>(null);

export function DomainProvider({ children }: { children: ReactNode }) {
  const { imported, isUsingImport } = useImport();

  // Resolve presence flags from raw import state
  const hasWorkers = (imported.workers?.length    ?? 0) > 0;
  const hasEvents  = (imported.usageEvents?.length ?? 0) > 0;
  const hasRates   = (imported.rateCards?.length  ?? 0) > 0;

  const isPricingEngineActive = hasEvents && hasRates;

  // ── employees: re-derives when any of the three source arrays change ──────
  // Passing rateCardRows triggers the pricing engine; null falls back to billed_amount.
  const employees: Employee[] = useMemo(() => {
    if (!hasWorkers && !hasEvents) return mockEmployees;
    return buildEmployeesFromCsv(
      imported.workers     ?? [],
      imported.usageEvents ?? [],
      imported.rateCards   ?? null,
    );
  // Workers, events, and rate cards each independently invalidate the computation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imported.workers, imported.usageEvents, imported.rateCards]);

  // ── deptSpend: re-derives only when employees change ─────────────────────
  const deptSpend: DeptSpend[] = useMemo(() => {
    if (!isUsingImport) return mockDeptSpend;
    return buildDeptSpendFromEmployees(employees);
  }, [employees, isUsingImport]);

  // ── ratecards: re-derives only when rateCards rows change ─────────────────
  const ratecards: RateCard[] = useMemo(() => {
    if (!hasRates) return mockRatecards;
    return buildRateCardsFromCsv(imported.rateCards!);
  }, [imported.rateCards, hasRates]);

  // ── policyMix: re-derives only when employees change ─────────────────────
  const policyMix = useMemo(() => {
    if (!isUsingImport) return mockPolicyMix;
    return buildPolicyMix(employees);
  }, [employees, isUsingImport]);

  return (
    <DomainContext.Provider value={{
      employees,
      deptSpend,
      ratecards,
      policyMix,
      isPricingEngineActive,
    }}>
      {children}
    </DomainContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDomain(): DomainContextValue {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error('useDomain must be used inside DomainProvider');
  return ctx;
}
