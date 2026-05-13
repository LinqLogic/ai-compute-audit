import React, { useState, useMemo } from 'react';
import { GovernanceException } from '../data/types';
import { useDomain } from '../context/DomainContext';
import { generateGovernanceExceptions } from '../analytics/governanceExceptions';
import Icon from '../components/Icon';

type ActionType = 'approve' | 'escalate' | 'request';

// ─── Severity styling helpers ─────────────────────────────────────────────────

function sevColor(s: GovernanceException['severity']): string {
  return s === 'critical' ? '#ef4444' : s === 'high' ? '#f59e0b' : '#3b82f6';
}
function sevBg(s: GovernanceException['severity']): string {
  return s === 'critical' ? 'rgba(239,68,68,0.10)' : s === 'high' ? 'rgba(245,158,11,0.10)' : 'rgba(59,130,246,0.10)';
}
function sevBadge(s: GovernanceException['severity']): string {
  return s === 'critical' ? 'badge-danger' : s === 'high' ? 'badge-warn' : 'badge-info';
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalState { exception: GovernanceException; action: ActionType }

function Modal({ modal, onClose, onConfirm }: {
  modal: ModalState;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = React.useState('');
  const { exception: ex, action } = modal;
  const isCritical = ex.severity === 'critical';

  const configs = {
    approve: {
      title:        'Approve with note',
      desc:         `You are approving this exception for ${ex.entityName}. Add a note to record your justification — this will be stamped to the audit ledger.`,
      label:        'Approval note',
      placeholder:  'e.g. Confirmed with manager. Usage is project-justified for Q2 deliverable.',
      confirmLabel: 'Approve & record',
      btnClass:     'btn-primary',
    },
    escalate: {
      title:        isCritical ? 'Send to CFO for review' : 'Escalate exception',
      desc:         isCritical
        ? 'This exception requires CFO sign-off before the month can be locked. Add context to help the CFO make a decision.'
        : 'Escalating will route this to the CFO queue and prevent month lock until resolved.',
      label:        'Escalation note',
      placeholder:  'e.g. Unable to verify business justification. Routing to CFO for final decision.',
      confirmLabel: isCritical ? 'Send to CFO' : 'Escalate',
      btnClass:     'btn-danger',
    },
    request: {
      title:        'Request information',
      desc:         ex.manager
        ? `A request will be sent to ${ex.manager} asking for supporting documentation or clarification.`
        : `A request will be sent to the department for supporting documentation.`,
      label:        'What information is needed?',
      placeholder:  'e.g. Please provide a business justification for the AI tool usage this period.',
      confirmLabel: 'Send request',
      btnClass:     'btn-primary',
    },
  };

  const c = configs[action];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '28px 28px 24px',
          width: 500, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{c.desc}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '0 2px', marginLeft: 12, flexShrink: 0 }}
          >×</button>
        </div>

        <div style={{
          background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>
            {ex.entityName}
            {ex.entityType === 'employee' && ` · ${ex.department} (${ex.costCenter})`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            {ex.governanceInterpretation}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            display: 'block', marginBottom: 6,
          }}>{c.label}</label>
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={c.placeholder}
            rows={3}
            style={{
              width: '100%', background: 'var(--bg-input)',
              border: '1px solid var(--border-strong)', borderRadius: 8,
              padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
              fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.55,
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.10)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onClose}>Cancel</button>
          <button className={`btn ${c.btnClass}`} style={{ fontSize: 12 }} onClick={() => onConfirm(note)}>
            {c.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exception card ───────────────────────────────────────────────────────────

function ExceptionCard({ ex, requested, onAction }: {
  ex: GovernanceException;
  requested: string[];
  onAction: (action: ActionType) => void;
}) {
  const color = sevColor(ex.severity);

  return (
    <div className="exception-item" style={{ borderLeft: `3px solid ${color}`, alignItems: 'flex-start' }}>
      <div className="exc-icon" style={{ background: sevBg(ex.severity), flexShrink: 0, marginTop: 2 }}>
        <Icon name="alert" size={14} color={color} />
      </div>

      <div className="exc-meta" style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3, gap: 12 }}>
          <div className="exc-title" style={{ flex: 1 }}>
            {ex.entityName}
            {ex.entityType === 'employee'     && ` — ${ex.department} (${ex.costCenter})`}
            {ex.entityType === 'department'   && ` — Department`}
            {ex.entityType === 'organization' && ` — All Departments`}
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <span className={`badge ${sevBadge(ex.severity)}`} style={{ fontSize: 10 }}>
              {ex.severity.charAt(0).toUpperCase() + ex.severity.slice(1)}
            </span>
            <span className="badge" style={{
              background: 'var(--bg-surface-3)', color: 'var(--text-secondary)',
              fontSize: 10, fontFamily: 'monospace',
            }}>
              {ex.ruleId} · {ex.ruleName}
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>
          {ex.title}
        </div>

        {/* Evidence block */}
        <div style={{
          background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '8px 12px', marginBottom: 10,
        }}>
          {/* Input data */}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 7, fontSize: 12 }}>
            {ex.inputData.map(d => (
              <span key={d.label}>
                <span style={{ color: 'var(--text-secondary)' }}>{d.label}: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.value}</span>
              </span>
            ))}
          </div>
          {/* Threshold comparison */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>{ex.thresholdComparison.metricLabel}:</span>
            <span style={{ color, fontWeight: 700 }}>{ex.thresholdComparison.actual}</span>
            <span style={{ color: 'var(--text-muted)' }}>vs threshold</span>
            <span style={{ color: 'var(--text-secondary)' }}>{ex.thresholdComparison.threshold}</span>
            <span style={{ color, fontWeight: 600 }}>✕ Exceeded</span>
          </div>
        </div>

        {/* Governance interpretation */}
        <div className="exc-desc" style={{ lineHeight: 1.65, marginBottom: 10 }}>
          {ex.governanceInterpretation}
        </div>

        {/* Recommended actions (top 2) */}
        {ex.recommendedActions.length > 0 && (
          <div style={{ marginBottom: 11, fontSize: 11 }}>
            <div style={{
              fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, marginBottom: 4,
            }}>Recommended actions</div>
            {ex.recommendedActions.slice(0, 2).map((a, i) => (
              <div key={i} style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>· {a}</div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="exc-actions">
          <button className="exc-btn approve" onClick={() => onAction('approve')}>
            Approve with note
          </button>
          <button className="exc-btn escalate" onClick={() => onAction('escalate')}>
            {ex.severity === 'critical' ? 'Send to CFO' : 'Escalate'}
          </button>
          <button
            className="exc-btn"
            style={{
              color:       requested.includes(ex.id) ? 'var(--color-info)'        : 'var(--text-tertiary)',
              borderColor: requested.includes(ex.id) ? 'var(--color-info-border)' : 'var(--border-strong)',
              background:  requested.includes(ex.id) ? 'var(--color-info-bg)'     : 'transparent',
            }}
            onClick={() => !requested.includes(ex.id) && onAction('request')}
          >
            {requested.includes(ex.id) ? '✓ Info requested' : 'Request info'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Exceptions() {
  const { employees, deptSpend } = useDomain();

  const allExceptions = useMemo(
    () => generateGovernanceExceptions(employees, deptSpend),
    [employees, deptSpend],
  );

  const [resolved,       setResolved]       = useState<string[]>([]);
  const [escalated,      setEscalated]      = useState<string[]>([]);
  const [requested,      setRequested]      = useState<string[]>([]);
  const [modal,          setModal]          = useState<ModalState | null>(null);
  const [toast,          setToast]          = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [deptFilter,     setDeptFilter]     = useState<string>('all');

  const depts = useMemo(
    () => Array.from(new Set(allExceptions.map(e => e.department)))
      .filter(d => d && d !== 'All Departments')
      .sort(),
    [allExceptions],
  );

  const filtered = useMemo(() => allExceptions.filter(ex => {
    if (severityFilter !== 'all' && ex.severity !== severityFilter) return false;
    if (deptFilter     !== 'all' && ex.department !== deptFilter)    return false;
    return true;
  }), [allExceptions, severityFilter, deptFilter]);

  const open   = filtered.filter(e => !resolved.includes(e.id) && !escalated.includes(e.id));
  const closed = filtered.filter(e => resolved.includes(e.id));
  const esc    = filtered.filter(e => escalated.includes(e.id));

  const criticalCount = allExceptions.filter(e =>
    e.severity === 'critical' && !resolved.includes(e.id) && !escalated.includes(e.id)
  ).length;
  const highCount = allExceptions.filter(e =>
    e.severity === 'high' && !resolved.includes(e.id) && !escalated.includes(e.id)
  ).length;
  const escCount = escalated.length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleConfirm(note: string) {
    if (!modal) return;
    const { exception, action } = modal;
    if (action === 'approve') {
      setResolved(prev => [...prev, exception.id]);
      showToast(`Exception for ${exception.entityName} approved and recorded to audit ledger.`);
    } else if (action === 'escalate') {
      setEscalated(prev => [...prev, exception.id]);
      showToast(`Exception for ${exception.entityName} escalated to CFO queue.`);
    } else if (action === 'request') {
      setRequested(prev => [...prev, exception.id]);
      showToast(`Information request sent for ${exception.entityName}.`);
    }
    setModal(null);
  }

  function exportQueue() {
    const rows = allExceptions.map(e => [
      e.id, `"${e.entityName}"`, `"${e.department}"`, e.costCenter,
      e.severity, e.ruleId, `"${e.ruleName}"`,
      `"${e.governanceInterpretation.replace(/"/g, "'")}"`,
    ].join(','));
    const csv  = ['id,entity,department,cost_center,severity,rule_id,rule_name,interpretation', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'governance-exceptions.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Governance exception queue exported as CSV.');
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: 'var(--text-primary)', color: '#fff',
          borderRadius: 8, padding: '10px 18px', fontSize: 13,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)', maxWidth: 400,
          lineHeight: 1.5, animation: 'fadeInUp 0.2s ease',
        }}>{toast}</div>
      )}

      {modal && <Modal modal={modal} onClose={() => setModal(null)} onConfirm={handleConfirm} />}

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
            Governance exception queue
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {open.length} open · {closed.length} resolved
            {escCount > 0 ? ` · ${escCount} escalated to CFO` : ''}
            {' · mathematically derived from current dataset'}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={exportQueue} style={{ flexShrink: 0 }}>
          <Icon name="download" size={12} color="#94a3b8" />
          Export queue
        </button>
      </div>

      {/* Stats + filters row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Open',      value: open.length,    color: 'var(--text-primary)' },
            { label: 'Critical',  value: criticalCount,  color: '#ef4444' },
            { label: 'High',      value: highCount,      color: '#f59e0b' },
            { label: 'Escalated', value: escCount,       color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', minWidth: 44 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'critical', 'high', 'medium'].map(s => (
            <button
              key={s}
              className="btn btn-ghost"
              style={{
                fontSize: 11, padding: '3px 10px',
                background:  severityFilter === s ? 'var(--bg-surface-3)' : 'transparent',
                color:       severityFilter === s ? 'var(--text-primary)'  : 'var(--text-secondary)',
                borderColor: severityFilter === s ? 'var(--border-strong)' : 'var(--border)',
              }}
              onClick={() => setSeverityFilter(s)}
            >
              {s === 'all' ? 'All severities' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {depts.length > 1 && (
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              style={{
                background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', borderRadius: 6,
                padding: '3px 8px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              <option value="all">All departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* All-clear state */}
      {allExceptions.length === 0 && (
        <div style={{
          background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '24px 20px', color: 'var(--color-success)',
          fontSize: 13, marginBottom: 16, lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>✓ No mathematically significant exceptions detected.</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            The governance engine evaluates spend variance, peer outliers, department budgets, risk scores,
            usage concentration, and token efficiency. Import employee or usage data to enable exception generation.
          </div>
        </div>
      )}

      {/* Filter empty state */}
      {allExceptions.length > 0 && filtered.length === 0 && (
        <div style={{
          background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '20px 18px', color: 'var(--text-secondary)',
          fontSize: 13, marginBottom: 16, textAlign: 'center',
        }}>
          No exceptions match the current filters.
        </div>
      )}

      {/* Session all-resolved */}
      {filtered.length > 0 && open.length === 0 && esc.length === 0 && (
        <div style={{
          background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '20px 18px', color: 'var(--color-success)',
          fontSize: 13, marginBottom: 16,
        }}>
          ✓ All visible exceptions have been resolved. Ready to proceed to month lock.
        </div>
      )}

      {/* Open exceptions */}
      {open.map(ex => (
        <ExceptionCard
          key={ex.id}
          ex={ex}
          requested={requested}
          onAction={action => setModal({ exception: ex, action })}
        />
      ))}

      {/* Escalated */}
      {esc.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Escalated to CFO queue
          </div>
          {esc.map(ex => (
            <div key={ex.id} className="exception-item" style={{ opacity: 0.6, borderColor: 'var(--color-danger-border)', borderLeft: '3px solid #ef4444' }}>
              <div className="exc-icon esc">
                <Icon name="alert" size={14} color="#ef4444" />
              </div>
              <div className="exc-meta">
                <div className="exc-title">
                  {ex.entityName}
                  {ex.entityType === 'employee' && ` — ${ex.department} (${ex.costCenter})`}
                </div>
                <div className="exc-desc">{ex.title}</div>
              </div>
              <span className="badge badge-danger">CFO Queue</span>
            </div>
          ))}
        </>
      )}

      {/* Resolved */}
      {closed.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Resolved this session
          </div>
          {closed.map(ex => (
            <div key={ex.id} className="exception-item" style={{ opacity: 0.45 }}>
              <div className="exc-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <Icon name="check" size={14} color="#22c55e" />
              </div>
              <div className="exc-meta">
                <div className="exc-title" style={{ textDecoration: 'line-through' }}>
                  {ex.entityName}
                  {ex.entityType === 'employee' && ` — ${ex.department} (${ex.costCenter})`}
                </div>
                <div className="exc-desc">{ex.title}</div>
              </div>
              <span className="badge badge-ok">Resolved</span>
            </div>
          ))}
        </>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
