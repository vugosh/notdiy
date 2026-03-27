import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const handymanId = session.metadata?.handyman_id;
    const amountTotal = session.amount_total;

    if (handymanId && amountTotal) {
      const { error } = await supabase.from("wallet_transactions").insert({
        handyman_id: handymanId,
        amount_cents: amountTotal,
        type: "topup",
      });

      if (error) {
        return NextResponse.json(
          { error: `Supabase insert failed: ${error.message}` },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}