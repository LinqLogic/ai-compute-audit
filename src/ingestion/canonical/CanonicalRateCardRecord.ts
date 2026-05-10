export interface CanonicalRateCardRecord {
  provider:       string;
  model?:         string;
  unitBasis?:     string;
  cost?:          number;
  markup?:        number;
  effectiveStart?: string;
  effectiveEnd?:  string;
  raw:            Record<string, string>;
}
