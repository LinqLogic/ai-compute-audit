import { useRef, useCallback, useEffect } from 'react';
import { PipelineResult } from '../ingestion';
import type { WorkerRequest, WorkerResponse } from '../workers/ingestion.worker';

type PendingMap = Map<string, {
  resolve: (result: PipelineResult) => void;
  reject:  (err: Error) => void;
}>;

/**
 * Manages a single long-lived ingestion worker.
 * Returns processFile(file): Promise<PipelineResult> which reads the file
 * as text in the main thread then hands it to the worker for processing.
 *
 * Falls back to inline processing when Workers are not supported.
 */
export function useIngestionWorker() {
  const workerRef  = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingMap>(new Map());

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('../workers/ingestion.worker.ts', import.meta.url),
      );

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        const pending = pendingRef.current.get(msg.id);
        if (!pending) return;
        pendingRef.current.delete(msg.id);

        if (msg.type === 'result') {
          pending.resolve(msg.data);
        } else {
          pending.reject(new Error(msg.message));
        }
      };

      worker.onerror = (err) => {
        console.error('[useIngestionWorker] worker error:', err.message);
      };

      workerRef.current = worker;
    } catch {
      // Workers not available (e.g. test environment) — processFile falls back
      console.warn('[useIngestionWorker] Web Workers unavailable; using inline processing');
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const processFile = useCallback(async (file: File): Promise<PipelineResult> => {
    const worker = workerRef.current;

    // Fallback: inline processing when worker is unavailable
    if (!worker) {
      const { runIngestionPipelineFromFile } = await import('../ingestion');
      return runIngestionPipelineFromFile(file);
    }

    const csvText = await file.text();
    const id      = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return new Promise<PipelineResult>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });

      const request: WorkerRequest = { id, filename: file.name, csvText };
      worker.postMessage(request);
    });
  }, []);

  return { processFile };
}
