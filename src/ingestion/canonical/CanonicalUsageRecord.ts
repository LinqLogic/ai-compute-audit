export interface CanonicalUsageRecord {
  id?:              string;
  employeeId?:      string;
  userId?:          string;
  email?:           string;
  vendor:           string;
  model?:           string;
  product?:         string;
  tokensIn?:        number;
  tokensOut?:       number;
  totalTokens?:     number;
  gpuHours?:        number;
  billedAmount?:    number;
  currency?:        string;
  timestamp?:       string;
  requestId?:       string;
  organizationId?:  string;
  projectId?:       string;
  raw:              Record<string, string>;
}
