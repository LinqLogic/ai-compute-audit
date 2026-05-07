/**
 * useScenarios.ts
 *
 * Bridges scenarioStorage (pure utility) with ImportContext (React state).
 *
 * Exposes:
 *   - list of saved scenarios
 *   - save current state as a named scenario
 *   - load a scenario (replaces current import state)
 *   - delete a scenario
 *   - rename a scenario
 */

import { useState, useCallback } from 'react';
import { useImport } from '../context/ImportContext';
import {
  listScenarios,
  saveScenario,
  deleteScenario,
  renameScenario,
  storageUsedBytes,
  Scenario,
} from '../utils/scenarioStorage';

export type { Scenario };

export interface UseScenariosReturn {
  scenarios:      Scenario[];
  storageBytes:   number;
  saveCurrentAs:  (name: string) => Scenario;
  loadScenario:   (scenario: Scenario) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  refresh:        () => void;
}

export function useScenarios(): UseScenariosReturn {
  const { imported, applyImport, resetToMock } = useImport();

  const [scenarios,    setScenarios]    = useState<Scenario[]>(() => listScenarios());
  const [storageBytes, setStorageBytes] = useState(() => storageUsedBytes());

  const refresh = useCallback(() => {
    setScenarios(listScenarios());
    setStorageBytes(storageUsedBytes());
  }, []);

  const saveCurrentAs = useCallback((name: string): Scenario => {
    const saved = saveScenario(
      name,
      imported.workers,
      imported.usageEvents,
      imported.rateCards,
    );
    refresh();
    return saved;
  }, [imported, refresh]);

  const loadScenario = useCallback((scenario: Scenario) => {
    // Reset to mock first to clear any previous state, then apply the scenario
    resetToMock();
    // Apply in next tick so resetToMock's setState has committed
    setTimeout(() => {
      applyImport({
        workers:     scenario.workers,
        usageEvents: scenario.usageEvents,
        rateCards:   scenario.rateCards,
      });
    }, 0);
  }, [applyImport, resetToMock]);

  const handleDelete = useCallback((id: string) => {
    deleteScenario(id);
    refresh();
  }, [refresh]);

  const handleRename = useCallback((id: string, name: string) => {
    renameScenario(id, name);
    refresh();
  }, [refresh]);

  return {
    scenarios,
    storageBytes,
    saveCurrentAs,
    loadScenario,
    deleteScenario: handleDelete,
    renameScenario: handleRename,
    refresh,
  };
}
