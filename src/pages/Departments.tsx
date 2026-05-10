// Hidden from primary nav during enterprise navigation consolidation.
// Department / cost-centre analytics are surfaced on Executive Overview via
// the "Department breakdown" zone.  This page is preserved for future use.
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Employee, DeptSpend } from '../data/types';
import { fmt$ } from '../utils/format';

interface Props {
  employees: Employee[];
  deptSpend: DeptSpend[];
}

const tooltipStyle = {
  contentStyle: { background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' },
};

export default function Departments({ employees, deptSpend }: Props) {
  const maxSpend = Math.max(...deptSpend.map(d => d.spend), 1);

  const trendData = deptSpend.map(d => ({
    name:   d.name.split(' ')[0],
    spend:  d.spend,
    budget: d.budget,
  }));

  return (
    <>
      <div className="section-row">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cost center spend vs budget</div>
            <div className="card-sub">April 2026 — showback view · gold = actual, slate = budget</div>
          </div>
          <div className="card-body">
            {deptSpend.map(d => {
              const pct    = Math.round((d.spend / Math.max(1, d.budget) - 1) * 100);
              const isOver = d.spend > d.budget;
              const barW   = Math.round((d.spend / maxSpend) * 100);
              return (
                <div key={d.name} className="dept-row">
                  <div className="dept-name">{d.name}</div>
                  <div className="dept-bar-wrap">
                    <div
                      className="dept-bar-fill"
                      style={{ width: `${barW}%`, background: isOver ? '#ef4444' : '#b0893d' }}
                    />
                  </div>
                  <div className="dept-val">{fmt$(d.spend)}</div>
                  <div className="dept-var" style={{ color: isOver ? '#f87171' : '#86efac' }}>
                    {pct > 0 ? '+' : ''}{pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Spend vs budget — bar comparison</div>
            <div className="card-sub">Side-by-side for budget accountability meetings</div>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`$${v.toLocaleString()}`, '']} />
                <Bar dataKey="budget" fill="#E5E7EB" radius={[4, 4, 0, 0]} name="Budget" />
                <Bar dataKey="spend"  fill="#2563EB" radius={[4, 4, 0, 0]} name="Spend"  />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Workday cost center map</div>
          <div className="card-sub">HR master data — department · manager · employee count · AI spend</div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {['Cost center', 'Department', 'Budget owner', 'Employees', 'AI spend', 'Budget', 'Variance', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptSpend.map(d => {
                const deptEmps = employees.filter(e => e.dept === d.name);
                const manager  = deptEmps[0]?.manager || '—';
                const center   = deptEmps[0]?.center?.split('-')[0] || '—';
                const pct      = Math.round((d.spend / Math.max(1, d.budget) - 1) * 100);
                const isOver   = d.spend > d.budget;
                return (
                  <tr key={d.name}>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>{center}-*</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{d.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{manager}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{d.employees}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fmt$(d.spend)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmt$(d.budget)}</td>
                    <td style={{ color: isOver ? '#f87171' : '#86efac' }}>
                      {pct > 0 ? '+' : ''}{pct}%
                    </td>
                    <td>
                      <span className={`badge ${isOver ? 'badge-warn' : 'badge-ok'}`}>
                        {isOver ? 'Over budget' : 'Within budget'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
