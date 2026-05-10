export type VendorId =
  | 'openai'
  | 'anthropic'
  | 'azure_openai'
  | 'google_gemini'
  | 'generic_csv'
  | 'unknown';

export type SchemaType = 'usage' | 'workers' | 'rate_cards' | 'unknown';

export interface IngestionWarning {
  row?:     number;
  field?:   string;
  message:  string;
}

export interface IngestionMeta {
  vendor:       VendorId;
  schema:       SchemaType;
  filename:     string;
  rowsIn:       number;
  rowsOut:      number;
  warnings:     IngestionWarning[];
  errors:       string[];
  auditId:      string;
  processedAt:  string;
}

export interface AdapterOutput<T> {
  records:  T[];
  warnings: IngestionWarning[];
}
