import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDomain } from '../context/DomainContext';

const PALETTE = ['#2563EB','#16A34A','#D97706','#DC2626','#7C3AED','#0891B2','#DB2777','#059669'];

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, color: '#111827', boxShadow: '0 4px 12px rgba(0,0,0,.08)' },
};

export default function ModelUsageChart() {
  const { employees } = useDomain();
  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of employees) {
      if (!e.apps.length || (e.apps.length === 1 && e.apps[0] === '—')) continue;
      const share = e.spend / e.apps.length;
      for (const app of e.apps) totals.set(app, (totals.get(app) ?? 0) + share);
    }
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [employees]);

  if (data.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: 12 }}>
      No tool usage data loaded
    </div>
  );

  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} innerRadius={52} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v: any) => [`$${Number(v).toLocaleString()} (${total > 0 ? Math.round((v/total)*100) : 0}%)`, 'Est. spend']} />
        <Legend iconSize={8} iconType="circle" formatter={(v: string) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
