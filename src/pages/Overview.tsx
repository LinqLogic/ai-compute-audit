import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Employee, DeptSpend } from '../data/types';
import { monthlyTrend } from '../data/mockData';
import { fmt$ } from '../utils/format';
import Icon from '../components/Icon';
import DataImportPanel from '../components/DataImportPanel';
import ExecutiveSummary from '../components/ExecutiveSummary';
import SpendByEmployeeChart from '../components/SpendByEmployeeChart';
import ModelUsageChart from '../components/ModelUsageChart';
import { useImport } from '../context/ImportContext';

interface Props {
  filtered:  Employee[];
  deptSpend: DeptSpend[];
  policyMix: { name: string; value: number }[];
}

const PIE_COLORS = ['#16A34A', '#D97706', '#DC2626'];

const tooltipStyle = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #E8EAED',
    borderRadius: 6,
    fontSize: 12,
    color: '#0F172A',
    boxShadow: '0 4px 16px rgba(0,0,0,.08)',
  },
  labelStyle: { color: '#6B7280', fontWeight: 500 },
};

export default function Overview({ filtered, deptSpend, policyMix }: Props) {
  const { isUsingImport } = useImport();

  const totalSpend   = filtered.reduce((s, e) => s + e.spend, 0);
  const totalAlloc   = filtered.reduce((s, e) => s + e.alloc, 0);
  const totalPrompts = filtered.reduce((s, e) => s + e.prompts, 0);
  const avgRisk      = Math.round(filtered.reduce((s, e) => s + e.risk, 0) / Math.max(1, filtered.length));
  const reviewCount  = filtered.filter(e => e.policy !== 'Compliant').length;
  const activeAI     = filtered.filter(e => e.prompts > 0).length;
  const avgCost      = totalSpend / Math.max(1, filtered.length);

  const overBudget  = deptSpend.filter(d => d.spend > d.budget);
  const escalations = filtered.filter(e => e.policy === 'Escalate');
  const topDept     = deptSpend[0]?.name ?? '—';

  return (
    <>
      {/* Data import — collapsed by default */}
      <DataImportPanel />

      {/* ── Zone 1: KPI strip ── */}
      <div className="kpi-strip">
        {[
          { label: 'Total AI spend',      value: fmt$(totalSpend),                                                sub: 'April 2026',              trendUp: true,  icon: 'dollar'   },
          { label: 'Budget utilisation',  value: `${Math.round((totalSpend / Math.max(1, totalAlloc)) * 100)}%`, sub: `${fmt$(totalAlloc)} alloc`, trendUp: totalSpend > totalAlloc, icon: 'chartbar' },
          { label: 'Prompts executed',    value: totalPrompts.toLocaleString(),                                   sub: 'Across all tools',        trendUp: false, icon: 'bot'      },
          { label: 'Avg cost / employee', value: fmt$(avgCost),                                                   sub: `${activeAI} active users`, trendUp: false, icon: 'users'    },
          { label: 'Avg risk score',      value: `${avgRisk}`,                                                    sub: `${reviewCount} require review`, trendUp: avgRisk > 50, icon: 'shield' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-strip-item">
            <div className="kpi-label">
              <Icon name={kpi.icon} size={11} color="#9CA3AF" />
              {kpi.label}
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-sub">
              {kpi.trendUp
                ? <span className="kpi-trend-up">▲ </span>
                : <span className="kpi-trend-ok">● </span>}
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Zone 2: Executive insights + cost drivers (from ExecutiveSummary) ── */}
      <ExecutiveSummary />

      {/* ── Zone 3: Trend + policy charts ── */}
      <div className="content-zone">
        <div className="content-zone-header">
          <span className="content-zone-title">Spend &amp; compliance trends</span>
          <span className="content-zone-sub">6-month view · April 2026</span>
        </div>
        <div className="charts-row">
          <div className="card">
            <div className="card-header">
              <div className="card-title">AI spend vs budget</div>
              <div className="card-sub">Monthly actual vs approved allocation — 7-month view</div>
            </div>
            <div className="card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F1F3F5" vertical={false} />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']} />
                  <Line type="monotone" dataKey="spend"  stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }} name="Actual" />
                  <Line type="monotone" dataKey="budget" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Budget" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Policy compliance</div>
              <div className="card-sub">Employee status distribution this period</div>
            </div>
            <div className="card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={policyMix}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={94}
                    innerRadius={58}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: '#E8EAED', strokeWidth: 1 }}
                  >
                    {policyMix.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone 4: Dept spend + briefing notes ── */}
      <div className="content-zone">
        <div className="content-zone-header">
          <span className="content-zone-title">Department breakdown</span>
          <span className="content-zone-sub">Cost centre accountability · {overBudget.length > 0 ? `${overBudget.length} over budget` : 'all within budget'}</span>
        </div>
        <div className="section-row" style={{ marginBottom: 0 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Spend by department</div>
              <div className="card-sub">{topDept} is the highest-spend cost centre this period</div>
            </div>
            <div className="card-body" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptSpend} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F1F3F5" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip {...tooltipStyle} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']} />
                  <Bar dataKey="budget" fill="#F1F3F5" radius={[0, 3, 3, 0]} name="Budget" maxBarSize={14} />
                  <Bar dataKey="spend"  fill="#2563EB" radius={[0, 3, 3, 0]} name="Spend"  maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Briefing notes</div>
              <div className="card-sub">
                {isUsingImport ? 'Generated from imported CSV data' : 'Governance summary · April 2026'}
              </div>
            </div>
            <div className="card-body">
              <div className="insight-list">
                {overBudget.length > 0 ? (
                  <div className="insight-item insight-warn">
                    <strong>{overBudget.length} department{overBudget.length > 1 ? 's are' : ' is'} over budget:</strong>{' '}
                    {overBudget.map(d => d.name).join(', ')}. Review cost centre ownership before month lock.
                  </div>
                ) : (
                  <div className="insight-item insight-warn">
                    <strong>Spend above budget.</strong> Monitor concentration risk in high-usage departments.
                  </div>
                )}
                {escalations.length > 0 ? (
                  <div className="insight-item insight-danger">
                    <strong>{escalations.length} escalation{escalations.length > 1 ? 's' : ''} pending:</strong>{' '}
                    {escalations.slice(0, 2).map(e => e.name).join(', ')}
                    {escalations.length > 2 ? ` +${escalations.length - 2} more` : ''} — variance above threshold, no justification filed.
                  </div>
                ) : (
                  <div className="insight-item insight-danger">
                    <strong>Policy review pending.</strong> Confirm all exceptions are resolved before locking.
                  </div>
                )}
                <div className="insight-item insight-info">
                  <strong>Recommendation:</strong>{' '}
                  {isUsingImport
                    ? `${filtered.length} workers loaded from CSV. Enable chargeback for over-budget departments.`
                    : 'Enable chargeback for Engineering and Legal in May. Current model is showback-only.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone 5: Analytical charts ── */}
      <div className="content-zone" style={{ marginBottom: 0 }}>
        <div className="content-zone-header">
          <span className="content-zone-title">Usage analytics</span>
          <span className="content-zone-sub">Employee spend distribution &amp; tool mix</span>
        </div>
        <div className="section-row" style={{ marginBottom: 0 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Top employees by spend</div>
              <div className="card-sub">Bar colour indicates risk level — green, amber, red</div>
            </div>
            <div className="card-body">
              <SpendByEmployeeChart />
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Spend by AI provider</div>
              <div className="card-sub">Estimated from employee usage × tool attribution</div>
            </div>
            <div className="card-body">
              <ModelUsageChart />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
