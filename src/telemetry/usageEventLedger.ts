/**
 * usageEventLedger.ts
 *
 * React hook — provides the current AIUsageEvent[] to Action Engine consumers.
 *
 * Data source priority:
 *   1. Real UsageEventRow[] from ImportContext (when usage_events.csv uploaded)
 *   2. Synthesized events from Employee[] in DomainContext (demo / fallback)
 *
 * Consumers should check event.sourceSystem === 'aggregated_demo' when
 * deciding whether to show lower-confidence labels.
 */

import { useMemo } from 'react';
import { useImport } from '../context/ImportContext';
import { useDomain } from '../context/DomainContext';
import { AIUsageEvent } from './types';
import { normalizeUsageEvents, synthesizeEventsFromEmployees } from './normalizeUsageEvent';

export function useActionEvents(): AIUsageEvent[] {
  const { imported, isUsingImport } = useImport();
  const { employees }               = useDomain();

  return useMemo(() => {
    if (isUsingImport && (imported.usageEvents?.length ?? 0) > 0) {
      return normalizeUsageEvents(imported.usageEvents!);
    }
    return synthesizeEventsFromEmployees(employees);
  }, [imported.usageEvents, isUsingImport, employees]);
}
