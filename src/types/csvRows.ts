/** Raw column shapes as they arrive from PapaParse (all strings) */

export interface WorkerRow {
  employee_id: string;
  name: string;
  department: string;
  manager: string;
  cost_center: string;
  status: string;
  email: string;
}

export interface UsageEventRow {
  event_id: string;
  employee_id: string;
  provider: string;
  product: string;
  model: string;
  event_type: string;
  tokens_in: string;
  tokens_out: string;
  gpu_hours: string;
  billed_amount: string;
  timestamp: string;
}

export interface RateCardRow {
  provider: string;
  model: string;
  unit_basis: string;
  rate: string;
  markup: string;
  effective_start: string;
  effective_end: string;
}

export type CsvFileType = 'workers' | 'usage_events' | 'rate_cards';

export interface ImportedDataState {
  workers:     WorkerRow[]      | null;
  usageEvents: UsageEventRow[]  | null;
  rateCards:   RateCardRow[]    | null;
}

export interface ImportError {
  file: string;
  message: string;
}
