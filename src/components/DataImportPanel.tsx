/**
 * DataImportPanel.tsx
 *
 * Purely presentational component.
 * All upload, parsing, validation, and state logic lives in useCsvImport.
 *
 * Renders:
 *   - Collapsed header strip with source indicator pill
 *   - Expanded panel with three file slots, drag-and-drop, status badges
 *   - Sample CSV download buttons
 */

import React from 'react';
import Icon from './Icon';
import {
  useCsvImport,
  FILE_SLOTS,
  SlotKey,
  SlotStatus,
} from '../hooks/useCsvImport';
import { useImport } from '../context/ImportContext';
import { CsvFileType } from '../types/csvRows';

// ─── Status badge map ────────────────────────────────────────────────────────

const STATUS_BADGES: Record<SlotStatus, React.ReactNode> = {
  idle:    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No file</span>,
  loading: <span style={{ color: 'var(--accent)', fontSize: 11 }}>Parsing…</span>,
  ok:      <span className="badge badge-ok"     style={{ fontSize: 10 }}>✓ Loaded</span>,
  error:   <span className="badge badge-danger" style={{ fontSize: 10 }}>Error</span>,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DataImportPanel() {
  const { isUsingImport } = useImport();
  const {
    slots, expanded, toggleExpanded,
    inputRef, openFilePicker, onFileInputChange,
    onDrop, handleReset, downloadSample,
  } = useCsvImport();

  return (
    <div style={{ marginBottom: 20 }}>
      {/* ── Collapsed header strip ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          border: `1px solid ${isUsingImport ? 'var(--color-success-border)' : 'var(--border)'}`,
          borderRadius: expanded ? '8px 8px 0 0' : 8,
          padding: '10px 14px',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onClick={toggleExpanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="database" size={14} color={isUsingImport ? '#22c55e' : '#475569'} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            CSV data import
          </span>
          <SourcePill isUsingImport={isUsingImport} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isUsingImport && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '3px 10px' }}
              onClick={e => { e.stopPropagation(); handleReset(); }}
            >
              Reset to demo
            </button>
          )}
          <Icon name="filter" size={12} color="#475569" />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{expanded ? 'Hide' : 'Show'}</span>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: 16,
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
            Upload CSV files to replace demo data. Drag a file onto a slot or click{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Choose file</strong>.
            Partial uploads are supported — unloaded files fall back to demo data.
          </p>

          {/* File slots */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {FILE_SLOTS.map(slot => {
              const state = slots[slot.key];
              return (
                <FileSlotCard
                  key={slot.key}
                  label={slot.label}
                  columns={slot.columns}
                  slotKey={slot.key}
                  fileType={slot.type}
                  state={state}
                  onDrop={onDrop}
                  onChoose={openFilePicker}
                />
              );
            })}
          </div>

          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />

          {/* Sample CSV downloads */}
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {FILE_SLOTS.map(slot => (
              <button
                key={slot.key}
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: '3px 9px', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                onClick={() => downloadSample(slot.type)}
              >
                <Icon name="download" size={10} color="#475569" />
                Sample {slot.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SourcePill({ isUsingImport }: { isUsingImport: boolean }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 4,
        fontWeight: 500,
        background: isUsingImport ? 'rgba(34,197,94,.1)'           : 'rgba(251,191,36,.08)',
        border:     isUsingImport ? '1px solid var(--color-success-border)' : '1px solid var(--color-warn-border)',
        color:      isUsingImport ? '#86efac'                       : '#fde68a',
      }}
    >
      {isUsingImport ? '● Imported data active' : '● Demo data active'}
    </span>
  );
}

interface FileSlotCardProps {
  label:    string;
  columns:  string;
  slotKey:  SlotKey;
  fileType: CsvFileType;
  state:    ReturnType<typeof useCsvImport>['slots'][SlotKey];
  onDrop:   (e: React.DragEvent, key: SlotKey, type: CsvFileType) => void;
  onChoose: (key: SlotKey) => void;
}

function FileSlotCard({
  label, columns, slotKey, fileType, state, onDrop, onChoose,
}: FileSlotCardProps) {
  const borderColor =
    state.status === 'ok'    ? 'rgba(34,197,94,.35)'  :
    state.status === 'error' ? 'rgba(220,38,38,.35)' : 'var(--border-strong)';

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => onDrop(e, slotKey, fileType)}
      style={{
        background:   'var(--bg-surface)',
        border:       `1px dashed ${borderColor}`,
        borderRadius: 7,
        padding:      '12px 13px',
        transition:   'border-color 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
          {label}
        </span>
        {STATUS_BADGES[state.status]}
      </div>

      {/* Column hint */}
      <div style={{ fontSize: 10, color: '#334155', lineHeight: 1.55, marginBottom: 10, wordBreak: 'break-word' }}>
        {columns}
      </div>

      {/* Row count + warnings */}
      {state.status === 'ok' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {state.rowCount.toLocaleString()} rows · {state.filename}
          </div>
          {state.warnings > 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-warn)', lineHeight: 1.5 }}>
              ⚠ {state.warnings} validation warning{state.warnings > 1 ? 's' : ''} — data loaded, review issues.
            </div>
          )}
          {state.validation && state.validation.issues.slice(0, 2).map((issue, i) => (
            <div key={i} style={{ fontSize: 10, color: issue.severity === 'error' ? '#f87171' : '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
              Row {issue.row}: {issue.message}
            </div>
          ))}
          {state.validation && state.validation.issues.length > 2 && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              +{state.validation.issues.length - 2} more issues
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {state.status === 'error' && (
        <div style={{ fontSize: 11, color: 'var(--color-danger)', marginBottom: 8, lineHeight: 1.5 }}>
          {state.message}
        </div>
      )}

      {/* Action button */}
      <button
        className="btn btn-ghost"
        style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '5px 0' }}
        onClick={() => onChoose(slotKey)}
        disabled={state.status === 'loading'}
      >
        <Icon name="plus" size={11} color="#64748b" />
        {state.status === 'ok' ? 'Replace file' : 'Choose file'}
      </button>
    </div>
  );
}
