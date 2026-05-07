import React from 'react';
import Icon from './Icon';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number | null;
  badgeColor?: string;
}

interface SidebarProps {
  page: string;
  setPage: (p: string) => void;
  exceptionCount: number;
  reviewCount: number;
}

export default function Sidebar({ page, setPage, exceptionCount, reviewCount }: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'overview',     label: 'Executive overview', icon: 'home'     },
    { id: 'ledger',       label: 'Employee ledger',    icon: 'users',    badge: reviewCount || null, badgeColor: 'warn' },
    { id: 'departments',  label: 'Cost centres',       icon: 'building' },
    { id: 'close',        label: 'Monthly close',      icon: 'workflow' },
    { id: 'exceptions',   label: 'Exceptions',         icon: 'alert',    badge: exceptionCount, badgeColor: 'danger' },
    { id: 'ratecard',     label: 'Rate cards',         icon: 'dollar'   },
    { id: 'scenarios',    label: 'Saved scenarios',    icon: 'database' },
    { id: 'architecture', label: 'Architecture',       icon: 'layers'   },
    { id: 'settings',     label: 'Settings',           icon: 'settings' },
  ];

  return (
    <aside className="sidebar">
      {/* Wordmark */}
      <div className="sidebar-logo">
        <div className="logo-badge">Finance · AI Governance</div>
        <div className="logo-title">AI Compute Audit</div>
        <div className="logo-sub">April 2026 · US HQ</div>
      </div>

      {/* Navigation */}
      <nav className="nav-section">
        <div className="nav-label">Platform</div>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item${page === item.id ? ' active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <Icon
              name={item.icon}
              size={14}
              color={page === item.id ? 'var(--accent)' : '#9CA3AF'}
            />
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className={`nav-badge ${item.badgeColor || ''}`}>{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer — sync status */}
      <div className="sidebar-footer">
        <div className="sync-card">
          <div className="sync-row">
            <span className="sync-label">Data sync</span>
            <span className="sync-status">
              <span className="sync-dot" />
              Live
            </span>
          </div>
          <div className="sync-time">Last synced 5 min ago · 6 of 8 sources active</div>
        </div>
      </div>
    </aside>
  );
}
