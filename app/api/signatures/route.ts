import { NextResponse } from "next/server";
import { SIGNATURE_SOURCE, FALLBACK_COUNT } from "@/lib/config";

export const runtime = "edge";
export const revalidate = 300;

function ok(count: number) {
  const safe = Number.isFinite(count) ? Math.max(0, Math.round(count)) : FALLBACK_COUNT;
  return NextResponse.json(
    { count: safe },
    {
      status: 200,
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate" },
    },
  );
}

// Pull a number out of a parsed JSON body by trying the common keys.
function fromJson(data: unknown): number {
  if (typeof data === "number") return data;
  if (data && typeof data === "object") {
    for (const key of ["count", "signatures", "signed", "total"]) {
      const v = (data as Record<string, unknown>)[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const n = Number(v.replace(/[^0-9.]/g, ""));
        if (v.trim() && Number.isFinite(n)) return n;
      }
    }
  }
  return NaN;
}

// Defensively scrape a count from an HTML page near "signatures"/"signed".
function fromHtml(html: string): number {
  const patterns = [
    /([\d,]{1,12})\s*(?:signatures|signed)\b/i,
    /\b(?:signatures|signed)\b[^\d]{0,40}?([\d,]{1,12})/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return NaN;
}

export async function GET() {
  try {
    if (!SIGNATURE_SOURCE) return ok(FALLBACK_COUNT);

    const res = await fetch(SIGNATURE_SOURCE, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json, text/html;q=0.9" },
    });
    if (!res.ok) return ok(FALLBACK_COUNT);

    const contentType = res.headers.get("content-type") || "";
    const looksJson =
      contentType.includes("application/json") ||
      contentType.includes("text/json") ||
      /\.json(\?|$)/i.test(SIGNATURE_SOURCE);

    if (looksJson) {
      const data = await res.json();
      const n = fromJson(data);
      return ok(Number.isFinite(n) ? n : FALLBACK_COUNT);
    }

    const text = await res.text();
    const n = fromHtml(text);
    return ok(Number.isFinite(n) ? n : FALLBACK_COUNT);
  } catch {
    // Any error/unparseable upstream -> fall back. Always 200, never 500.
    return ok(FALLBACK_COUNT);
  }
}
