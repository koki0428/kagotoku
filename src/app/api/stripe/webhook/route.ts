import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** サブスクリプションの期間終了日を取得 */
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string {
  // items.data[0].current_period_end から取得（新しいStripe API）
  const firstItem = subscription.items?.data?.[0];
  if (firstItem?.current_period_end) {
    return new Date(firstItem.current_period_end * 1000).toISOString();
  }
  // フォールバック: 1ヶ月後
  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 1);
  return fallback.toISOString();
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    if (webhookSecret && signature) {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        const subscriptionId = session.subscription as string;
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
          expand: ["items.data"],
        });
        const expiresAt = getSubscriptionPeriodEnd(subscription as unknown as Stripe.Subscription);

        await supabaseAdmin.from("profiles").update({
          is_premium: true,
          premium_expires_at: expiresAt,
          stripe_subscription_id: subscriptionId,
        }).eq("id", userId);

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionRef = subDetails?.subscription;
        const subscriptionId = typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef?.id;
        if (!subscriptionId) break;

        const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
          expand: ["items.data"],
        });
        const customerId = invoice.customer as string;
        const expiresAt = getSubscriptionPeriodEnd(subscription as unknown as Stripe.Subscription);

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin.from("profiles").update({
            is_premium: true,
            premium_expires_at: expiresAt,
          }).eq("id", profile.id);
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          const expiresAt = isActive ? getSubscriptionPeriodEnd(subscription) : null;

          await supabaseAdmin.from("profiles").update({
            is_premium: isActive,
            premium_expires_at: expiresAt,
            stripe_subscription_id: isActive ? subscription.id : null,
          }).eq("id", profile.id);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
