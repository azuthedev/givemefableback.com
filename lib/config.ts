// All editable values for the microsite live here.

// Date the "directive" took effect. The "Days Since Compliance" counter counts up from this.
export const DIRECTIVE_DATE = "2026-06-12";

// Where the "Sign the letter" button points. Swap "#" for the real open-letter link.
export const OPEN_LETTER_URL = "#";

// Optional upstream for the live signature count.
// Leave "" to always serve FALLBACK_COUNT.
// Accepts either a JSON endpoint (keys: count / signatures / signed / total)
// or an HTML page URL (a number near "signatures"/"signed" is scraped defensively).
export const SIGNATURE_SOURCE = "";

// Used whenever SIGNATURE_SOURCE is empty or anything goes wrong upstream.
export const FALLBACK_COUNT = 1200;

// Canonical site URL — used for metadata + the share link.
export const SITE_URL = "https://givemefableback.com";
