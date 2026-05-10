import React, { useState } from 'react';
import { useAuth, SignIn } from '@clerk/clerk-react';
import './App.css';
import { ImportProvider } from './context/ImportContext';
import { DomainProvider, useDomain } from './context/DomainContext';
import Sidebar     from './components/Sidebar';
import Topbar      from './components/Topbar';
import Overview      from './pages/Overview';
import Ledger        from './pages/Ledger';
import Departments   from './pages/Departments';
import Close         from './pages/Close';
import Exceptions    from './pages/Exceptions';
import Ratecard      from './pages/Ratecard';
import Architecture  from './pages/Architecture';
import Settings      from './pages/Settings';
import Scenarios     from './pages/Scenarios';

const PAGE_TITLES: Record<string, string> = {
  overview:     'Executive overview',
  ledger:       'Employee ledger',
  departments:  'Cost centers',
  close:        'Monthly close',
  exceptions:   'Exceptions',
  ratecard:     'Rate cards',
  scenarios:    'Saved scenarios',
  architecture: 'Architecture',
  settings:     'Settings',
};

function AppShell() {
  const [page, setPage] = useState('overview');
  const { employees, deptSpend, ratecards, policyMix } = useDomain();

  const reviewCount    = employees.filter(e => e.policy !== 'Compliant').length;
  const exceptionCount = employees.filter(e => e.policy === 'Escalate').length || 5;
  const pageTitle      = PAGE_TITLES[page] || page;

  function renderPage() {
    switch (page) {
      case 'overview':
        return <Overview filtered={employees} deptSpend={deptSpend} policyMix={policyMix} />;
      case 'ledger':
        return <Ledger employees={employees} />;
      case 'departments':
        return <Departments employees={employees} deptSpend={deptSpend} />;
      case 'close':
        return <Close />;
      case 'exceptions':
        return <Exceptions />;
      case 'ratecard':
        return <Ratecard ratecards={ratecards} />;
      case 'scenarios':
        return <Scenarios />;
      case 'architecture':
        return <Architecture />;
      case 'settings':
        return <Settings />;
      default:
        return <Overview filtered={employees} deptSpend={deptSpend} policyMix={policyMix} />;
    }
  }

  return (
    <div className="shell">
      <Sidebar
        page={page}
        setPage={setPage}
        exceptionCount={exceptionCount}
        reviewCount={reviewCount}
      />
      <div className="main">
        <Topbar pageTitle={pageTitle} />
        <div className="content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="auth-screen">
        <div style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.02em' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="auth-screen">
        <SignIn routing="virtual" />
      </div>
    );
  }

  return (
    <ImportProvider>
      <DomainProvider>
        <AppShell />
      </DomainProvider>
    </ImportProvider>
  );
}
