import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDomain } from '../context/DomainContext';

const RISK_COLORS = (score: number) => score > 70 ? '#DC2626' : score > 40 ? '#D97706' : '#16A34A';

const tooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, color: '#111827', boxShadow: '0 4px 12px rgba(0,0,0,.08)' },
};

export default function SpendByEmployeeChart() {
  const { employees } = useDomain();
  const data = useMemo(() =>
    [...employees].sort((a, b) => b.spend - a.spend).slice(0, 10).map(e => ({
      name:  e.name.split(' ')[0] + ' ' + (e.name.split(' ')[1]?.[0] ?? '') + '.',
      spend: Math.round(e.spend),
      risk:  e.risk,
    })),
    [employees],
  );

  if (data.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: 12 }}>
      No employee data loaded
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
        <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
        <YAxis type="category" dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} width={76} />
        <Tooltip {...tooltipStyle} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Spend']} />
        <Bar dataKey="spend" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((e, i) => <Cell key={i} fill={RISK_COLORS(e.risk)} fillOpacity={0.75} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
