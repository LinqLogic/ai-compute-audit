import React, { useMemo } from 'react';
import { useDomain } from '../context/DomainContext';
import { buildExecutiveSummary } from '../utils/summaryAnalytics';
import { fmt$ } from '../utils/format';

const RISK_LABEL = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
const RISK_STYLE = {
  high:   { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)' },
  medium: { color: 'var(--color-warn)',   bg: 'var(--color-warn-bg)',   border: 'var(--color-warn-border)'   },
  low:    { color: 'var(--color-success)',bg: 'var(--color-success-bg)',border: 'var(--color-success-border)'},
};

export default function ExecutiveSummary() {
  const { employees, deptSpend, ratecards } = useDomain();
  const s    = useMemo(() => buildExecutiveSummary(employees, deptSpend, ratecards), [employees, deptSpend, ratecards]);
  const risk = RISK_STYLE[s.concentrationRisk.level];
  const over = s.budgetVariancePct > 0;

  return (
    <div style={{ marginBottom: 'var(--sp-6)' }}>
      {/* Zone header */}
      <div className="content-zone-header">
        <span className="content-zone-title">Executive summary</span>
        <span className="content-zone-sub">April 2026 · auto-updated from data</span>
      </div>

      {/* Two-column layout: insights left, drivers right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>

        {/* Left: spend overview + key metrics */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Spend overview</div>
            <div className="card-sub">Allocation vs actual · budget variance · user metrics</div>
          </div>
          <div className="card-body">
            {/* Mini metric table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4) var(--sp-6)', marginBottom: 'var(--sp-5)' }}>
              <MiniMetric label="Total AI spend"         value={fmt$(s.totalSpend, 2)} />
              <MiniMetric label="Total allocation"        value={fmt$(s.totalBudget)} />
              <MiniMetric
                label="Budget variance"
                value={`${over ? '+' : ''}${s.budgetVariancePct}%`}
                highlight={over ? 'danger' : 'success'}
              />
              <MiniMetric label="Avg cost / active user"  value={fmt$(s.avgCostPerUser, 2)} />
              <MiniMetric label="Active users"            value={`${s.activeUserCount}`} sub={`of ${s.employeeCount} employees`} />
              <MiniMetric label="Avg risk score"          value={`${Math.round(employees.reduce((s,e) => s + e.risk, 0) / Math.max(1, employees.length))}`} />
            </div>

            {/* Policy mix row */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-4)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 'var(--sp-3)' }}>
                Policy mix
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                {[
                  { label: 'Compliant', count: s.compliantCount, color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)' },
                  { label: 'Review',    count: s.reviewCount,    color: 'var(--color-warn)',    bg: 'var(--color-warn-bg)',    border: 'var(--color-warn-border)'    },
                  { label: 'Escalate',  count: s.escalateCount,  color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  border: 'var(--color-danger-border)'  },
                ].map(p => (
                  <div key={p.label} style={{ flex: 1, textAlign: 'center', background: p.bg, border: `1px solid ${p.border}`, borderRadius: 'var(--r-md)', padding: 'var(--sp-2) 0' }}>
                    <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: p.color, lineHeight: 1 }}>{p.count}</div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: top drivers + concentration risk + insights */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cost drivers &amp; insights</div>
            <div className="card-sub">Top spend by entity · concentration risk · key observations</div>
          </div>
          <div className="card-body">
            {/* Top drivers list */}
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              {s.topDrivers.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-2) 0', borderBottom: i < s.topDrivers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700, minWidth: 16 }}>#{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 'var(--text-md)', fontWeight: 500, color: 'var(--text-primary)' }}>{d.label}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{d.type === 'department' ? 'Department' : 'Employee'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt$(d.spend, 0)}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: d.sharePct > 30 ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: d.sharePct > 30 ? 700 : 400 }}>{d.sharePct}% of total</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Concentration risk */}
            <div style={{ background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-4)', marginBottom: 'var(--sp-3)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: risk.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                Concentration risk: {RISK_LABEL[s.concentrationRisk.level]}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{s.concentrationRisk.message}</div>
            </div>

            {/* Narrative insights */}
            {s.insights.slice(0, 2).map((insight, i) => (
              <div key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.65, marginBottom: 'var(--sp-2)', paddingLeft: 'var(--sp-3)', borderLeft: '2px solid var(--border-strong)' }}>
                {insight}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string;
  highlight?: 'danger' | 'success';
}) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: highlight === 'danger' ? 'var(--color-danger)' : highlight === 'success' ? 'var(--color-success)' : 'var(--text-primary)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
