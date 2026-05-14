/**
 * actionEvidenceFormatter.ts
 *
 * Display helpers and export utilities for ActionItem[].
 * No React dependency — usable in any rendering context.
 */

import { ActionItem, ActionSeverity } from '../actionEngine/types';
import { fmtK$ } from '../actionEngine/financialCalculations';
import { ACTION_ENGINE_CONFIG } from '../actionEngine/config';

const MAX_EXPORT = ACTION_ENGINE_CONFIG.export.maxExecutiveItems;

// ─── Label formatters ─────────────────────────────────────────────────────────

export function formatSeverityLabel(severity: ActionSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function formatConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return `${confidence}% · High confidence`;
  if (confidence >= 65) return `${confidence}% · Moderate confidence`;
  if (confidence >= 55) return `${confidence}% · Indicative`;
  return `${confidence}% · Estimated`;
}

export function formatAnnualSavings(amount: number): string {
  return fmtK$(amount) + '/yr';
}

export function formatActionType(type: ActionItem['type']): string {
  const labels: Record<ActionItem['type'], string> = {
    spend_spike:        'Spend Spike',
    idle_seat:          'Idle Seat',
    model_optimization: 'Model Optimisation',
    budget_overrun:     'Budget Overrun',
  };
  return labels[type];
}

// ─── Summary builder ──────────────────────────────────────────────────────────

export interface ActionEngineSummary {
  totalItems: number;
  openItems: number;
  criticalCount: number;
  highCount: number;
  totalAnnualSavings: number;
  topOpportunity: ActionItem | null;
  savingsByType: Record<ActionItem['type'], number>;
}

export function buildActionEngineSummary(items: ActionItem[]): ActionEngineSummary {
  const open = items.filter(i => i.status === 'open' || i.status === 'in_review');

  const savingsByType: Record<ActionItem['type'], number> = {
    spend_spike:        0,
    idle_seat:          0,
    model_optimization: 0,
    budget_overrun:     0,
  };

  let totalAnnualSavings = 0;
  for (const item of open) {
    savingsByType[item.type] += item.estimatedAnnualSavings;
    totalAnnualSavings       += item.estimatedAnnualSavings;
  }

  return {
    totalItems:         items.length,
    openItems:          open.length,
    criticalCount:      open.filter(i => i.severity === 'critical').length,
    highCount:          open.filter(i => i.severity === 'high').length,
    totalAnnualSavings,
    topOpportunity:     open[0] ?? null,
    savingsByType,
  };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export const ACTION_ITEMS_CSV_HEADER =
  'id,title,type,severity,confidence,priority_score,' +
  'annual_savings,monthly_savings,department,cost_center,' +
  'owner,recommended_action,financial_context,status,period';

function escapeCsv(s: string): string {
  return `"${s.replace(/"/g, "'")}"`;
}

export function actionItemToCsvRow(item: ActionItem): string {
  const financialContext = [item.inputDataSummary, item.calculationSummary]
    .filter(Boolean)
    .join(' · ');

  return [
    item.id,
    escapeCsv(item.title),
    item.type,
    item.severity,
    item.confidence,
    item.priorityScore,
    item.estimatedAnnualSavings.toFixed(0),
    item.estimatedMonthlySavings.toFixed(0),
    escapeCsv(item.department),
    item.costCenter,
    escapeCsv(item.ownerSuggestion),
    escapeCsv(item.recommendedAction),
    escapeCsv(financialContext),
    item.status,
    item.periodKey,
  ].join(',');
}

/**
 * Export action items as CSV, capped at the executive limit (default: top 25
 * by priority score). Items are assumed to already be sorted descending.
 */
export function exportActionItemsCsv(
  items: ActionItem[],
  limit: number = MAX_EXPORT,
): void {
  const top      = items.slice(0, limit);
  const rows     = [ACTION_ITEMS_CSV_HEADER, ...top.map(actionItemToCsvRow)].join('\n');
  const blob     = new Blob([rows], { type: 'text/csv' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `action-items-top${top.length}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
