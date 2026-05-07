import React, { useState } from 'react';
import { exceptions as initialExceptions } from '../data/mockData';
import { Exception } from '../data/types';
import Icon from '../components/Icon';

type ActionType = 'approve' | 'escalate' | 'request' | null;

interface ModalState {
  exception: Exception;
  action: ActionType;
}

function Modal({ modal, onClose, onConfirm }: {
  modal: ModalState;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = React.useState('');
  const ex = modal.exception;

  const configs = {
    approve: {
      title: 'Approve with note',
      desc: `You are approving the exception for ${ex.emp}. Add a note to record your justification — this will be stamped to the audit ledger.`,
      label: 'Approval note',
      placeholder: 'e.g. Confirmed with manager. Usage is project-justified for Q2 deliverable.',
      confirmLabel: 'Approve & record',
      btnClass: 'btn-primary',
    },
    escalate: {
      title: ex.level === 'Escalate' ? 'Send to CFO for review' : 'Escalate exception',
      desc: ex.level === 'Escalate'
        ? 'This exception requires CFO sign-off before the month can be locked. Add context to help the CFO make a decision.'
        : 'Escalating will route this to the CFO queue and prevent month lock until resolved.',
      label: 'Escalation note',
      placeholder: 'e.g. Unable to verify business justification. Routing to CFO for final decision.',
      confirmLabel: ex.level === 'Escalate' ? 'Send to CFO' : 'Escalate',
      btnClass: 'btn-danger',
    },
    request: {
      title: 'Request information',
      desc: `A request will be sent to ${ex.emp}'s manager asking them to provide supporting documentation or clarification.`,
      label: 'What information is needed?',
      placeholder: 'e.g. Please provide a business justification for the Adobe Firefly usage on MKT-410.',
      confirmLabel: 'Send request',
      btnClass: 'btn-primary',
    },
  };

  const c = configs[modal.action as keyof typeof configs];

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
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '28px 28px 24px',
          width: 480,
          maxWidth: '90vw',
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
          fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ex.emp}</span>
          {' · '}{ex.dept} ({ex.center})
          <div style={{ marginTop: 4, color: 'var(--text-tertiary)' }}>{ex.issue}</div>
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

export default function Exceptions() {
  const [items] = useState<Exception[]>(initialExceptions);
  const [resolved,  setResolved]  = useState<number[]>([]);
  const [escalated, setEscalated] = useState<number[]>([]);
  const [requested, setRequested] = useState<number[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const open   = items.filter(e => !resolved.includes(e.id) && !escalated.includes(e.id));
  const closed = items.filter(e => resolved.includes(e.id));
  const esc    = items.filter(e => escalated.includes(e.id));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleConfirm(note: string) {
    if (!modal) return;
    const { exception, action } = modal;
    if (action === 'approve') {
      setResolved(prev => [...prev, exception.id]);
      showToast(`Exception for ${exception.emp} approved and recorded to audit ledger.`);
    } else if (action === 'escalate') {
      setEscalated(prev => [...prev, exception.id]);
      showToast(`Exception for ${exception.emp} escalated to CFO queue.`);
    } else if (action === 'request') {
      setRequested(prev => [...prev, exception.id]);
      showToast(`Information request sent to ${exception.emp}'s manager.`);
    }
    setModal(null);
  }

  function exportQueue() {
    const rows = items.map(e => [e.id, e.emp, e.dept, e.center, e.level, `"${e.issue}"`].join(','));
    const csv  = ['id,employee,department,center,level,issue', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'exceptions-queue.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Exception queue exported as CSV.');
  }

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: 'var(--text-primary)', color: '#fff',
          borderRadius: 8, padding: '10px 18px', fontSize: 13,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)', maxWidth: 380,
          lineHeight: 1.5, animation: 'fadeInUp 0.2s ease',
        }}>{toast}</div>
      )}

      {modal && <Modal modal={modal} onClose={() => setModal(null)} onConfirm={handleConfirm} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>Exception review queue</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {open.length} open · {closed.length} resolved
            {esc.length > 0 ? ` · ${esc.length} escalated to CFO` : ' · 1 escalation requires CFO approval before lock'}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={exportQueue}>
          <Icon name="download" size={12} color="#94a3b8" />
          Export queue
        </button>
      </div>

      {open.length === 0 && esc.length === 0 && (
        <div style={{
          background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '20px 18px', color: 'var(--color-success)',
          fontSize: 13, marginBottom: 16,
        }}>
          ✓ All exceptions have been resolved. Ready to proceed to month lock.
        </div>
      )}

      {open.map(ex => (
        <div key={ex.id} className="exception-item">
          <div className={`exc-icon ${ex.level === 'Escalate' ? 'esc' : 'rev'}`}>
            <Icon name="alert" size={14} color={ex.level === 'Escalate' ? '#ef4444' : '#f59e0b'} />
          </div>
          <div className="exc-meta">
            <div className="exc-title">{ex.emp} — {ex.dept} ({ex.center})</div>
            <div className="exc-desc">{ex.issue}</div>
            <div className="exc-actions">
              <button className="exc-btn approve" onClick={() => setModal({ exception: ex, action: 'approve' })}>
                Approve with note
              </button>
              <button className="exc-btn escalate" onClick={() => setModal({ exception: ex, action: 'escalate' })}>
                {ex.level === 'Escalate' ? 'Send to CFO' : 'Escalate'}
              </button>
              <button
                className="exc-btn"
                style={{
                  color: requested.includes(ex.id) ? 'var(--color-info)' : 'var(--text-tertiary)',
                  borderColor: requested.includes(ex.id) ? 'var(--color-info-border)' : 'var(--border-strong)',
                  background: requested.includes(ex.id) ? 'var(--color-info-bg)' : 'transparent',
                }}
                onClick={() => !requested.includes(ex.id) && setModal({ exception: ex, action: 'request' })}
              >
                {requested.includes(ex.id) ? '✓ Info requested' : 'Request info'}
              </button>
            </div>
          </div>
          <span className={`badge ${ex.level === 'Escalate' ? 'badge-danger' : 'badge-warn'}`}>
            {ex.level}
          </span>
        </div>
      ))}

      {esc.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Escalated to CFO
          </div>
          {esc.map(ex => (
            <div key={ex.id} className="exception-item" style={{ opacity: 0.6, borderColor: 'var(--color-danger-border)' }}>
              <div className="exc-icon esc">
                <Icon name="alert" size={14} color="#ef4444" />
              </div>
              <div className="exc-meta">
                <div className="exc-title">{ex.emp} — {ex.dept} ({ex.center})</div>
                <div className="exc-desc">{ex.issue}</div>
              </div>
              <span className="badge badge-danger">CFO Queue</span>
            </div>
          ))}
        </>
      )}

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
                  {ex.emp} — {ex.dept} ({ex.center})
                </div>
                <div className="exc-desc">{ex.issue}</div>
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
