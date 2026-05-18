import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { useSupabase } from '../hooks/useSupabase';
import { ensureOrgExists } from '../api/organizations';

interface OrgContextValue {
  /** Supabase UUID for the active Clerk organization. Null until bootstrapped. */
  orgId: string | null;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue>({ orgId: null, isLoading: true });

export function OrgProvider({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  const client = useSupabase();
  const [orgId, setOrgId]       = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization || !client) {
      if (!organization) setLoading(false); // no org — nothing to bootstrap
      return;
    }

    setLoading(true);
    ensureOrgExists(client, organization.id, organization.name ?? organization.id)
      .then(id => { setOrgId(id); setLoading(false); })
      .catch(err => {
        console.error('[OrgProvider] ensureOrgExists failed:', err);
        setLoading(false);
      });
  }, [organization?.id, client]);

  return (
    <OrgContext.Provider value={{ orgId, isLoading }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext);
}
