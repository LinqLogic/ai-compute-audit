/**
 * normalizeUsageEvent.ts
 *
 * Adapts raw ingestion rows into AIUsageEvent for the Action Engine.
 *
 * Two entry points:
 *   normalizeUsageEvents()         — from real UsageEventRow[] imports
 *   synthesizeEventsFromEmployees() — from aggregated Employee[] (demo / fallback)
 *
 * Identity fields (employeeName, department, costCenter, manager) are not
 * present in UsageEventRow — they remain empty strings here and are resolved
 * by the detectors via Employee[] from DomainContext, which has the joined data.
 */

import { AIUsageEvent } from './types';
import { UsageEventRow } from '../types/csvRows';
import { Employee } from '../data/types';

// ─── Seat-licensed providers ──────────────────────────────────────────────────

const SEAT_PROVIDER_COSTS: Record<string, number> = {
  'copilot':             30,
  'microsoft copilot':   30,
  'copilot for m365':    30,
  'github copilot':      39,
  'github copilot enterprise': 39,
};

function isSeatProvider(provider: string): boolean {
  return provider.toLowerCase() in SEAT_PROVIDER_COSTS;
}

function seatCostFor(provider: string): number {
  return SEAT_PROVIDER_COSTS[provider.toLowerCase()] ?? 0;
}

// ─── Inference helpers ────────────────────────────────────────────────────────

function inferRequestType(eventType: string, model: string): string {
  const et = eventType.toLowerCase();
  const m  = model.toLowerCase();
  if (et.includes('embed') || m.includes('embed'))          return 'embedding';
  if (et.includes('image') || m.includes('dall') || m.includes('firefly')) return 'image';
  if (et.includes('audio') || m.includes('whisper') || m.includes('tts')) return 'audio';
  if (et.includes('batch'))                                 return 'batch';
  if (et.includes('fine') || m.includes('fine-tun'))        return 'fine_tuning';
  if (et.includes('completion'))                            return 'completion';
  return 'chat';
}

const APPROVED_PROVIDERS = new Set([
  'openai', 'anthropic', 'azure', 'azure openai', 'google', 'microsoft',
  'github', 'copilot', 'gemini', 'vertex',
]);

function inferRiskFlags(provider: string, billedAmount: number): string[] {
  const flags: string[] = [];
  const p = provider.toLowerCase();
  if (p && !Array.from(APPROVED_PROVIDERS).some(a => p.includes(a))) {
    flags.push('unapproved_tool');
  }
  if (billedAmount > 500) flags.push('high_cost_event');
  return flags;
}

// ─── Row normalizer ───────────────────────────────────────────────────────────

export function normalizeUsageEvent(row: UsageEventRow): AIUsageEvent {
  const billedAmount = parseFloat(row.billed_amount) || 0;
  const tokensIn     = parseInt(row.tokens_in,  10) || 0;
  const tokensOut    = parseInt(row.tokens_out, 10) || 0;
  const gpuHours     = parseFloat(row.gpu_hours)    || 0;
  const provider     = row.provider  || '';
  const model        = row.model     || '';

  const seat    = isSeatProvider(provider);
  const apiCost = seat ? 0 : billedAmount;
  const seatCost = seat ? seatCostFor(provider) : 0;

  return {
    id:            row.event_id || `${row.employee_id}_${row.timestamp}`,
    timestamp:     row.timestamp || new Date().toISOString(),
    employeeId:    row.employee_id  || '',
    // Identity not in UsageEventRow — resolved via Employee[] in detectors
    employeeName:  '',
    department:    '',
    costCenter:    '',
    manager:       '',
    provider,
    model,
    inputTokens:   tokensIn,
    outputTokens:  tokensOut,
    totalTokens:   tokensIn + tokensOut,
    apiCost,
    seatCost,
    gpuHours,
    totalCost:     billedAmount,
    requestType:   inferRequestType(row.event_type || '', model),
    riskFlags:     inferRiskFlags(provider, billedAmount),
    sourceSystem:  provider || 'unknown',
    rawSourceRow:  Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, String(v ?? '')]),
    ),
  };
}

export function normalizeUsageEvents(rows: UsageEventRow[]): AIUsageEvent[] {
  return rows.map(normalizeUsageEvent);
}

// ─── Synthesis fallback (demo / aggregated data) ──────────────────────────────

/**
 * Synthesizes one monthly-aggregate AIUsageEvent per Employee.
 * Used when no raw usage_events.csv is available so the action engine
 * can still run against demo or imported-worker-only datasets.
 *
 * sourceSystem is marked 'aggregated_demo' so detectors can apply
 * lower confidence scores to items derived from this path.
 */
export function synthesizeEventsFromEmployees(employees: Employee[]): AIUsageEvent[] {
  const period = new Date().toISOString().slice(0, 7) + '-01T00:00:00Z';

  return employees.map(emp => {
    const primaryApp  = emp.apps[0] || '';
    const seat        = isSeatProvider(primaryApp);
    const seatCost    = seat ? seatCostFor(primaryApp) : 0;

    // tokens stored as thousands in Employee domain model
    const totalTokens = emp.tokens * 1_000;

    return {
      id:           `synth_${emp.eid}_${period.slice(0, 7)}`,
      timestamp:    period,
      employeeId:   emp.eid,
      employeeName: emp.name,
      department:   emp.dept,
      costCenter:   emp.center,
      manager:      emp.manager,
      provider:     primaryApp || 'unknown',
      model:        'aggregated',
      inputTokens:  Math.round(totalTokens * 0.6),
      outputTokens: Math.round(totalTokens * 0.4),
      totalTokens,
      apiCost:      seat ? emp.spend - seatCost : emp.spend,
      seatCost,
      gpuHours:     emp.gpu,
      totalCost:    emp.spend,
      requestType:  'aggregated_monthly',
      riskFlags:    emp.policy !== 'Compliant' ? ['policy_review'] : [],
      sourceSystem: 'aggregated_demo',
      rawSourceRow: {},
    };
  });
}
