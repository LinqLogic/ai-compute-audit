import React from 'react';
import Icon from './Icon';
import ExportMenu from './ExportMenu';

interface TopbarProps {
  pageTitle: string;
}

export default function Topbar({ pageTitle }: TopbarProps) {
  const title = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-month">April 2026 · Fiscal month 4 of 12</div>
      </div>
      <div className="topbar-right">
        <div className="lock-badge">
          <Icon name="check" size={10} color="var(--color-success)" />
          Mar 2026 locked
        </div>
        <ExportMenu />
        <button className="btn btn-primary" style={{ fontSize: 12 }}>
          <Icon name="workflow" size={12} color="#fff" />
          Run close
        </button>
      </div>
    </header>
  );
}
