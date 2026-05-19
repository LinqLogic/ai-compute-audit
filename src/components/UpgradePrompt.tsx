import React from 'react';
import { useOrganization } from '@clerk/clerk-react';

interface Props {
  featureName: string;
  requiredPlan?: 'pro' | 'enterprise';
}

export default function UpgradePrompt({ featureName, requiredPlan = 'pro' }: Props) {
  const { organization } = useOrganization();

  function handleUpgrade() {
    const clerkOrgId  = organization?.id ?? '';
    const successUrl  = encodeURIComponent(window.location.href + '?upgraded=1');
    const cancelUrl   = encodeURIComponent(window.location.href);

    fetch('/api/create-checkout-session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        plan:       requiredPlan,
        clerkOrgId,
        clerkUserId: '',  // filled server-side via Clerk session
        successUrl: decodeURIComponent(successUrl),
        cancelUrl:  decodeURIComponent(cancelUrl),
      }),
    })
      .then(r => r.json())
      .then(({ url }) => { if (url) window.location.href = url; })
      .catch(err => console.error('[UpgradePrompt]', err));
  }

  const planLabel = requiredPlan === 'enterprise' ? 'Enterprise' : 'Pro';

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      justifyContent:'center',
      padding:       '48px 24px',
      textAlign:     'center',
      gap:           12,
    }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
        {featureName} requires {planLabel}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 340 }}>
        Upgrade your plan to unlock {featureName} and other advanced features.
      </div>
      <button className="btn btn-primary" onClick={handleUpgrade} style={{ marginTop: 8 }}>
        Upgrade to {planLabel}
      </button>
    </div>
  );
}
