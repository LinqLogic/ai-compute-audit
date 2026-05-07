/**
 * ExportMenu.tsx
 *
 * Export dropdown in the topbar.
 *
 * Bug fixes vs original:
 *   - Dropdown now uses position:fixed computed from the trigger button's
 *     bounding rect, so it escapes the overflow:auto/.main stacking context
 *     that was clipping the absolute-positioned dropdown.
 *   - Close-on-outside-click retained.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { useExport } from '../hooks/useExport';

interface DropdownPos { top: number; right: number }

export default function ExportMenu() {
  const [open, setOpen]   = useState(false);
  const [pos,  setPos]    = useState<DropdownPos>({ top: 0, right: 0 });
  const triggerRef        = useRef<HTMLButtonElement>(null);
  const dropdownRef       = useRef<HTMLDivElement>(null);
  const exp               = useExport();

  // Compute fixed position from trigger's bounding rect when opening
  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top:   rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(v => !v);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger  = triggerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const items: { label: string; action: () => void; divider?: boolean }[] = [
    { label: 'Employee ledger (CSV)',    action: exp.exportEmployeesCsv  },
    { label: 'Employee ledger (JSON)',   action: exp.exportEmployeesJson },
    { label: 'Department spend (CSV)',   action: exp.exportDeptSpendCsv, divider: true },
    { label: 'Policy / risk mix (CSV)', action: exp.exportPolicyMixCsv  },
    { label: 'Rate cards (CSV)',         action: exp.exportRateCardsCsv, divider: true },
    { label: 'Full bundle (JSON)',       action: exp.exportFullBundle    },
  ];

  const handleItemClick = useCallback((action: () => void) => {
    action();
    setOpen(false);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        className="btn btn-ghost"
        style={{ fontSize: 11 }}
        onClick={handleToggle}
      >
        <Icon name="download" size={12} color="#94a3b8" />
        Export
        <span style={{ fontSize: 9, color: '#475569', marginLeft: 2 }}>▾</span>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            position:     'fixed',
            top:          pos.top,
            right:        pos.right,
            background:   'var(--bg-surface)',
            border:       '1px solid var(--border-strong)',
            borderRadius: 8,
            minWidth:     210,
            zIndex:       9999,
            boxShadow:    '0 4px 20px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06)',
            overflow:     'hidden',
            padding:      '4px 0',
          }}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.divider && (
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              )}
              <button
                style={{
                  display:    'block',
                  width:      '100%',
                  textAlign:  'left',
                  padding:    '7px 14px',
                  fontSize:   12,
                  color:      'var(--text-secondary)',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = 'var(--bg-hover)';
                  btn.style.color      = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = 'transparent';
                  btn.style.color      = 'var(--text-secondary)';
                }}
                onClick={() => handleItemClick(item.action)}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
}
