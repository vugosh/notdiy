import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user." }, { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || Number.isNaN(amount) || amount < 5) {
      return NextResponse.json({ error: "Minimum top up is $5." }, { status: 400 });
    }

    const amountCents = Math.round(amount * 100);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/handyman/dashboard?topup=success`,
      cancel_url: `${siteUrl}/handyman/dashboard?topup=cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Wallet Top Up",
              description: `Add $${amount.toFixed(2)} to handyman wallet`,
            },
            unit_amount: amountCents,
          },
        },
      ],
      metadata: {
        purpose: "wallet_topup",
        handyman_id: user.id,
        amount_cents: String(amountCents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("topup-session error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}