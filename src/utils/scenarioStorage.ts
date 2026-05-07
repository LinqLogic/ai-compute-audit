/**
 * scenarioStorage.ts
 *
 * Serialise/deserialise named analysis scenarios to localStorage.
 * A scenario stores the raw imported rows (workers, usageEvents, rateCards)
 * and a user-defined name — the domain data is always re-derived on load,
 * keeping stored payloads minimal and ensuring pricing logic is current.
 *
 * No React, no I/O beyond localStorage. Pure utility.
 */

import { WorkerRow, UsageEventRow, RateCardRow } from '../types/csvRows';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Scenario {
  id:          string;
  name:        string;
  savedAt:     string;           // ISO timestamp
  workers:     WorkerRow[]      | null;
  usageEvents: UsageEventRow[]  | null;
  rateCards:   RateCardRow[]    | null;
}

const STORAGE_KEY = 'ai_audit_scenarios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readAll(): Scenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(scenarios: Scenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // localStorage quota exceeded — silently fail
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function listScenarios(): Scenario[] {
  return readAll().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export function saveScenario(
  name:        string,
  workers:     WorkerRow[]     | null,
  usageEvents: UsageEventRow[] | null,
  rateCards:   RateCardRow[]   | null,
): Scenario {
  const scenario: Scenario = {
    id:          `scenario_${Date.now()}`,
    name:        name.trim() || `Scenario ${new Date().toLocaleDateString()}`,
    savedAt:     new Date().toISOString(),
    workers,
    usageEvents,
    rateCards,
  };

  const existing = readAll().filter(s => s.id !== scenario.id);
  writeAll([scenario, ...existing]);
  return scenario;
}

export function deleteScenario(id: string): void {
  writeAll(readAll().filter(s => s.id !== id));
}

export function renameScenario(id: string, name: string): void {
  writeAll(readAll().map(s => s.id === id ? { ...s, name: name.trim() } : s));
}

/** Returns bytes used by scenario storage, for display purposes */
export function storageUsedBytes(): number {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? '').length * 2; // UTF-16
  } catch {
    return 0;
  }
}
