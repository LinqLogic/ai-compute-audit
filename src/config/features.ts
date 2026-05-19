export type Plan = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
  maxEmployees: number;
  maxImportsPerMonth: number;
}

export const TIER_LIMITS: Record<Plan, TierLimits> = {
  free:       { maxEmployees: 10,        maxImportsPerMonth: 2   },
  pro:        { maxEmployees: 100,       maxImportsPerMonth: 10  },
  enterprise: { maxEmployees: Infinity,  maxImportsPerMonth: Infinity },
};

/** Features gated behind a minimum plan tier. */
export const FEATURE_PLAN: Record<string, Plan> = {
  action_engine:        'pro',
  governance_exceptions:'pro',
  csv_export:           'pro',
  scenario_builder:     'pro',
  department_filter:    'free',  // available on all plans
};

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, enterprise: 2 };

export function planAtLeast(actual: Plan, required: Plan): boolean {
  return PLAN_RANK[actual] >= PLAN_RANK[required];
}
