/** Severity levels — ordered critical > high > medium > low. */
export type ActionSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Categories of generated action items. */
export type ActionType =
  | 'spend_spike'
  | 'idle_seat'
  | 'model_optimization'
  | 'budget_overrun';

/** Lifecycle status of an action item. */
export type ActionStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

/** Threshold comparison evidence block. */
export interface ThresholdComparison {
  /** Human label for the metric being evaluated. */
  metric: string;
  /** Observed value (formatted string). */
  actual: string;
  /** Threshold value (formatted string). */
  threshold: string;
  /** true = metric exceeded (over budget, over allocation, etc.). */
  exceeded: boolean;
}

/**
 * ActionItem — the primary output of the Action Engine.
 *
 * Every field is mandatory (no undefined) so UI consumers can safely
 * render any property without null-checks.
 *
 * Financial fields are all in USD. Monthly refers to a calendar month.
 * Annual is estimatedMonthlySavings × annualizationMonths (12 by default).
 */
export interface ActionItem {
  /** Stable deterministic identifier: 'TYPE::entityId[::context]' */
  id: string;

  /** Detector category. */
  type: ActionType;

  /** Short human-readable title for the action. */
  title: string;

  /** Governance severity. */
  severity: ActionSeverity;

  /** Confidence in this recommendation, 0–100. */
  confidence: number;

  /** Composite priority score for sorting, 0–1000 (higher = more urgent). */
  priorityScore: number;

  /** Dollar size of the current detected problem (monthly). */
  financialImpact: number;

  /** Conservative estimated monthly savings if action is taken. */
  estimatedMonthlySavings: number;

  /** estimatedMonthlySavings × 12. */
  estimatedAnnualSavings: number;

  /** Department name (for filtering and routing). */
  department: string;

  /** Cost center code. Empty string if not applicable (org-level items). */
  costCenter: string;

  /** Suggested owner for resolution (e.g. 'Department Head', 'CFO'). */
  ownerSuggestion: string;

  /** 2–4 key evidence bullets shown in the card. */
  evidence: string[];

  /** Single-line summary of the input data used by the detector. */
  inputDataSummary: string;

  /** Single-line summary of how the financial impact was calculated. */
  calculationSummary: string;

  /** Threshold comparison evidence block. */
  thresholdComparison: ThresholdComparison;

  /** CFO/executive narrative explaining why this matters. */
  governanceInterpretation: string;

  /** Single clear recommended action for the suggested owner. */
  recommendedAction: string;

  /** Lifecycle status (open by default). */
  status: ActionStatus;

  /** ISO-8601 creation timestamp. */
  createdAt: string;

  /** 'YYYY-MM' period this action item belongs to. */
  periodKey: string;

  /** Entity IDs (employee EID, department name, etc.) associated with this item. */
  relatedEntityIds: string[];
}
