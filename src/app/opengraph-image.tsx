import { ImageResponse } from "next/og";

// Link preview for WhatsApp, Instagram, X, etc. Static on purpose: it's built
// once at `next build`, which must never touch the database.
export const alt = "Bajrang Badminton Academy — Where champions take flight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#05070f",
          color: "white",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Glows */}
        <div style={{ position: "absolute", top: -260, left: -120, width: 760, height: 620, borderRadius: 9999, background: "radial-gradient(circle, rgba(200,245,60,0.35), rgba(200,245,60,0) 70%)" }} />
        <div style={{ position: "absolute", bottom: -300, right: -160, width: 760, height: 640, borderRadius: 9999, background: "radial-gradient(circle, rgba(56,225,255,0.28), rgba(56,225,255,0) 70%)" }} />

        {/* Court lines on the right */}
        <svg width="420" height="560" viewBox="0 0 400 500" style={{ position: "absolute", right: 70, top: 35, opacity: 0.9 }}>
          <g stroke="rgba(255,255,255,0.18)" strokeWidth="3" fill="none">
            <rect x="30" y="30" width="340" height="440" rx="6" />
            <line x1="55" y1="30" x2="55" y2="470" />
            <line x1="345" y1="30" x2="345" y2="470" />
            <line x1="30" y1="185" x2="370" y2="185" />
            <line x1="30" y1="315" x2="370" y2="315" />
            <line x1="200" y1="30" x2="200" y2="185" />
            <line x1="200" y1="315" x2="200" y2="470" />
          </g>
          <line x1="20" y1="250" x2="380" y2="250" stroke="rgba(255,255,255,0.7)" strokeWidth="4" />
          {/* Shuttle arc */}
          <path d="M90 420 Q 220 60 320 130" stroke="rgba(200,245,60,0.55)" strokeWidth="4" strokeDasharray="10 12" fill="none" />
          <g transform="translate(330 136) rotate(55)">
            <path d="M-14 -34 L14 -34 L9 6 L-9 6 Z" fill="rgba(200,245,60,0.35)" />
            <path d="M-14 -34 L-9 6 M0 -35 L0 6 M14 -34 L9 6" stroke="#d4ff3a" strokeWidth="3" />
            <path d="M-11 6 H11 L9 16 A9 9 0 0 1 -9 16 Z" fill="#d4ff3a" />
          </g>
          <circle cx="110" cy="400" r="18" fill="#c8f53c" />
          <circle cx="262" cy="90" r="18" fill="#38e1ff" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px 80px", width: 740 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", width: 64, height: 64, borderRadius: 18, border: "2px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
              <svg width="42" height="42" viewBox="0 0 64 64">
                <path d="M20 6 L44 6 L38 40 L26 40 Z" fill="rgba(212,255,58,0.3)" />
                <path d="M20 6 L26 40 M32 5 L32 40 M44 6 L38 40 M23 20 H41 M25 30 H39" stroke="#d4ff3a" strokeWidth="3" strokeLinecap="round" />
                <path d="M24 40 H40 L38 48 A6 6 0 0 1 26 48 Z" fill="#d4ff3a" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 34, fontWeight: 800 }}>Bajrang</span>
              <span style={{ fontSize: 15, letterSpacing: 6, color: "#c8f53c", fontWeight: 700 }}>BADMINTON ACADEMY</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>Where champions</span>
            <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, backgroundImage: "linear-gradient(100deg, #d9ff4a, #7cf0a0 50%, #38e1ff)", backgroundClip: "text", color: "transparent" }}>
              take flight.
            </span>
            <span style={{ marginTop: 22, fontSize: 26, color: "rgba(255,255,255,0.65)", lineHeight: 1.35 }}>
              Certified coaches · Pro-grade courts · Batches for every age and level
            </span>
          </div>

          <div style={{ display: "flex" }}>
            <span style={{ display: "flex", padding: "14px 28px", borderRadius: 18, background: "#c8f53c", color: "#05070f", fontSize: 26, fontWeight: 800 }}>
              Book your first session →
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
