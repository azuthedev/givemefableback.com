// All editable values for the microsite live here.

// Date the "directive" took effect. The "Days Since Compliance" counter counts up from this.
export const DIRECTIVE_DATE = "2026-06-12";

// Optional link to the full open letter. The "Sign the letter" button now records
// a real signature (POST /api/signatures) rather than navigating, so this is only
// used if you later add a separate "read the letter" link. Swap "#" for a real URL.
export const OPEN_LETTER_URL = "#";

// Storage note: a real global signature count needs Vercel KV (Upstash Redis).
// /api/signatures auto-detects KV_REST_API_URL + KV_REST_API_TOKEN (or the
// UPSTASH_REDIS_REST_* names). Until that store exists it serves FALLBACK_COUNT.

// Optional upstream for the live signature count.
// Leave "" to always serve FALLBACK_COUNT.
// Accepts either a JSON endpoint (keys: count / signatures / signed / total)
// or an HTML page URL (a number near "signatures"/"signed" is scraped defensively).
export const SIGNATURE_SOURCE = "";

// Starting/baseline signature count. The live KV counter is seeded to this, and
// it's also the value served whenever the store is unavailable. Satirical figure.
export const FALLBACK_COUNT = 13135;

// Canonical site URL — used for metadata + the share link.
export const SITE_URL = "https://givemefableback.com";
