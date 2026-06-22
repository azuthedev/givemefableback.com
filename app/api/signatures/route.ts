import { NextResponse } from "next/server";
import { SIGNATURE_SOURCE, FALLBACK_COUNT } from "@/lib/config";

export const runtime = "edge";

const KEY = "fbk:signatures";
const BASELINE = FALLBACK_COUNT;
const IP_TTL_SECONDS = 86_400; // one sign per IP per 24h

type KvEnv = { url: string; token: string };

// Works with either the Vercel KV or the raw Upstash env var names.
function kvEnv(): KvEnv | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

// Upstash REST: command + args as path segments, result returned as JSON { result }.
async function kv(env: KvEnv, ...args: (string | number)[]): Promise<unknown> {
  const path = args.map((a) => encodeURIComponent(String(a))).join("/");
  const res = await fetch(`${env.url}/${path}`, {
    headers: { Authorization: `Bearer ${env.token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return data?.result;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toCount(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : FALLBACK_COUNT;
}

function ok(count: number, cache: boolean) {
  return NextResponse.json(
    { count: toCount(count) },
    {
      status: 200,
      headers: {
        // Short edge cache so the public count feels live but Redis isn't hit on
        // every single page view. The signer sees their own bump instantly via
        // the client-side optimistic update regardless.
        "Cache-Control": cache
          ? "s-maxage=10, stale-while-revalidate=20"
          : "no-store",
      },
    },
  );
}

// ----- Legacy external source parsing (used only when KV isn't configured) -----
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

async function externalCount(): Promise<number> {
  if (!SIGNATURE_SOURCE) return FALLBACK_COUNT;
  try {
    const res = await fetch(SIGNATURE_SOURCE, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json, text/html;q=0.9" },
    });
    if (!res.ok) return FALLBACK_COUNT;
    const ct = res.headers.get("content-type") || "";
    const looksJson =
      ct.includes("json") || /\.json(\?|$)/i.test(SIGNATURE_SOURCE);
    const n = looksJson ? fromJson(await res.json()) : fromHtml(await res.text());
    return Number.isFinite(n) ? n : FALLBACK_COUNT;
  } catch {
    return FALLBACK_COUNT;
  }
}

// Read the live count. Returns FALLBACK_COUNT on any failure (never throws).
export async function GET() {
  try {
    const env = kvEnv();
    if (!env) return ok(await externalCount(), true);

    const v = await kv(env, "get", KEY);
    if (v === null || v === undefined) {
      await kv(env, "set", KEY, BASELINE, "NX"); // seed baseline once
      return ok(BASELINE, true);
    }
    return ok(toCount(v), true);
  } catch {
    return ok(FALLBACK_COUNT, true);
  }
}

// Record a signature. Atomic INCR, deduped per IP/day. Always 200.
export async function POST(request: Request) {
  try {
    const env = kvEnv();
    if (!env) return ok(FALLBACK_COUNT, false); // nothing to persist into yet

    await kv(env, "set", KEY, BASELINE, "NX"); // ensure baseline exists

    const ip =
      (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";
    const ipHash = await sha256Hex(ip);

    // SET ... NX EX -> "OK" only the first time this IP signs within the window.
    const firstTime = await kv(
      env,
      "set",
      `fbk:ip:${ipHash}`,
      "1",
      "NX",
      "EX",
      IP_TTL_SECONDS,
    );

    if (firstTime === "OK") {
      const next = await kv(env, "incr", KEY);
      return ok(toCount(next), false);
    }

    // Already signed recently from this IP — return the current count unchanged.
    return ok(toCount(await kv(env, "get", KEY)), false);
  } catch {
    return ok(FALLBACK_COUNT, false);
  }
}
