import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Mapbox call üçün OK

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ error: "Missing q" }, { status: 400 });
    }

    const token = process.env.MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Missing MAPBOX_TOKEN" }, { status: 500 });
    }

    // ZIP üçün ən yaxşısı: types=postcode + country=US
    const endpoint =
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
      encodeURIComponent(q) +
      `.json?limit=1&country=US&types=postcode,address,place&access_token=${encodeURIComponent(token)}`;

    const resp = await fetch(endpoint, {
      headers: { "content-type": "application/json" },
      // caching istəmirsənsə:
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "Mapbox error", status: resp.status, body: text },
        { status: 502 }
      );
    }

    const json = await resp.json();
    const feature = json?.features?.[0];

    if (!feature?.center?.length) {
      return NextResponse.json({ error: "No results" }, { status: 404 });
    }

    const [lng, lat] = feature.center;

    return NextResponse.json({
      q,
      lat,
      lng,
      place_name: feature.place_name,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}