import { NextResponse } from "next/server";

export const runtime = "nodejs"; // important for fetch + env

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // support both ?q=19115 and ?zip=19115
    const q = (searchParams.get("q") || searchParams.get("zip") || "").trim();
    if (!q) {
      return NextResponse.json({ error: "Missing query param: q (or zip)" }, { status: 400 });
    }

    const token =
      process.env.MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Missing MAPBOX_TOKEN env var" },
        { status: 500 }
      );
    }

    // If q is a ZIP, use US country filter
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      q
    )}.json?country=us&limit=1&types=postcode&access_token=${encodeURIComponent(token)}`;

    const resp = await fetch(url, { cache: "no-store" });
    const json = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: json?.message || "Mapbox error", details: json },
        { status: 500 }
      );
    }

    const feature = json?.features?.[0];
    const center = feature?.center; // [lng, lat]
    if (!center || center.length < 2) {
      return NextResponse.json({ error: "No results found for this ZIP" }, { status: 404 });
    }

    const [lng, lat] = center;
    return NextResponse.json({ lat, lng });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}