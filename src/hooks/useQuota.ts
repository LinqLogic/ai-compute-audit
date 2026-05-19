import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useOrg } from '../context/OrgContext';
import { useSubscription } from './useSubscription';
import { TIER_LIMITS } from '../config/features';
import { getMeterCount } from '../api/meter';

interface QuotaState {
  importsUsed:  number;
  importsLimit: number;
  importsExceeded: boolean;
  isLoading: boolean;
}

/**
 * Returns the current month's import quota usage for the org.
 * importsExceeded is true when the org has used all allowed imports.
 */
export function useQuota(): QuotaState & { refresh: () => void } {
  const client    = useSupabase();
  const { orgId } = useOrg();
  const { plan }  = useSubscription();

  const [importsUsed, setImportsUsed] = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);

  const limits = TIER_LIMITS[plan];

  const fetch = useCallback(() => {
    if (!client || !orgId) { setIsLoading(false); return; }
    setIsLoading(true);
    getMeterCount(client, orgId, 'import')
      .then(count => { setImportsUsed(count); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [client, orgId]);

  useEffect(() => { fetch(); }, [fetch]);

  const importsLimit    = limits.maxImportsPerMonth;
  const importsExceeded = importsUsed >= importsLimit;

  return { importsUsed, importsLimit, importsExceeded, isLoading, refresh: fetch };
}
