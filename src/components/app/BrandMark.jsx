/**
 * Khanak logo: a bill with a ringing coin (the "khanak" of coins in the galla) and the name.
 * `light` draws the bill white for dark backgrounds (sidebar, top bar); otherwise teal for light backgrounds.
 */
export default function BrandMark({ size = 28, light = true, showName = true, nameSize, sx = {} }) {
  const paper = light ? "#ffffff" : "#0b4f5c";
  const lines = light ? "#b9cfd2" : "#7fb1b8";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32, ...sx }}>
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Khanak" style={{ flex: "none" }}>
        <path d="M26 14 h52 a8 8 0 0 1 8 8 v80 l-7 -6 -7 6 -7 -6 -7 6 -7 -6 -7 6 -7 -6 -7 6 -7 -6 v-76 a8 8 0 0 1 8 -8z" fill={paper} />
        <rect x="32" y="34" width="34" height="6" rx="3" fill={lines} />
        <rect x="32" y="48" width="40" height="6" rx="3" fill={lines} />
        <rect x="32" y="62" width="26" height="6" rx="3" fill={lines} />
        <circle cx="84" cy="74" r="22" fill="#f2a93b" />
        <circle cx="84" cy="74" r="16" fill="none" stroke="#c9821b" strokeWidth="2.5" />
        <text x="84" y="82" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="22" fill="#5a3600">₹</text>
        <path d="M108 56 q6 6 0 12 M113 50 q11 12 0 24" fill="none" stroke="#f2a93b" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      {showName && (
        <span style={{ fontWeight: 800, fontSize: nameSize || size * 0.72, letterSpacing: 0.3, textTransform: "none", lineHeight: 1, color: light ? "#fff" : "#0b4f5c" }}>khanak</span>
      )}
    </span>
  );
}
