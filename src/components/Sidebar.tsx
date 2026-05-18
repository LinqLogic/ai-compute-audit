import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number | null;
  badgeColor?: string;
}

interface SidebarProps {
  exceptionCount: number;
  reviewCount: number;
}

export default function Sidebar({ exceptionCount, reviewCount }: SidebarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const activePath = location.pathname;

  // Primary navigation — enterprise-consolidated view.
  // Hidden from primary nav during enterprise navigation consolidation:
  //   { id: 'departments',  label: 'Cost Centres',    icon: 'building' }  → visible in Overview dept breakdown
  //   { id: 'ratecard',     label: 'Rate Cards',      icon: 'dollar'   }  → accessible via Settings › Vendor Billing
  //   { id: 'scenarios',    label: 'Saved Scenarios', icon: 'database' }  → accessible via Settings › Saved Scenarios
  //   { id: 'architecture', label: 'Architecture',    icon: 'layers'   }  → internal only, no production nav entry
  const navItems: NavItem[] = [
    { id: 'overview',   label: 'Executive Overview', icon: 'home'     },
    { id: 'ledger',     label: 'Employee Ledger',    icon: 'users',   badge: reviewCount || null, badgeColor: 'warn' },
    { id: 'exceptions', label: 'Exceptions',         icon: 'alert',   badge: exceptionCount, badgeColor: 'danger' },
    { id: 'close',      label: 'Monthly Close',      icon: 'workflow' },
    { id: 'settings',   label: 'Settings',           icon: 'settings' },
  ];

  function isActive(id: string): boolean {
    return activePath === '/' + id || (id === 'overview' && activePath === '/');
  }

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
            className={`nav-item${isActive(item.id) ? ' active' : ''}`}
            onClick={() => navigate('/' + item.id)}
          >
            <Icon
              name={item.icon}
              size={14}
              color={isActive(item.id) ? 'var(--accent)' : '#9CA3AF'}
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
