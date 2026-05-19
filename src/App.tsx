import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, SignIn } from '@clerk/clerk-react';
import './App.css';
import { ImportProvider } from './context/ImportContext';
import { DomainProvider, useDomain } from './context/DomainContext';
import { OrgProvider } from './context/OrgContext';
import Sidebar      from './components/Sidebar';
import Topbar       from './components/Topbar';
import Overview      from './pages/Overview';
import Ledger        from './pages/Ledger';
import Departments   from './pages/Departments';
import Close         from './pages/Close';
import Exceptions    from './pages/Exceptions';
import Ratecard      from './pages/Ratecard';
import Settings      from './pages/Settings';
import Scenarios     from './pages/Scenarios';
import { generateGovernanceExceptions } from './analytics/governanceExceptions';
import { useMemo } from 'react';
import { useImportHydration } from './hooks/useImportHydration';
import { useFeatureGate } from './hooks/useFeatureGate';
import UpgradePrompt from './components/UpgradePrompt';

function GatedRoute({ feature, label, children }: { feature: string; label: string; children: React.ReactNode }) {
  const allowed = useFeatureGate(feature);
  return allowed ? <>{children}</> : <UpgradePrompt featureName={label} />;
}

const PAGE_TITLES: Record<string, string> = {
  overview:     'Executive Overview',
  ledger:       'Employee Ledger',
  departments:  'Cost Centres',
  close:        'Monthly Close',
  exceptions:   'Exceptions',
  ratecard:     'Rate Cards',
  scenarios:    'Saved Scenarios',
  settings:     'Settings',
};

function AppShell() {
  useImportHydration();
  const location = useLocation();
  const { employees, deptSpend, ratecards, policyMix } = useDomain();

  const reviewCount    = employees.filter(e => e.policy !== 'Compliant').length;
  const exceptionCount = useMemo(
    () => generateGovernanceExceptions(employees, deptSpend).length,
    [employees, deptSpend],
  );

  const pageKey   = location.pathname.replace(/^\//, '') || 'overview';
  const pageTitle = PAGE_TITLES[pageKey] || pageKey;

  return (
    <div className="shell">
      <Sidebar exceptionCount={exceptionCount} reviewCount={reviewCount} />
      <div className="main">
        <Topbar pageTitle={pageTitle} />
        <div className="content">
          <Routes>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="/overview"     element={<Overview filtered={employees} deptSpend={deptSpend} policyMix={policyMix} />} />
            <Route path="/ledger"       element={<Ledger employees={employees} />} />
            <Route path="/departments"  element={<Departments employees={employees} deptSpend={deptSpend} />} />
            <Route path="/close"        element={<Close />} />
            <Route path="/exceptions"   element={<GatedRoute feature="governance_exceptions" label="Governance Exceptions"><Exceptions /></GatedRoute>} />
            <Route path="/ratecard"     element={<Ratecard ratecards={ratecards} />} />
            <Route path="/scenarios"    element={<GatedRoute feature="scenario_builder" label="Scenario Builder"><Scenarios /></GatedRoute>} />
            <Route path="/settings"     element={<Settings />} />
            <Route path="*"             element={<Navigate to="/overview" replace />} />
          </Routes>
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
    <HashRouter>
      <OrgProvider>
        <ImportProvider>
          <DomainProvider>
            <AppShell />
          </DomainProvider>
        </ImportProvider>
      </OrgProvider>
    </HashRouter>
  );
}
