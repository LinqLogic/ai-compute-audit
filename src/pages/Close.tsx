import React, { useState } from 'react';
import { connectors, financeOutputs, closeSteps } from '../data/mockData';
import Icon from '../components/Icon';

const STEP_EXPLANATIONS: Record<string, { what: string; status: string; action?: string }> = {
  'Ingest sources':    { what: 'Provider billing and API usage feeds were pulled into the system.', status: 'Completed automatically' },
  'Normalize usage':   { what: 'Raw token/seat/GPU data was normalized to a common unit model.', status: 'Completed automatically' },
  'Match identities':  { what: 'Usage events were matched to employee records from Workday HRIS.', status: 'Completed — 2,115 employees matched' },
  'Apply rate cards':  { what: 'Cost per employee was calculated using your configured rate cards.', status: 'Completed — rates applied to all providers' },
  'Policy checks':     { what: 'Automated rules are running to flag spend anomalies and policy violations.', status: 'In progress — 5 exceptions flagged', action: 'Review exceptions in the Exceptions tab' },
  'Review exceptions': { what: 'Finance reviewers must approve, escalate, or dismiss each flagged exception.', status: 'Waiting — 5 exceptions need review', action: 'Go to Exceptions tab to action each item' },
  'Approve overrides': { what: 'Any manual spend overrides or allocation changes must be approved.', status: 'Pending — blocked by exception review' },
  'Lock month':        { what: 'Locks the period so no further changes can be made. Generates finance outputs.', status: 'Pending — blocked by prior steps', action: 'All exceptions must be resolved before locking' },
};

export default function Close() {
  const [expandedStep, setExpandedStep] = useState<string | null>('Policy checks');
  const completedSteps = closeSteps.filter(s => s.done).length;
  const progressPct    = Math.round((completedSteps / closeSteps.length) * 100);

  return (
    <>
      {/* Header card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">April 2026 monthly close</div>
              <div className="card-sub">{completedSteps} of {closeSteps.length} stages complete · policy checks in progress</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger" style={{ fontSize: 12 }}>
                <Icon name="lock" size={12} color="#b91c1c" />
                Lock month
              </button>
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Close progress</span>
              <span style={{ fontWeight: 600, color: progressPct === 100 ? 'var(--color-success)' : 'var(--text-primary)' }}>{progressPct}%</span>
            </div>
            <div style={{ height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: '#2563eb', borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {/* Stepper — clickable */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Click any step to see details
          </div>
          <div className="stepper" style={{ marginBottom: 0 }}>
            {closeSteps.map((s, i) => (
              <div
                key={i}
                className={`step${s.done ? ' done' : ''}${s.active ? ' active' : ''}`}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setExpandedStep(expandedStep === s.label ? null : s.label)}
              >
                <div className="step-num">
                  {s.done ? '✓ Done' : s.active ? '● Active' : `Step ${i + 1}`}
                </div>
                <div className="step-name">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Step detail panel */}
          {expandedStep && STEP_EXPLANATIONS[expandedStep] && (
            <div style={{
              marginTop: 12,
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px 18px',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {expandedStep}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 6 }}>
                {STEP_EXPLANATIONS[expandedStep].what}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                  background: STEP_EXPLANATIONS[expandedStep].action ? '#f59e0b' : '#22c55e',
                }} />
                {STEP_EXPLANATIONS[expandedStep].status}
              </div>
              {STEP_EXPLANATIONS[expandedStep].action && (
                <div style={{
                  marginTop: 10,
                  background: 'var(--color-info-bg)',
                  border: '1px solid var(--color-info-border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'var(--color-info)',
                }}>
                  → {STEP_EXPLANATIONS[expandedStep].action}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="page-close-grid">
        {/* Source ingestion */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="card-title">Source ingestion status</div>
                <div className="card-sub">Provider billing and API usage feeds</div>
              </div>
              <div style={{ display: 'flex', gap: 5, fontSize: 11, flexShrink: 0 }}>
                <span style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                  6 connected
                </span>
                <span style={{ background: 'var(--color-warn-bg)', color: 'var(--color-warn)', border: '1px solid var(--color-warn-border)', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>
                  2 degraded
                </span>
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: '0 var(--sp-6)' }}>
            {connectors.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i < connectors.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.type}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                  <span style={{ color: c.color, fontWeight: 500 }}>{c.status}</span>
                  {c.status === 'Degraded' && (
                    <span style={{ fontSize: 10, color: 'var(--color-warn)', background: 'var(--color-warn-bg)', border: '1px solid var(--color-warn-border)', borderRadius: 4, padding: '1px 5px' }}>
                      Partial data
                    </span>
                  )}
                  {c.status === 'Pending' && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>
                      Not configured
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finance outputs */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Finance outputs</div>
            <div className="card-sub">Deliverables generated when the month is locked</div>
          </div>
          <div className="card-body" style={{ padding: '0 var(--sp-6)' }}>
            {financeOutputs.map((o, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 0', borderBottom: i < financeOutputs.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{o.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.type}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${o.status === 'Ready' ? 'badge-ok' : 'badge-info'}`}>
                    {o.status}
                  </span>
                  {o.status === 'Ready' && (
                    <button className="btn btn-ghost" style={{ fontSize: 11, height: 24, padding: '0 8px' }}>
                      <Icon name="download" size={10} color="#94a3b8" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What happens at lock */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">What happens when you lock the month?</div>
          <div className="card-sub">The lock is irreversible. Here is exactly what it does.</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icon: '🔒', title: 'Period frozen', desc: 'No further spend entries, rate card changes, or employee edits can be made for April 2026.' },
              { icon: '📄', title: 'Outputs generated', desc: 'Chargeback journal, showback report, department packs, and audit ledger snapshot are produced.' },
              { icon: '📬', title: 'Distribution sent', desc: 'Department packs emailed to each manager. ERP import file made available for download.' },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 14,
            background: 'var(--color-warn-bg)', border: '1px solid var(--color-warn-border)',
            borderRadius: 8, padding: '12px 16px',
            fontSize: 12, color: 'var(--color-warn)', lineHeight: 1.65,
          }}>
            <strong>Before you can lock:</strong> All 5 open exceptions must be resolved or escalated. 1 item requires CFO approval. Navigate to the <strong>Exceptions</strong> tab to complete the review.
          </div>
        </div>
      </div>
    </>
  );
}
