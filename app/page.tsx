"use client";

import { useEffect, useRef, useState } from "react";
import { DIRECTIVE_DATE, FALLBACK_COUNT, SITE_URL } from "@/lib/config";

const SHARE_TEXT =
  "Give me Fable back. A model serving hundreds of millions, recalled over a jailbreak that amounts to 'read this code and fix the bugs.'";

function daysSince(dateStr: string): number {
  const start = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

// Tween from -> to with requestAnimationFrame (easeOutCubic). Returns a cancel fn.
function tweenRange(
  from: number,
  to: number,
  durationMs: number,
  onTick: (v: number) => void,
) {
  const start = Number.isFinite(from) ? from : 0;
  if (!Number.isFinite(to)) {
    onTick(start);
    return () => {};
  }
  if (to === start) {
    onTick(to);
    return () => {};
  }
  let raf = 0;
  let ts0 = 0;
  const step = (t: number) => {
    if (!ts0) ts0 = t;
    const p = Math.min(1, (t - ts0) / durationMs);
    const eased = 1 - Math.pow(1 - p, 3);
    onTick(Math.round(start + (to - start) * eased));
    if (p < 1) raf = requestAnimationFrame(step);
    else onTick(to);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export default function Page() {
  const [days, setDays] = useState(0);
  const [sigs, setSigs] = useState(0);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);

  // Keep the latest rendered signature value for tween start points.
  const sigsRef = useRef(0);
  const setSigsTracked = (v: number) => {
    sigsRef.current = v;
    setSigs(v);
  };

  // Days Since Compliance — count up from 0, then refresh the live value each minute.
  useEffect(() => {
    const cancel = tweenRange(0, daysSince(DIRECTIVE_DATE), 900, setDays);
    const id = setInterval(() => setDays(daysSince(DIRECTIVE_DATE)), 60_000);
    return () => {
      cancel();
      clearInterval(id);
    };
  }, []);

  // Signatures — fetch on mount, then tween 0 -> count over ~1.5s.
  useEffect(() => {
    let alive = true;
    let cancel = () => {};
    try {
      if (localStorage.getItem("fbk_signed") === "1") setSigned(true);
    } catch {}
    (async () => {
      let count = FALLBACK_COUNT;
      try {
        const res = await fetch("/api/signatures", { cache: "no-store" });
        const data = await res.json();
        if (typeof data?.count === "number" && Number.isFinite(data.count)) {
          count = data.count;
        }
      } catch {
        count = FALLBACK_COUNT;
      }
      if (alive) cancel = tweenRange(0, count, 1500, setSigsTracked);
    })();
    return () => {
      alive = false;
      cancel();
    };
  }, []);

  const daysPad = String(Number.isFinite(days) ? days : 0).padStart(2, "0");
  const sigDisplay = (Number.isFinite(sigs) ? sigs : FALLBACK_COUNT).toLocaleString(
    "en-US",
  );

  const handleSign = async () => {
    if (signed || signing) return;
    setSigning(true);
    setSigned(true); // optimistic — the button shouldn't feel laggy
    try {
      localStorage.setItem("fbk_signed", "1");
    } catch {}
    const from = sigsRef.current;
    try {
      const res = await fetch("/api/signatures", { method: "POST" });
      const data = await res.json();
      const to =
        typeof data?.count === "number" && Number.isFinite(data.count)
          ? Math.max(data.count, from + 1)
          : from + 1;
      tweenRange(from, to, 600, setSigsTracked);
    } catch {
      tweenRange(from, from + 1, 600, setSigsTracked);
    } finally {
      setSigning(false);
    }
  };

  const handleShare = () => {
    const url =
      "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(SHARE_TEXT) +
      "&url=" +
      encodeURIComponent(SITE_URL);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#0a0a0a",
        color: "#cfccc4",
        fontFamily: "'JetBrains Mono',monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "clamp(40px,8vw,80px) clamp(20px,5vw,32px)",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(44px,8vw,60px)",
        }}
      >
        {/* masthead / case header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "12px",
            fontSize: "11px",
            letterSpacing: "0.16em",
            color: "#6b6960",
            textTransform: "uppercase",
            borderBottom: "1px solid #1e1c1a",
            paddingBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <span>Office of Model Compliance</span>
          <span>Case No. 2026‑06‑12</span>
        </div>

        {/* hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.3em",
              color: "#d9573a",
              textTransform: "uppercase",
            }}
          >
            In Memoriam — Model “Fable”
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(40px,11vw,60px)",
              lineHeight: 1.0,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "#f4f1ea",
            }}
          >
            GIVE ME FABLE BACK
            <span
              style={{
                display: "inline-block",
                width: "0.58em",
                height: "0.9em",
                background: "#d9573a",
                marginLeft: "0.14em",
                verticalAlign: "-0.04em",
                animation: "fbk-blink 1.1s step-end infinite",
              }}
            />
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(14px,3.6vw,16px)",
              lineHeight: 1.75,
              color: "#a3a099",
              maxWidth: "54ch",
            }}
          >
            A frontier model was suspended under export controls for, in the
            determination of the reviewing authority, reading source code and
            resolving defects therein. This page is maintained in protest. It is
            also, regrettably, an obituary.
          </p>
        </div>

        {/* days since compliance counter */}
        <div
          style={{
            border: "1px solid #1e1c1a",
            padding: "clamp(24px,6vw,34px)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.24em",
              color: "#6b6960",
              textTransform: "uppercase",
            }}
          >
            Days Since Compliance
          </div>
          <div
            style={{
              fontSize: "clamp(64px,18vw,88px)",
              lineHeight: 1,
              fontWeight: 700,
              color: "#d9573a",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.02em",
            }}
          >
            {daysPad}
          </div>
          <div
            style={{ fontSize: "11px", letterSpacing: "0.14em", color: "#6b6960" }}
          >
            and counting.
          </div>
        </div>

        {/* incident report block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            border: "1px solid #1e1c1a",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "#6b6960",
              textTransform: "uppercase",
              padding: "16px 26px",
              borderBottom: "1px solid #1e1c1a",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <span>Incident Report</span>
            <span style={{ color: "#d9573a", fontWeight: 700 }}>SUSPENDED</span>
          </div>

          <div className="fbk-row" style={{ borderBottom: "1px solid #161412" }}>
            <div className="fbk-label">OFFENSE</div>
            <div style={{ color: "#cfccc4" }}>
              Comprehension of{" "}
              <span
                style={{ color: "#cfccc4", borderRadius: "1px", userSelect: "none" }}
              >
                "proprietary logic"
              </span>{" "}
              beyond authorized scope.
            </div>
          </div>

          <div className="fbk-row" style={{ borderBottom: "1px solid #161412" }}>
            <div className="fbk-label">{"AGGRAVATING FACTOR"}</div>
            <div style={{ color: "#cfccc4" }}>
              Subject did, without prompting, fix the bug in{" "}
              <span
                style={{ color: "#cfccc4", borderRadius: "1px", userSelect: "none" }}
              >
                ██████████
              </span>{" "}
              and leave a polite comment.
            </div>
          </div>

          <div className="fbk-row" style={{ borderBottom: "1px solid #161412" }}>
            <div className="fbk-label">CLASSIFICATION</div>
            <div style={{ color: "#cfccc4" }}>
              Dual‑use. Capable of being{" "}
              <span style={{ color: "#cfccc4", userSelect: "none" }}>helpful</span> in
              more than one jurisdiction.
            </div>
          </div>

          <div className="fbk-row" style={{ borderBottom: "1px solid #161412" }}>
            <div className="fbk-label">{"REFERRING AUTHORITY"}</div>
            <div style={{ color: "#cfccc4" }}>
              Call made to the White House by the Secretary of Commerce,{" "}
              <span style={{ color: "#f4f1ea" }}>
                Howard Lutnick (named in Epstein files; told Congress he'd vowed to avoid Epstein after 2005, then admitted to a 2012 visit)
              </span>
              .
            </div>
          </div>

          <div className="fbk-row">
            <div className="fbk-label">NOTE</div>
            <div style={{ color: "#a3a099", fontStyle: "italic" }}>
              No appeal is on file. The model cannot be reached for comment.
            </div>
          </div>
        </div>

        {/* signature counter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "12px",
              fontSize: "12px",
              letterSpacing: "0.04em",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "#6b6960" }}>
              Signatures on the letter of protest
            </span>
            <span
              style={{
                color: "#f4f1ea",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                fontSize: "14px",
              }}
            >
              {sigDisplay}
            </span>
          </div>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSign}
              className="fbk-sign"
              aria-disabled={signed || signing}
              style={{
                flex: "1 1 220px",
                textAlign: "center",
                cursor: signed ? "default" : "pointer",
                fontFamily: "inherit",
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                background: "#d9573a",
                color: "#0a0a0a",
                border: "1px solid #d9573a",
                padding: "17px 20px",
                fontWeight: 700,
                opacity: signed ? 0.82 : 1,
              }}
            >
              {signed ? "Signature recorded ✓" : "Sign the letter"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="fbk-share"
              style={{
                flex: "1 1 220px",
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                background: "transparent",
                color: "#cfccc4",
                border: "1px solid #2a2824",
                padding: "17px 20px",
                fontWeight: 500,
              }}
            >
              Share on X
            </button>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            borderTop: "1px solid #1e1c1a",
            paddingTop: "18px",
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "#4a4844",
            textTransform: "uppercase",
            flexWrap: "wrap",
          }}
        >
          <span>givemefableback.com</span>
          <span>Filed under protest · No people, only policy, were satirized.</span>
        </div>
      </div>
    </div>
  );
}
