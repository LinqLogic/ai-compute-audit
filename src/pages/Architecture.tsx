// Hidden from primary nav during enterprise navigation consolidation.
// Engineering / demo internals should not be exposed to production users.
// Component preserved internally; re-enable via navItems in Sidebar.tsx if needed.
import React from 'react';
import { connectors } from '../data/mockData';

const archLayers = [
  {
    title: '1. Source connectors',
    body: 'OpenAI, Anthropic, Microsoft Copilot, Google Vertex, AWS Bedrock, GitHub, Adobe, and SSO/IdP activity logs. Billing APIs and usage exports are normalized into a unified provider-agnostic event format.',
  },
  {
    title: '2. Identity and HR mapping',
    body: 'Worker ID, department, manager, cost center, employment status, and legal entity from Workday or any HRIS. Usage events are joined to HR master data on email or SSO identifier. Unmatched events are flagged as orphaned.',
  },
  {
    title: '3. Metering engine',
    body: 'Normalizes tokens, seats, image generations, audio, embeddings, GPU hours, fine-tuning jobs, and batch compute into monthly ledger lines using versioned rate cards with configurable internal markup.',
  },
  {
    title: '4. Audit and policy layer',
    body: 'Configurable thresholds, approved tool lists, anomaly detection, variance checks, approvals, and immutable monthly snapshots. Produces exception queue for reviewer workflows and CFO escalation.',
  },
  {
    title: '5. Finance outputs',
    body: 'Showback reports, chargeback journal entries for ERP import, per-department manager packs, executive board summaries, accrual estimates, and audit ledger snapshots signed and locked at month end.',
  },
];

const dataModel = [
  { entity: 'Worker',             fields: 'worker_id, employee_id, name, department, manager, cost_center, worker_type, active_flag, legal_entity' },
  { entity: 'AI Usage Event',     fields: 'provider, product, model, event_type, usage_units, tokens_in, tokens_out, gpu_hours, billed_amount, worker_id, timestamp' },
  { entity: 'Rate Card',          fields: 'version, provider, model, unit_basis, external_cost, internal_markup, effective_start, effective_end' },
  { entity: 'Policy Rule',        fields: 'rule_type, threshold_value, approved_tool_list, review_owner, escalation_path, enabled_flag' },
  { entity: 'Monthly Audit Ledger', fields: 'audit_month, worker_id, total_spend, allocated_cost, variance_pct, policy_status, reviewer_id, lock_flag, locked_at' },
];

export default function Architecture() {
  return (
    <>
      <div className="section-row">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Reference architecture</div>
            <div className="card-sub">Five-layer design · provider-agnostic · HRIS-connectable · cross-industry</div>
          </div>
          <div className="card-body">
            {archLayers.map((layer, i) => (
              <div key={i} className="arch-block">
                <div className="arch-row">
                  <span className="arch-num">{i + 1}</span>
                  <span className="arch-title">{layer.title.slice(3)}</span>
                </div>
                <div className="arch-body">{layer.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Source connector health</div>
              <div className="card-sub">Live integration status</div>
            </div>
            <div className="card-body">
              <div className="connector-grid">
                {connectors.map((c, i) => (
                  <div key={i} className="conn-card">
                    <div className="conn-name">{c.name}</div>
                    <div className="conn-status">
                      <span className="conn-dot" style={{ background: c.color }} />
                      <span style={{ color: c.color, fontSize: 11 }}>{c.status}</span>
                    </div>
                    <div className="conn-type">{c.type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Canonical data model</div>
              <div className="card-sub">Core entities for repeatable monthly close</div>
            </div>
            <div className="card-body">
              {dataModel.map((d, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{d.entity}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, fontFamily: 'monospace' }}>{d.fields}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Workday integration architecture</div>
          <div className="card-sub">How AI compute audit connects to your HRIS and ERP systems</div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Worker dimension', desc: 'Nightly sync of active workers, org structure, cost center assignments, and employment status via Workday REST API.' },
              { label: 'Manager hierarchy', desc: 'Full reporting chain for each worker enables cost accountability at every level from IC to C-suite.' },
              { label: 'Department + CC', desc: 'Cost center IDs and department rollups used for chargeback journal entries and ERP import file generation.' },
              { label: 'Employment status', desc: 'Active/inactive/leave status prevents ghost seat charges and auto-flags orphaned usage from termed employees.' },
            ].map((item, i) => (
              <div key={i} className="arch-block" style={{ margin: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', marginBottom: 5 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
