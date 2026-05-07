import React, { useState, useMemo } from 'react';
import { Employee } from '../data/types';
import { fmt$, fmtPct, riskColor, policyBadgeClass } from '../utils/format';
import Icon from '../components/Icon';

interface Props {
  employees: Employee[];
}

export default function Ledger({ employees }: Props) {
  const [dept,     setDept]     = useState('all');
  const [search,   setSearch]   = useState('');
  const [viewMode, setViewMode] = useState('showback');
  const [sortKey,  setSortKey]  = useState<keyof Employee>('spend');
  const [sortDir,  setSortDir]  = useState<'asc'|'desc'>('desc');

  const filtered = useMemo(() => {
    let list = employees.filter(e => {
      const dm = dept === 'all' || e.dept === dept;
      const q  = search.toLowerCase();
      const tm = !q || [e.name, e.dept, e.manager, e.role, e.eid, e.center].join(' ').toLowerCase().includes(q);
      return dm && tm;
    });
    list = [...list].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'desc' ? bv - av : av - bv;
      }
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv));
    });
    return list;
  }, [employees, dept, search, sortKey, sortDir]);

  const departments = Array.from(new Set(employees.map(e => e.dept))).sort();

  function toggleSort(key: keyof Employee) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortTh({ col, label }: { col: keyof Employee; label: string }) {
    const active = sortKey === col;
    return (
      <th
        onClick={() => toggleSort(col)}
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      >
        {label}{' '}
        <span style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
          {active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
        </span>
      </th>
    );
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="card-title">Employee AI usage ledger</div>
          <div className="card-sub">
            {filtered.length} employees · April 2026 ·{' '}
            {viewMode === 'chargeback'
              ? 'Chargeback mode — costs are being allocated'
              : 'Showback mode — informational only'}
          </div>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 11 }}>
          <Icon name="download" size={12} color="#0f172a" />
          Export ledger
        </button>
      </div>

      <div className="card-body" style={{ overflowX: 'auto' }}>
        {/* Filter bar */}
        <div className="filter-bar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Icon name="search" size={13} color="#475569" />
            <input
              placeholder="Search employee, role, cost center..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }}
            />
          </div>
          <select value={dept} onChange={e => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={viewMode} onChange={e => setViewMode(e.target.value)}>
            <option value="showback">Showback view</option>
            <option value="chargeback">Chargeback view</option>
            <option value="policy">Policy review</option>
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <SortTh col="name"     label="Employee"    />
              <SortTh col="dept"     label="Department"  />
              <th>Cost center</th>
              <th>Tools</th>
              <SortTh col="spend"    label="Spend"       />
              <th>Alloc</th>
              <SortTh col="variance" label="Variance"    />
              <SortTh col="tokens"   label="Tokens (M)"  />
              <SortTh col="prompts"  label="Prompts"     />
              <SortTh col="risk"     label="Risk"        />
              <SortTh col="policy"   label="Status"      />
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const pct   = Math.min(100, Math.round((e.spend / e.alloc) * 100));
              const bClass = policyBadgeClass(e.policy);
              const rc    = riskColor(e.risk);

              return (
                <tr key={e.id}>
                  <td>
                    <div className="emp-name">{e.name}</div>
                    <div className="emp-sub">{e.role} · {e.eid}</div>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{e.dept}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{e.manager}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{e.center}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{e.apps.join(', ')}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fmt$(e.spend, 2)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>${e.alloc}</td>
                  <td>
                    <div className={e.variance > 0 ? 'var-pos' : 'var-neg'}>{fmtPct(e.variance)}</div>
                    <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: e.variance > 20 ? '#ef4444' : '#22c55e', borderRadius: 2 }} />
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{e.tokens}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{e.prompts.toLocaleString()}</td>
                  <td>
                    <span className="risk-bar">
                      <span className="risk-fill" style={{ width: `${e.risk}%`, background: rc }} />
                    </span>
                    <span style={{ fontSize: 11, color: rc }}>{e.risk}</span>
                  </td>
                  <td>
                    <span className={`badge ${bClass}`}>{e.policy}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            No employees match your search. Try adjusting the filters above.
          </div>
        )}
      </div>
    </div>
  );
}
