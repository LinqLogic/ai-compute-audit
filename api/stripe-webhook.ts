// Vercel serverless function — server-side only.
// STRIPE_SECRET_KEY and SUPABASE service_role key are never referenced in client code.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// Service-role client bypasses RLS — used only in server-side webhook handler.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // req.body must be the raw buffer — configure in vercel.json if needed
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature error';
    console.error('[stripe-webhook] signature verification failed:', message);
    return res.status(400).json({ error: message });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session    = event.data.object as Stripe.Checkout.Session;
        const clerkOrgId = session.metadata?.clerk_org_id;
        const plan       = session.metadata?.plan as 'pro' | 'enterprise' | undefined;

        if (clerkOrgId && plan) {
          await supabaseAdmin
            .from('organizations')
            .update({
              plan,
              stripe_customer_id:     session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status:    'active',
            })
            .eq('clerk_org_id', clerkOrgId);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription;
        const status = sub.status;
        const plan   = status === 'active'
          ? (sub.metadata?.plan as 'pro' | 'enterprise' | undefined)
          : 'free';

        await supabaseAdmin
          .from('organizations')
          .update({
            plan:                plan ?? 'free',
            subscription_status: status,
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      default:
        // Unhandled event types — acknowledged but ignored
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error';
    console.error('[stripe-webhook] handler error:', message);
    return res.status(500).json({ error: message });
  }
}
