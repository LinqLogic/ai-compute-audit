import { useOrganization } from '@clerk/clerk-react';

/** Returns the Clerk organization ID (e.g. "org_xxx") or null if no org is active. */
export function useOrgId(): string | null {
  const { organization } = useOrganization();
  return organization?.id ?? null;
}
