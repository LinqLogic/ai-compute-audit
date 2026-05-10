import React, { useState } from 'react';
import DataImportPanel from '../components/DataImportPanel';
import { defaultPolicyRules } from '../data/mockData';
import { PolicyRule } from '../data/types';
import { useDomain } from '../context/DomainContext';
import Ratecard from './Ratecard';
import Scenarios from './Scenarios';

export default function Settings() {
  const { ratecards } = useDomain();
  const [rules, setRules] = useState<PolicyRule[]>(defaultPolicyRules);

  function toggleRule(key: string) {
    setRules(prev => prev.map(r => r.key === key ? { ...r, enabled: !r.enabled } : r));
  }

  function updateThreshold(key: string, val: string) {
    setRules(prev => prev.map(r => r.key === key ? { ...r, threshold: val } : r));
  }

  return (
    <>
      <DataImportPanel />

      {/* ── Policy & integrations ── */}
      <div className="section-row">
        {/* Policy rules */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Policy rules engine</div>
            <div className="card-sub">Configure thresholds and automated governance checks</div>
          </div>
          <div className="card-body">
            {rules.map(r => (
              <div key={r.key} className="rule-card">
                <div className="rule-header">
                  <div className="rule-title">{r.label}</div>
                  <button
                    className={`rule-toggle ${r.enabled ? 'on' : 'off'}`}
                    onClick={() => toggleRule(r.key)}
                    aria-label={`${r.enabled ? 'Disable' : 'Enable'} ${r.label}`}
                  />
                </div>
                <div className="rule-desc">{r.desc}</div>
                <div className="rule-threshold">
                  Threshold:
                  <input
                    value={r.threshold}
                    onChange={e => updateThreshold(r.key, e.target.value)}
                    disabled={!r.enabled}
                    style={{ opacity: r.enabled ? 1 : 0.4 }}
                  />
                  {!r.enabled && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(rule disabled)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workday integration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Workday integration</div>
              <div className="card-sub">HR master data configuration · identity join settings</div>
            </div>
            <div className="card-body">
              {[
                { label: 'Workday tenant ID',   sub: 'Your Workday organization identifier',          val: 'acme-corp-prod'       },
                { label: 'Worker sync field',   sub: 'Field used to join usage to HR record',          val: 'work_email'           },
                { label: 'Cost center field',   sub: 'Workday dimension for cost allocation',          val: 'Cost_Center_ID'       },
                { label: 'Sync frequency',      sub: 'How often HR data is refreshed',                 val: 'Daily at 02:00 UTC'   },
                { label: 'ERP journal target',  sub: 'System for chargeback journal entries',          val: 'SAP S/4HANA (Prod)'   },
              ].map((row, i) => (
                <div key={i} className="settings-row">
                  <div>
                    <div className="settings-row-label">{row.label}</div>
                    <div className="settings-row-sub">{row.sub}</div>
                  </div>
                  <input className="settings-input" defaultValue={row.val} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11 }}>Test connection</button>
                <button className="btn btn-primary" style={{ fontSize: 11 }}>Save settings</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Notification routing</div>
              <div className="card-sub">Where exceptions and alerts are sent</div>
            </div>
            <div className="card-body">
              {[
                { label: 'Escalation email',    sub: 'CFO and Finance leadership',    val: 'finance-ai-alerts@acme.com' },
                { label: 'Manager alerts',      sub: 'Department budget owners',       val: 'Via Workday notification'    },
                { label: 'Slack channel',       sub: 'FinOps team real-time alerts',   val: '#finops-ai-governance'       },
                { label: 'Audit export path',   sub: 'Immutable snapshot destination', val: 's3://acme-audit-ai/monthly'  },
              ].map((row, i) => (
                <div key={i} className="settings-row">
                  <div>
                    <div className="settings-row-label">{row.label}</div>
                    <div className="settings-row-sub">{row.sub}</div>
                  </div>
                  <input className="settings-input" defaultValue={row.val} />
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary" style={{ fontSize: 11 }}>Save settings</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Vendor billing & rate cards ──────────────────────────────────────────
          Phase 4: Rate Cards moved from primary sidebar into Settings.
          Existing Ratecard component embedded directly; no logic changed.     */}
      <div className="content-zone">
        <div className="content-zone-header">
          <span className="content-zone-title">Vendor billing &amp; rate cards</span>
          <span className="content-zone-sub">Internal charge rates used for metering and chargeback calculations</span>
        </div>
        <Ratecard ratecards={ratecards} />
      </div>

      {/* ── Saved scenarios ───────────────────────────────────────────────────────
          Phase 5: Saved Scenarios moved from primary sidebar into Settings.
          Existing Scenarios component embedded directly; localStorage logic
          preserved unchanged.                                                 */}
      <div className="content-zone" style={{ marginBottom: 0 }}>
        <div className="content-zone-header">
          <span className="content-zone-title">Saved scenarios</span>
          <span className="content-zone-sub">Save and restore named analysis states for planning and forecasting</span>
        </div>
        <Scenarios />
      </div>
    </>
  );
}
