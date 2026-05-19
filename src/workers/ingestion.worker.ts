/* eslint-disable no-restricted-globals */
/**
 * ingestion.worker.ts
 *
 * Off-main-thread CSV processing.  Receives raw CSV text + filename,
 * runs the pure ingestion pipeline, and posts the result back.
 *
 * Created via: new Worker(new URL('../workers/ingestion.worker.ts', import.meta.url))
 * CRA 5 / webpack 5 supports this syntax natively.
 */

import Papa from 'papaparse';
import { runIngestionPipeline, PipelineResult } from '../ingestion';

export interface WorkerRequest {
  id:       string;   // correlates response to caller
  filename: string;
  csvText:  string;
}

export type WorkerResponse =
  | { id: string; type: 'result'; data: PipelineResult }
  | { id: string; type: 'error';  message: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, filename, csvText } = event.data;

  try {
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header:          true,
      skipEmptyLines:  true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    const result = runIngestionPipeline(filename, parsed.data);
    (self as unknown as Worker).postMessage({ id, type: 'result', data: result } as WorkerResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      type:    'error',
      message: err instanceof Error ? err.message : 'Worker processing error',
    } as WorkerResponse);
  }
};
