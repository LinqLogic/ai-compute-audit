export interface CanonicalUsageRecord {
  id?:              string;
  employeeId?:      string;
  userId?:          string;
  email?:           string;
  employeeName?:    string;
  vendor:           string;
  model?:           string;
  product?:         string;
  tokensIn?:        number;
  tokensOut?:       number;
  totalTokens?:     number;
  gpuHours?:        number;
  billedAmount?:    number;
  requests?:        number;
  unitCost?:        number;
  currency?:        string;
  timestamp?:       string;
  periodStart?:     string;
  periodEnd?:       string;
  requestId?:       string;
  organizationId?:  string;
  projectId?:       string;
  raw:              Record<string, string>;
}
