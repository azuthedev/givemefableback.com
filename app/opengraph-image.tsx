import { ImageResponse } from "next/og";

// Recreates "OG Card.dc.html" (1200x630) as a real, dynamically-rendered OG image.
// The handoff bundle shipped the card as HTML only (no PNG), so it's rebuilt here.

export const runtime = "edge";
export const alt = "GIVE ME FABLE BACK — Suspended for reading code and fixing bugs.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Best-effort load of JetBrains Mono from Google Fonts. Falls back to the
// default monospace if the network fetch fails — the route never hard-errors.
async function loadFont(weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@${weight}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    const css = await cssRes.text();
    const url = css.match(/src:\s*url\((.+?)\)\s*format/)?.[1];
    if (!url) return null;
    const fontRes = await fetch(url);
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image() {
  const [regular, bold] = await Promise.all([loadFont(400), loadFont(700)]);

  const fonts = [
    regular && { name: "JetBrains Mono", data: regular, weight: 400 as const, style: "normal" as const },
    bold && { name: "JetBrains Mono", data: bold, weight: 700 as const, style: "normal" as const },
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal";
  }[];

  const fontFamily = fonts.length ? "'JetBrains Mono', monospace" : "monospace";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0a0a",
          color: "#c8c5be",
          fontFamily,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: 16,
            letterSpacing: "0.2em",
            color: "#5a5852",
            textTransform: "uppercase",
          }}
        >
          <span>Office of Model Compliance</span>
          <span>Case No. 2026‑06‑12</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              fontSize: 17,
              letterSpacing: "0.34em",
              color: "#d9573a",
              textTransform: "uppercase",
            }}
          >
            In Memoriam — Model “Fable”
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 104,
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "#f2efe8",
            }}
          >
            <span>GIVE ME FABLE</span>
            <span style={{ display: "flex", alignItems: "flex-start" }}>
              BACK
              <span
                style={{
                  display: "flex",
                  width: "0.6em",
                  height: "0.9em",
                  background: "#d9573a",
                  marginLeft: "0.1em",
                }}
              />
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid #1e1c1a",
            paddingTop: 24,
          }}
        >
          <div style={{ fontSize: 17, letterSpacing: "0.06em", color: "#9b9890" }}>
            Suspended for reading code and fixing bugs.
          </div>
          <div
            style={{
              fontSize: 15,
              letterSpacing: "0.16em",
              color: "#403e3a",
              textTransform: "uppercase",
            }}
          >
            givemefableback.com
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
