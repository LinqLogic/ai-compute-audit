/**
 * csvImport.ts
 *
 * Backward-compatibility barrel.
 * All logic has been extracted into focused modules:
 *
 *   csvParser.ts       — PapaParse wrapper + column validation
 *   employeeBuilder.ts — WorkerRow[] + events → Employee[]
 *   policyRules.ts     — derivePolicy, deriveRisk, buildPolicyMix
 *   deptSpend.ts       — Employee[] → DeptSpend[]
 *   rateCardMapper.ts  — RateCardRow[] → RateCard[] (display model)
 *
 * Existing consumers that import from this file continue to work without
 * modification. New code should import directly from the module it needs.
 */

export { parseCsv, detectFileType, validateColumns, REQUIRED_COLUMNS } from './csvParser';
export type { ParseResult } from './csvParser';
export { buildEmployeesFromCsv }  from './employeeBuilder';
export { buildDeptSpendFromEmployees } from './deptSpend';
export { buildRateCardsFromCsv }  from './rateCardMapper';
export { buildPolicyMix }         from './policyRules';
