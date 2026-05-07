/**
 * useCsvImport.ts
 *
 * Responsibility: encapsulate the full file-upload lifecycle for DataImportPanel.
 *
 * Handles:
 *   - Per-slot status tracking (idle / loading / ok / error)
 *   - Calling parseCsv for each file type
 *   - Dispatching parsed rows to ImportContext via applyImport
 *   - Pushing parse errors to ImportContext via pushErrors
 *   - Reset to demo data
 *   - Sample CSV download
 *
 * DataImportPanel imports this hook and renders only what it receives back.
 * No parsing logic lives in the component.
 */

import { useRef, useState, useCallback } from 'react';
import { parseCsv, ValidationResult } from '../utils/csvParser';
import { WorkerRow, UsageEventRow, RateCardRow, CsvFileType } from '../types/csvRows';
import { useImport } from '../context/ImportContext';

// ─── Slot configuration ──────────────────────────────────────────────────────

export interface FileSlot {
  type:    CsvFileType;
  label:   string;
  key:     SlotKey;
  columns: string;
}

export type SlotKey = 'workers' | 'usageEvents' | 'rateCards';

export const FILE_SLOTS: FileSlot[] = [
  {
    type:    'workers',
    key:     'workers',
    label:   'workers.csv',
    columns: 'employee_id, name, department, manager, cost_center, status, email',
  },
  {
    type:    'usage_events',
    key:     'usageEvents',
    label:   'usage_events.csv',
    columns: 'event_id, employee_id, provider, product, model, tokens_in, tokens_out, gpu_hours, billed_amount, timestamp',
  },
  {
    type:    'rate_cards',
    key:     'rateCards',
    label:   'rate_cards.csv',
    columns: 'provider, model, unit_basis, rate, markup, effective_start, effective_end',
  },
];

// ─── Slot status ─────────────────────────────────────────────────────────────

export type SlotStatus = 'idle' | 'loading' | 'ok' | 'error';

export interface SlotState {
  status:     SlotStatus;
  filename:   string;
  rowCount:   number;
  message:    string;
  warnings:   number;      // count of non-error validation issues
  validation: ValidationResult | null;
}

const defaultSlot = (): SlotState => ({
  status: 'idle', filename: '', rowCount: 0, message: '', warnings: 0, validation: null,
});

const emptySlots = (): Record<SlotKey, SlotState> => ({
  workers:     defaultSlot(),
  usageEvents: defaultSlot(),
  rateCards:   defaultSlot(),
});

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseCsvImportReturn {
  /** Per-slot upload status for rendering. */
  slots:          Record<SlotKey, SlotState>;

  /** Whether the panel is currently expanded. */
  expanded:       boolean;
  toggleExpanded: () => void;

  /** Ref attached to the hidden <input type="file"> in the panel. */
  inputRef:       React.MutableRefObject<HTMLInputElement | null>;

  /** Called when user clicks "Choose file" on a slot. */
  openFilePicker: (slotKey: SlotKey) => void;

  /** Called by the hidden <input>'s onChange. */
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

  /** Called when a file is dropped onto a slot. */
  onDrop: (e: React.DragEvent, slotKey: SlotKey, fileType: CsvFileType) => Promise<void>;

  /** Reset all slots and import state to demo data. */
  handleReset: () => void;

  /** Download a sample CSV for the given file type. */
  downloadSample: (type: CsvFileType) => void;
}

export function useCsvImport(): UseCsvImportReturn {
  const { applyImport, resetToMock, pushErrors } = useImport();

  const [slots,          setSlots]          = useState<Record<SlotKey, SlotState>>(emptySlots);
  const [expanded,       setExpanded]       = useState(false);
  const [pendingSlotKey, setPendingSlotKey] = useState<SlotKey | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // ── Internal helpers ────────────────────────────────────────────────────

  const setSlot = useCallback((key: SlotKey, update: Partial<SlotState>) => {
    setSlots(prev => ({ ...prev, [key]: { ...prev[key], ...update } }));
  }, []);

  async function processFile(file: File, slotKey: SlotKey, fileType: CsvFileType) {
    setSlot(slotKey, { status: 'loading', filename: file.name, message: '' });

    if (fileType === 'workers') {
      const result = await parseCsv<WorkerRow>(file, 'workers');
      if (result.error) {
        setSlot(slotKey, { status: 'error', message: result.error.message });
        pushErrors([result.error]);
      } else {
        applyImport({ workers: result.data });
        setSlot(slotKey, { status: 'ok', rowCount: result.data.length, message: '', warnings: result.validation?.issues.filter((i: {severity: string}) => i.severity !== 'error').length ?? 0, validation: result.validation });
      }

    } else if (fileType === 'usage_events') {
      const result = await parseCsv<UsageEventRow>(file, 'usage_events');
      if (result.error) {
        setSlot(slotKey, { status: 'error', message: result.error.message });
        pushErrors([result.error]);
      } else {
        applyImport({ usageEvents: result.data });
        setSlot(slotKey, { status: 'ok', rowCount: result.data.length, message: '', warnings: result.validation?.issues.filter((i: {severity: string}) => i.severity !== 'error').length ?? 0, validation: result.validation });
      }

    } else if (fileType === 'rate_cards') {
      const result = await parseCsv<RateCardRow>(file, 'rate_cards');
      if (result.error) {
        setSlot(slotKey, { status: 'error', message: result.error.message });
        pushErrors([result.error]);
      } else {
        applyImport({ rateCards: result.data });
        setSlot(slotKey, { status: 'ok', rowCount: result.data.length, message: '', warnings: result.validation?.issues.filter((i: {severity: string}) => i.severity !== 'error').length ?? 0, validation: result.validation });
      }
    }
  }

  // ── Public interface ────────────────────────────────────────────────────

  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);

  const openFilePicker = useCallback((slotKey: SlotKey) => {
    setPendingSlotKey(slotKey);
    inputRef.current?.click();
  }, []);

  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingSlotKey) return;

    const slot = FILE_SLOTS.find(s => s.key === pendingSlotKey)!;
    await processFile(file, pendingSlotKey, slot.type);

    // Reset so the same file can be re-selected
    e.target.value = '';
    setPendingSlotKey(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSlotKey]);

  const onDrop = useCallback(async (
    e: React.DragEvent,
    slotKey: SlotKey,
    fileType: CsvFileType,
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file, slotKey, fileType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = useCallback(() => {
    resetToMock();
    setSlots(emptySlots());
  }, [resetToMock]);

  const downloadSample = useCallback((type: CsvFileType) => {
    const samples: Record<CsvFileType, string> = {
      workers: [
        'employee_id,name,department,manager,cost_center,status,email',
        'E-1001,Jane Smith,Engineering,Bob Lee (CTO),ENG-100,active,jane@acme.com',
        'E-1002,Carlos Rivera,Finance,Amy Chen (CFO),FIN-100,active,carlos@acme.com',
        'E-1003,Priya Patel,Marketing,Sue Kim (CMO),MKT-200,active,priya@acme.com',
      ].join('\n'),

      usage_events: [
        'event_id,employee_id,provider,product,model,event_type,tokens_in,tokens_out,gpu_hours,billed_amount,timestamp',
        'ev-001,E-1001,OpenAI,GPT-4o,gpt-4o,chat,45000,12000,0,2.85,2026-04-01T10:00:00Z',
        'ev-002,E-1001,Anthropic,Claude,claude-sonnet-4,chat,30000,8000,0,1.14,2026-04-02T14:30:00Z',
        'ev-003,E-1002,Microsoft,Copilot,copilot-m365,chat,5000,2000,0,30.00,2026-04-01T09:00:00Z',
      ].join('\n'),

      rate_cards: [
        'provider,model,unit_basis,rate,markup,effective_start,effective_end',
        'OpenAI,GPT-4o,1m_tokens,5.00,0.15,2026-01-01,2026-12-31',
        'Anthropic,claude-sonnet-4,1m_tokens,3.00,0.15,2026-01-01,2026-12-31',
        'Microsoft,copilot-m365,per_seat,30.00,0.10,2026-01-01,2026-12-31',
      ].join('\n'),
    };

    const blob = new Blob([samples[type]], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sample_${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    slots,
    expanded,
    toggleExpanded,
    inputRef,
    openFilePicker,
    onFileInputChange,
    onDrop,
    handleReset,
    downloadSample,
  };
}
