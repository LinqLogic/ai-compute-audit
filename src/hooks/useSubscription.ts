import { useState, useEffect } from 'react';
import { useOrg } from '../context/OrgContext';
import { useSupabase } from './useSupabase';
import type { Plan } from '../config/features';
import type { OrgRow } from '../lib/database.types';

interface SubscriptionState {
  plan: Plan;
  status: string | null;
  isLoading: boolean;
}

/**
 * Reads the current org's plan from Supabase.
 * Falls back to 'free' while loading or when no org/client is available.
 */
export function useSubscription(): SubscriptionState {
  const { orgId } = useOrg();
  const client = useSupabase();
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
    status: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!orgId || !client) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    client
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setState({ plan: 'free', status: null, isLoading: false });
          return;
        }
        const row = data as OrgRow;
        setState({
          plan:      row.plan as Plan,
          status:    row.subscription_status,
          isLoading: false,
        });
      });
  }, [orgId, client]);

  return state;
}
