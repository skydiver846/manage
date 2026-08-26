const TONE_COLORS = {
  ok: ["var(--success-50)", "var(--green-700)"],
  warn: ["var(--warning-50)", "#9a6512"],
  bad: ["var(--danger-50)", "#9c3d2c"],
  info: ["var(--info-50)", "#1f5a86"],
  mute: ["var(--neutral-100)", "var(--neutral-600)"],
};

const STATUS_TONE = {
  present: "ok", pending: "info", late: "warn", earlyLeave: "warn", absent: "bad", excused: "mute",
  approved: "ok", rejected: "bad", reviewing: "info", submitted: "warn",
};

export default function Pill({ tone, status, children }) {
  const t = tone || STATUS_TONE[status] || "mute";
  const [bg, fg] = TONE_COLORS[t] || TONE_COLORS.mute;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 10px",
        borderRadius: "var(--radius-pill)",
        font: "var(--type-caption)",
        fontWeight: 700,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
