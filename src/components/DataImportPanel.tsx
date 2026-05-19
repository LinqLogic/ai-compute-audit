/**
 * DataImportPanel.tsx  —  Phase 2 unified enterprise intake UI
 *
 * Replaces the three-slot grid with a single drop zone that accepts any number
 * of CSV files.  Each file is processed by the ingestion pipeline (vendor/schema
 * detection) with a legacy column-matching fallback.  Results are shown in a
 * per-file list with a combined domain summary below.
 *
 * Internal slot/domain state (workers / usageEvents / rateCards) is unchanged.
 * The old useCsvImport hook is preserved and can still be imported by other code.
 */

import React, { useState } from 'react';
import Icon from './Icon';
import { useImport } from '../context/ImportContext';
import { CsvFileType } from '../types/csvRows';
import {
  useEnterpriseIntake,
  IntakeResult,
  IntakeStatus,
  SCHEMA_DISPLAY,
} from '../hooks/useEnterpriseIntake';
import { useQuota } from '../hooks/useQuota';

// ─── Status display config ────────────────────────────────────────────────────

const STATUS_CFG: Record<IntakeStatus, { label: string; color: string; bg: string }> = {
  processing:   { label: 'Parsing…',       color: 'var(--accent)',        bg: 'rgba(37,99,235,.1)'   },
  imported:     { label: 'Imported',        color: '#16a34a',              bg: 'rgba(22,163,74,.1)'   },
  adapted:      { label: 'Adapted',         color: 'var(--accent)',        bg: 'rgba(37,99,235,.1)'   },
  fallback:     { label: 'Fallback',        color: '#d97706',              bg: 'rgba(217,119,6,.1)'   },
  failed:       { label: 'Failed',          color: 'var(--color-danger)',  bg: 'rgba(220,38,38,.1)'   },
  unrecognised: { label: 'Not recognised',  color: '#d97706',              bg: 'rgba(217,119,6,.1)'   },
};

const SUCCESS_STATUSES: IntakeStatus[] = ['imported', 'adapted', 'fallback'];

const SAMPLE_SLOTS: { type: CsvFileType; label: string }[] = [
  { type: 'workers',      label: 'Employee roster' },
  { type: 'usage_events', label: 'Usage events'    },
  { type: 'rate_cards',   label: 'Rate cards'      },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function DataImportPanel() {
  const { isUsingImport } = useImport();
  const {
    results, isProcessing,
    expanded, toggleExpanded,
    inputRef, onFileInputChange, onZoneDrop,
    handleReset, downloadSample,
  } = useEnterpriseIntake();
  const { importsUsed, importsLimit, importsExceeded } = useQuota();

  return (
    <div style={{ marginBottom: 20 }}>
      {/* ── Collapsed header strip ── */}
      <div
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          background:      '#fff',
          border:          `1px solid ${isUsingImport ? 'var(--color-success-border)' : 'var(--border)'}`,
          borderRadius:    expanded ? '8px 8px 0 0' : 8,
          padding:         '10px 14px',
          cursor:          'pointer',
          transition:      'border-color 0.2s',
        }}
        onClick={toggleExpanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="database" size={14} color={isUsingImport ? '#22c55e' : '#475569'} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Enterprise AI Data Intake
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
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {expanded ? 'Hide' : 'Show'}
          </span>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div
          style={{
            background:   '#fff',
            border:       '1px solid var(--border)',
            borderTop:    'none',
            borderRadius: '0 0 8px 8px',
            padding:      16,
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
            Upload one or more AI vendor exports. The system will detect vendor, schema, and record
            type automatically. Partial uploads are supported — domains without an uploaded file
            continue using demo data.
          </p>

          {/* ── Quota indicator ── */}
          {importsLimit < Infinity && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10, padding: '6px 10px',
              background: importsExceeded ? 'rgba(239,68,68,.08)' : 'rgba(37,99,235,.06)',
              borderRadius: 6, fontSize: 11, color: importsExceeded ? '#ef4444' : 'var(--text-secondary)',
            }}>
              <span>Imports this month: <strong>{importsUsed} / {importsLimit}</strong></span>
              {importsExceeded && <span style={{ fontWeight: 600 }}>Quota reached — upgrade to import more</span>}
            </div>
          )}

          {/* ── Drop zone ── */}
          <DropZone
            inputRef={inputRef}
            isProcessing={isProcessing}
            onZoneDrop={onZoneDrop}
          />

          {/* ── Hidden multi-file input ── */}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />

          {/* ── Per-file results ── */}
          {results.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
              }}>
                Processed files
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                {results.map((r, i) => (
                  <IntakeResultRow
                    key={r.id}
                    result={r}
                    isLast={i === results.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Domain summary ── */}
          {results.some(r => SUCCESS_STATUSES.includes(r.status)) && (
            <ImportSummary results={results} />
          )}

          {/* ── Sample downloads ── */}
          <div style={{ marginTop: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
            }}>
              Download templates
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SAMPLE_SLOTS.map(s => (
                <button
                  key={s.type}
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: '3px 9px', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                  onClick={() => downloadSample(s.type)}
                >
                  <Icon name="download" size={10} color="#475569" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({
  inputRef,
  isProcessing,
  onZoneDrop,
}: {
  inputRef:       React.RefObject<HTMLInputElement | null>;
  isProcessing:   boolean;
  onZoneDrop:     (e: React.DragEvent) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { setIsDragOver(false); onZoneDrop(e); }}
      onClick={() => !isProcessing && inputRef.current?.click()}
      style={{
        border:       `2px dashed ${isDragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
        borderRadius: 8,
        padding:      '28px 16px',
        textAlign:    'center',
        background:   isDragOver ? 'rgba(37,99,235,.04)' : 'var(--bg-surface)',
        transition:   'all 0.15s',
        cursor:       isProcessing ? 'default' : 'pointer',
        userSelect:   'none',
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 8, color: isDragOver ? 'var(--accent)' : '#94a3b8' }}>
        ⬆
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
        {isProcessing ? 'Processing files…' : 'Drop CSV files here or click to browse'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        OpenAI · Anthropic · Azure · Google Gemini · Standard CSV
        <br />
        Multiple files supported
      </div>
    </div>
  );
}

// ─── Per-file result row ──────────────────────────────────────────────────────

function IntakeResultRow({ result, isLast }: { result: IntakeResult; isLast: boolean }) {
  const cfg = STATUS_CFG[result.status];

  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           10,
      padding:       '7px 12px',
      borderBottom:  isLast ? 'none' : '1px solid var(--border)',
      background:    '#fff',
    }}>
      {/* Filename */}
      <span style={{
        flex:        1,
        fontFamily:  'monospace',
        fontSize:    11,
        color:       'var(--text-primary)',
        overflow:    'hidden',
        textOverflow:'ellipsis',
        whiteSpace:  'nowrap',
        minWidth:    0,
      }}>
        {result.filename}
      </span>

      {/* Vendor */}
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 96, flexShrink: 0 }}>
        {result.vendorLabel}
      </span>

      {/* Schema / record type */}
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 110, flexShrink: 0 }}>
        {result.status === 'processing' ? '—' : result.schemaLabel}
      </span>

      {/* Row count */}
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 64, textAlign: 'right', flexShrink: 0 }}>
        {result.status === 'processing' ? '…' : `${result.rowsProcessed.toLocaleString()} rows`}
      </span>

      {/* Warnings */}
      <span style={{
        fontSize:   11,
        color:      result.warningCount > 0 ? '#d97706' : 'var(--text-muted)',
        minWidth:   48,
        textAlign:  'right',
        flexShrink: 0,
      }}>
        {result.warningCount > 0 ? `⚠ ${result.warningCount}` : '—'}
      </span>

      {/* Status badge */}
      <span style={{
        fontSize:     10,
        fontWeight:   500,
        padding:      '2px 8px',
        borderRadius: 4,
        color:        cfg.color,
        background:   cfg.bg,
        minWidth:     90,
        textAlign:    'center',
        flexShrink:   0,
      }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Import summary ───────────────────────────────────────────────────────────

function ImportSummary({ results }: { results: IntakeResult[] }) {
  const successful = results.filter(r => SUCCESS_STATUSES.includes(r.status));

  const lastWorker   = [...successful].reverse().find(r => r.schemaRaw === 'workers');
  const lastUsage    = [...successful].reverse().find(r => r.schemaRaw === 'usage');
  const lastRateCard = [...successful].reverse().find(r => r.schemaRaw === 'rate_cards');

  const totalWarnings = results.reduce((s, r) => s + r.warningCount, 0);

  const usingDemoFor = [
    !lastWorker   && 'employee roster',
    !lastUsage    && 'usage records',
    !lastRateCard && 'rate cards',
  ].filter(Boolean) as string[];

  return (
    <div style={{
      marginTop:    10,
      padding:      '8px 12px',
      background:   'var(--bg-surface)',
      border:       '1px solid var(--border)',
      borderRadius: 6,
      display:      'flex',
      gap:          14,
      flexWrap:     'wrap',
      alignItems:   'center',
      fontSize:     11,
    }}>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Summary</span>

      {lastWorker && (
        <span style={{ color: 'var(--text-secondary)' }}>
          {lastWorker.rowsProcessed.toLocaleString()} {SCHEMA_DISPLAY.workers.toLowerCase()}
        </span>
      )}
      {lastUsage && (
        <span style={{ color: 'var(--text-secondary)' }}>
          {lastUsage.rowsProcessed.toLocaleString()} {SCHEMA_DISPLAY.usage.toLowerCase()}
        </span>
      )}
      {lastRateCard && (
        <span style={{ color: 'var(--text-secondary)' }}>
          {lastRateCard.rowsProcessed.toLocaleString()} {SCHEMA_DISPLAY.rate_cards.toLowerCase()}
        </span>
      )}

      {totalWarnings > 0 && (
        <span style={{ color: '#d97706' }}>⚠ {totalWarnings} warning{totalWarnings > 1 ? 's' : ''}</span>
      )}

      {usingDemoFor.length > 0 && (
        <span style={{ color: 'var(--text-muted)' }}>
          Using demo data for: {usingDemoFor.join(', ')}
        </span>
      )}
    </div>
  );
}

// ─── Source pill ──────────────────────────────────────────────────────────────

function SourcePill({ isUsingImport }: { isUsingImport: boolean }) {
  return (
    <span style={{
      fontSize:   10,
      padding:    '2px 8px',
      borderRadius: 4,
      fontWeight: 500,
      background: isUsingImport ? 'var(--color-success-bg)' : 'var(--color-warn-bg)',
      border:     isUsingImport ? '1px solid var(--color-success-border)' : '1px solid var(--color-warn-border)',
      color:      isUsingImport ? 'var(--color-success)' : 'var(--color-warn)',
    }}>
      {isUsingImport ? '● Imported data active' : '● Demo data active'}
    </span>
  );
}
