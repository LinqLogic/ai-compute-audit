export interface IngestionValidationResult<T> {
  records:      T[];
  errors:       string[];
  droppedCount: number;
}
