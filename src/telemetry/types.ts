/**
 * AIUsageEvent — canonical normalized event type for the Action Engine.
 *
 * Produced by normalizeUsageEvent() from raw UsageEventRow CSV imports,
 * or synthesized from aggregated Employee domain objects when raw events
 * are unavailable (demo / fallback path).
 *
 * Fields that are unavailable in the raw source (e.g. employeeName when
 * only usage_events.csv is imported without a workers.csv) are left as
 * empty strings rather than undefined, so consumers can always safely
 * read any field without null-checks.
 */
export interface AIUsageEvent {
  /** Stable unique identifier for this event. */
  id: string;

  /** ISO-8601 timestamp of the usage event. */
  timestamp: string;

  /** Internal employee/user identifier (joins to WorkerRow.employee_id). */
  employeeId: string;

  /** Display name — populated only when workers CSV is also loaded. */
  employeeName: string;

  /** Department — populated only when workers CSV is also loaded. */
  department: string;

  /** Cost center code — populated only when workers CSV is also loaded. */
  costCenter: string;

  /** Manager name — populated only when workers CSV is also loaded. */
  manager: string;

  /** AI provider name (e.g. 'OpenAI', 'Anthropic', 'Azure OpenAI'). */
  provider: string;

  /** Model name (e.g. 'gpt-4o', 'claude-opus-4'). */
  model: string;

  /** Input token count for this event. */
  inputTokens: number;

  /** Output / completion token count. */
  outputTokens: number;

  /** Total tokens (inputTokens + outputTokens). */
  totalTokens: number;

  /** API usage cost in USD (token-priced events). Zero for seat-licensed tools. */
  apiCost: number;

  /** Seat licence cost in USD (e.g. Copilot, GitHub Copilot). Zero for API-priced tools. */
  seatCost: number;

  /** GPU compute hours consumed (ML workloads). */
  gpuHours: number;

  /** Total cost of this event: apiCost + seatCost (or raw billed_amount). */
  totalCost: number;

  /**
   * Inferred request type from event_type and model.
   * Values: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' |
   *         'batch' | 'fine_tuning' | 'aggregated_monthly' | 'unknown'
   */
  requestType: string;

  /** Optional project or cost-allocation label. */
  project?: string;

  /**
   * Risk flags raised during normalization.
   * Examples: 'unapproved_tool', 'high_cost_event', 'policy_review'
   */
  riskFlags: string[];

  /**
   * Source system identifier.
   * Examples: 'openai_api', 'anthropic_api', 'azure_openai',
   *           'aggregated_demo', 'unknown'
   */
  sourceSystem: string;

  /** Original CSV row preserved verbatim for audit trail. */
  rawSourceRow: Record<string, string>;
}
