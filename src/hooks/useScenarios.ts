/**
 * useScenarios.ts
 *
 * Bridges scenario storage with ImportContext.
 * When org + Supabase client are available: uses Supabase (remote-primary).
 * When not authenticated or org not bootstrapped: falls back to localStorage.
 * Runs migrateLocalScenarios on first org load to move any existing local
 * scenarios to the org's Supabase store.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useImport } from '../context/ImportContext';
import { useSupabase } from './useSupabase';
import { useOrg } from '../context/OrgContext';
import {
  listScenarios,
  saveScenario,
  deleteScenario,
  renameScenario,
  storageUsedBytes,
  Scenario,
} from '../utils/scenarioStorage';
import {
  listScenariosRemote,
  saveScenarioRemote,
  deleteScenarioRemote,
  renameScenarioRemote,
  migrateLocalScenarios,
} from '../api/scenarios';

export type { Scenario };

export interface UseScenariosReturn {
  scenarios:      Scenario[];
  storageBytes:   number;
  saveCurrentAs:  (name: string) => Promise<Scenario>;
  loadScenario:   (scenario: Scenario) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  refresh:        () => void;
}

export function useScenarios(): UseScenariosReturn {
  const { imported, applyImport, resetToMock } = useImport();
  const client    = useSupabase();
  const { orgId } = useOrg();
  const { user }  = useUser();

  const [scenarios,    setScenarios]    = useState<Scenario[]>(() => listScenarios());
  const [storageBytes, setStorageBytes] = useState(() => storageUsedBytes());
  const migratedRef = useRef(false);

  const isRemote = !!(client && orgId);

  // Load remote scenarios and trigger migration on first org availability
  useEffect(() => {
    if (!client || !orgId || !user?.id) return;

    // Migration runs once per session (ref persists across re-renders)
    if (!migratedRef.current) {
      migratedRef.current = true;
      migrateLocalScenarios(client, orgId, user.id).catch(err =>
        console.error('[useScenarios] migration failed:', err),
      );
    }

    listScenariosRemote(client, orgId)
      .then(setScenarios)
      .catch(err => console.error('[useScenarios] listRemote failed:', err));
  }, [client, orgId, user?.id]);

  const refresh = useCallback(() => {
    if (client && orgId) {
      listScenariosRemote(client, orgId)
        .then(setScenarios)
        .catch(err => console.error('[useScenarios] refresh failed:', err));
    } else {
      setScenarios(listScenarios());
      setStorageBytes(storageUsedBytes());
    }
  }, [client, orgId]);

  const saveCurrentAs = useCallback(async (name: string): Promise<Scenario> => {
    if (isRemote && user?.id) {
      const saved = await saveScenarioRemote(client!, orgId!, user.id, {
        name,
        workers:     imported.workers,
        usageEvents: imported.usageEvents,
        rateCards:   imported.rateCards,
      });
      refresh();
      return saved;
    }
    const saved = saveScenario(name, imported.workers, imported.usageEvents, imported.rateCards);
    refresh();
    return saved;
  }, [isRemote, client, orgId, user?.id, imported, refresh]);

  const loadScenario = useCallback((scenario: Scenario) => {
    resetToMock();
    setTimeout(() => {
      applyImport({
        workers:     scenario.workers,
        usageEvents: scenario.usageEvents,
        rateCards:   scenario.rateCards,
      });
    }, 0);
  }, [applyImport, resetToMock]);

  const handleDelete = useCallback((id: string) => {
    if (isRemote) {
      deleteScenarioRemote(client!, orgId!, id)
        .then(refresh)
        .catch(err => console.error('[useScenarios] delete failed:', err));
    } else {
      deleteScenario(id);
      refresh();
    }
  }, [isRemote, client, orgId, refresh]);

  const handleRename = useCallback((id: string, name: string) => {
    if (isRemote) {
      renameScenarioRemote(client!, orgId!, id, name)
        .then(refresh)
        .catch(err => console.error('[useScenarios] rename failed:', err));
    } else {
      renameScenario(id, name);
      refresh();
    }
  }, [isRemote, client, orgId, refresh]);

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
