export interface CanonicalWorkerRecord {
  id:           string;
  name?:        string;
  email?:       string;
  department?:  string;
  manager?:     string;
  costCenter?:  string;
  status?:      string;
  role?:        string;
  raw:          Record<string, string>;
}
