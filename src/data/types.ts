export type PolicyStatus = 'Compliant' | 'Review' | 'Escalate';

export interface Employee {
  id: number;
  name: string;
  dept: string;
  manager: string;
  role: string;
  eid: string;
  fte: number;
  spend: number;
  tokens: number;
  gpu: number;
  prompts: number;
  apps: string[];
  policy: PolicyStatus;
  variance: number;
  alloc: number;
  center: string;
  risk: number;
  entity: string;
}

export interface MonthlyTrend {
  month: string;
  spend: number;
  budget: number;
}

export interface DeptSpend {
  name: string;
  spend: number;
  budget: number;
  employees: number;
}

export interface RateCard {
  provider: string;
  model: string;
  unit: string;
  cost: number;
  markup: number;
  effective: string;
}

export interface Connector {
  name: string;
  status: 'Connected' | 'Degraded' | 'Pending';
  type: string;
  color: string;
}

export interface Exception {
  id: number;
  level: 'Escalate' | 'Review';
  emp: string;
  dept: string;
  issue: string;
  center: string;
}

export interface CloseStep {
  label: string;
  done: boolean;
  active?: boolean;
}

export interface PolicyRule {
  key: string;
  label: string;
  desc: string;
  threshold: string;
  enabled: boolean;
}

// ─── Pricing engine types ──────────────────────────────────────────────────

/** A usage event after pricing has been applied */
export interface PricedEvent {
  eventId:      string;
  employeeId:   string;
  provider:     string;
  model:        string;
  eventType:    string;
  timestamp:    string;
  tokensIn:     number;
  tokensOut:    number;
  gpuHours:     number;
  usageUnits:   number;   // computed based on unit_basis
  unitBasis:    string;   // the unit_basis that was used
  billedAmount: number;   // original billed_amount from CSV (fallback)
  computedCost: number;   // cost from rate card pricing
  finalCost:    number;   // computedCost if rated, billedAmount if unrated
  rated:        boolean;  // true = matched a rate card, false = fell back
  rateKey:      string;   // "provider::model" of matched rate card, or "unrated"
}

/** Indexed rate card for O(1) lookups */
export interface IndexedRateCard {
  provider:       string;
  model:          string;
  unitBasis:      string;
  rate:           number;
  markup:         number;
  effectiveStart: Date | null;
  effectiveEnd:   Date | null;
}
