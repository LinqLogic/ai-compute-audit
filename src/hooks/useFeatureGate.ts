import { useSubscription } from './useSubscription';
import { FEATURE_PLAN, planAtLeast } from '../config/features';

/**
 * Returns true if the current org's plan meets the minimum requirement
 * for the given feature key (defined in src/config/features.ts).
 */
export function useFeatureGate(featureKey: string): boolean {
  const { plan } = useSubscription();
  const required = FEATURE_PLAN[featureKey];
  if (!required) return true; // unlisted features are allowed
  return planAtLeast(plan, required);
}
