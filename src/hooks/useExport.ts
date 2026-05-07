/**
 * useExport.ts
 *
 * Thin hook: reads domain data and exposes named export actions to the UI.
 * All serialisation logic lives in exportData.ts.
 */

import { useCallback } from 'react';
import { useDomain } from '../context/DomainContext';
import {
  exportEmployeesCsv,
  exportEmployeesJson,
  exportDeptSpendCsv,
  exportPolicyMixCsv,
  exportRateCardsCsv,
  exportFullBundle,
} from '../utils/exportData';

export interface UseExportReturn {
  exportEmployeesCsv:  () => void;
  exportEmployeesJson: () => void;
  exportDeptSpendCsv:  () => void;
  exportPolicyMixCsv:  () => void;
  exportRateCardsCsv:  () => void;
  exportFullBundle:    () => void;
}

export function useExport(): UseExportReturn {
  const { employees, deptSpend, ratecards } = useDomain();

  return {
    exportEmployeesCsv:  useCallback(() => exportEmployeesCsv(employees),               [employees]),
    exportEmployeesJson: useCallback(() => exportEmployeesJson(employees),               [employees]),
    exportDeptSpendCsv:  useCallback(() => exportDeptSpendCsv(deptSpend),               [deptSpend]),
    exportPolicyMixCsv:  useCallback(() => exportPolicyMixCsv(employees),               [employees]),
    exportRateCardsCsv:  useCallback(() => exportRateCardsCsv(ratecards),               [ratecards]),
    exportFullBundle:    useCallback(() => exportFullBundle(employees, deptSpend, ratecards), [employees, deptSpend, ratecards]),
  };
}
