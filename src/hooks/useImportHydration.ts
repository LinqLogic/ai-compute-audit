import { useEffect, useRef } from 'react';
import { useImport } from '../context/ImportContext';
import { useSupabase } from './useSupabase';
import { useOrg } from '../context/OrgContext';
import { loadLatestImport } from '../api/imports';

/**
 * On mount, if no local import is present and the org is bootstrapped,
 * loads the most recent import from Supabase and hydrates ImportContext.
 * Runs once per orgId change.
 */
export function useImportHydration(): void {
  const { orgId } = useOrg();
  const client = useSupabase();
  const { isUsingImport, applyImportIfEmpty } = useImport();
  const hydratedForOrg = useRef<string | null>(null);

  useEffect(() => {
    if (!orgId || !client || isUsingImport || hydratedForOrg.current === orgId) return;

    hydratedForOrg.current = orgId;

    loadLatestImport(client, orgId).then(imported => {
      if (!imported) return;
      applyImportIfEmpty(imported);
    }).catch(err => {
      console.error('[useImportHydration]', err);
    });
  }, [orgId, client, isUsingImport, applyImportIfEmpty]);
}
