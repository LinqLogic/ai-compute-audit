import { useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabase } from './useSupabase';
import { useOrg } from '../context/OrgContext';
import { writeAuditEvent, AuditEventType, AuditPayload } from '../api/auditLog';

/**
 * Returns a `log` function for fire-and-forget audit event writing.
 * When org/client is not available, silently skips.
 */
export function useAuditLog() {
  const client    = useSupabase();
  const { orgId } = useOrg();
  const { user }  = useUser();

  const log = useCallback((eventType: AuditEventType, payload: AuditPayload = {}) => {
    if (!client || !orgId || !user?.id) return;
    writeAuditEvent(client, orgId, user.id, eventType, payload);
  }, [client, orgId, user?.id]);

  return { log };
}
