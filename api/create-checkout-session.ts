// Vercel serverless function — server-side only.
// STRIPE_SECRET_KEY is never referenced in any React component or client-side file.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const PRICE_IDS: Record<string, string> = {
  pro:        process.env.STRIPE_PRICE_ID_PRO!,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan, clerkOrgId, clerkUserId, successUrl, cancelUrl } = req.body as {
    plan: string;
    clerkOrgId: string;
    clerkUserId: string;
    successUrl: string;
    cancelUrl: string;
  };

  if (!plan || !clerkOrgId || !clerkUserId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return res.status(400).json({ error: `Unknown plan: ${plan}` });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        clerk_org_id:  clerkOrgId,
        clerk_user_id: clerkUserId,
        plan,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    console.error('[create-checkout-session]', message);
    return res.status(500).json({ error: message });
  }
}
