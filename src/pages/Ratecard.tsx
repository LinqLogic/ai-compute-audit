import React from 'react';
import { RateCard } from '../data/types';
import { useImport } from '../context/ImportContext';
import Icon from '../components/Icon';

interface Props {
  ratecards: RateCard[];
}

export default function Ratecard({ ratecards }: Props) {
  const { isUsingImport } = useImport();

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="card-title">
            Rate card —{' '}
            {isUsingImport ? 'imported' : 'version 2026.04'}
          </div>
          <div className="card-sub">
            Internal charge rates with markup. Used for metering normalization and chargeback calculations.
            {!isUsingImport && ' Effective January 2026.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 11 }}>
            <Icon name="download" size={12} color="#94a3b8" />
            Export CSV
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 11 }}>
            <Icon name="plus" size={12} color="#94a3b8" />
            Add rate
          </button>
        </div>
      </div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        {ratecards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            No rate cards loaded. Upload a rate_cards.csv to populate this view.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {['Provider', 'Model / product', 'Unit basis', 'External cost', 'Internal markup', 'Internal rate', 'Effective date', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ratecards.map((r, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{r.provider}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.model}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{r.unit}</td>
                  <td style={{ color: 'var(--text-primary)' }}>${r.cost.toFixed(2)}</td>
                  <td>
                    <span className="badge badge-info">{((r.markup - 1) * 100).toFixed(0)}%</span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--color-warn)' }}>
                    ${(r.cost * r.markup).toFixed(2)}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{r.effective}</td>
                  <td>
                    <span className="badge badge-ok">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ padding: '0 18px 18px' }}>
        <div className="insight-item insight-info" style={{ fontSize: 12, lineHeight: 1.7 }}>
          <strong>How rate cards work:</strong> Usage events ingested from provider APIs are multiplied by the
          internal rate (external cost × markup) to produce the monthly ledger charge. Rate cards are versioned
          and locked with each month-end snapshot so historical calculations remain reproducible.
          {isUsingImport && <span style={{ color: 'var(--color-success)' }}> Showing imported rate card data.</span>}
        </div>
      </div>
    </div>
  );
}
