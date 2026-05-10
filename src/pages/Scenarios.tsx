/**
 * Scenarios.tsx
 *
 * Page component for saving, loading, and managing named analysis scenarios.
 * Presentational layer only — all logic in useScenarios hook.
 *
 * Hidden from primary nav during enterprise navigation consolidation.
 * Scenario management is now surfaced via Settings › Saved scenarios.
 * This component remains fully functional and is embedded in Settings.tsx.
 * localStorage scenario logic is unchanged.
 */

import React, { useState } from 'react';
import { useScenarios } from '../hooks/useScenarios';
import { useImport } from '../context/ImportContext';
import Icon from '../components/Icon';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Scenarios() {
  const { isUsingImport, imported } = useImport();
  const {
    scenarios, storageBytes,
    saveCurrentAs, loadScenario, deleteScenario, renameScenario,
  } = useScenarios();

  const [saveName,      setSaveName]      = useState('');
  const [saveMsg,       setSaveMsg]       = useState('');
  const [renamingId,    setRenamingId]    = useState<string | null>(null);
  const [renameValue,   setRenameValue]   = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleSave() {
    if (!saveName.trim()) {
      setSaveMsg('Please enter a scenario name.');
      return;
    }
    saveCurrentAs(saveName.trim());
    setSaveName('');
    setSaveMsg(`Saved "${saveName.trim()}" successfully.`);
    setTimeout(() => setSaveMsg(''), 3000);
  }

  function handleRenameSubmit(id: string) {
    if (renameValue.trim()) renameScenario(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue('');
  }

  // Summary of what's currently loaded
  const loadedFiles = [
    imported.workers     ? `${imported.workers.length} workers`            : null,
    imported.usageEvents ? `${imported.usageEvents.length} usage events`   : null,
    imported.rateCards   ? `${imported.rateCards.length} rate card entries` : null,
  ].filter(Boolean);

  return (
    <>
      {/* Save panel */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Save current scenario</div>
          <div className="card-sub">
            {isUsingImport
              ? `Current state: ${loadedFiles.join(', ')}`
              : 'No import data loaded — saving will store an empty scenario.'}
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder='e.g. "Baseline April", "Optimized Rate Cards"'
              style={{
                flex: 1, minWidth: 240,
                background: 'var(--bg-surface-2)', border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)', borderRadius: 6, padding: '7px 11px',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button
              className="btn btn-primary"
              style={{ fontSize: 12 }}
              onClick={handleSave}
            >
              <Icon name="plus" size={12} color="#0f172a" />
              Save scenario
            </button>
          </div>

          {saveMsg && (
            <div style={{
              marginTop: 10, fontSize: 12,
              color: saveMsg.startsWith('Please') ? '#f87171' : '#86efac',
            }}>
              {saveMsg}
            </div>
          )}

          {/* Preset name suggestions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {['Baseline', 'Optimized', 'Alt Rate Cards', 'Q2 Forecast'].map(preset => (
              <button
                key={preset}
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: '3px 9px', color: 'var(--text-secondary)', borderColor: 'var(--border-strong)' }}
                onClick={() => setSaveName(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Saved scenarios list */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Saved scenarios</div>
            <div className="card-sub">
              {scenarios.length} saved · {formatBytes(storageBytes)} used
            </div>
          </div>
        </div>
        <div className="card-body" style={{ padding: scenarios.length === 0 ? '24px 18px' : 0 }}>
          {scenarios.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              No scenarios saved yet. Import CSV data and save your first scenario above.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {['Name', 'Saved', 'Workers', 'Events', 'Rate cards', 'Actions'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map(sc => (
                  <tr key={sc.id}>
                    {/* Name — inline rename */}
                    <td>
                      {renamingId === sc.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameSubmit(sc.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            autoFocus
                            style={{
                              background: 'var(--bg-surface-2)', border: '1px solid #2563eb',
                              color: 'var(--text-primary)', borderRadius: 5,
                              padding: '3px 7px', fontSize: 12, fontFamily: 'inherit',
                              outline: 'none', width: 160,
                            }}
                          />
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 10, padding: '2px 7px' }}
                            onClick={() => handleRenameSubmit(sc.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 10, padding: '2px 7px' }}
                            onClick={() => setRenamingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}
                          title="Click to rename"
                          onClick={() => { setRenamingId(sc.id); setRenameValue(sc.name); }}
                        >
                          {sc.name}
                        </span>
                      )}
                    </td>

                    {/* Saved date */}
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDate(sc.savedAt)}
                    </td>

                    {/* Row counts */}
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {sc.workers?.length ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {sc.usageEvents?.length ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {sc.rateCards?.length ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: '3px 10px' }}
                          onClick={() => loadScenario(sc)}
                        >
                          <Icon name="refresh" size={11} color="#93c5fd" />
                          Load
                        </button>

                        {confirmDelete === sc.id ? (
                          <>
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: 11, padding: '3px 9px' }}
                              onClick={() => { deleteScenario(sc.id); setConfirmDelete(null); }}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 11, padding: '3px 9px' }}
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 11, padding: '3px 9px', color: 'var(--text-secondary)' }}
                            onClick={() => setConfirmDelete(sc.id)}
                          >
                            <Icon name="x" size={11} color="#64748b" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
