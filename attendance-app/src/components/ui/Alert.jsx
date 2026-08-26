export default function Alert({ children, title, tone = "info", style }) {
  const tones = {
    info: { bg: "var(--info-50)", bd: "#bfdcef", fg: "#1f5a86", ic: "var(--info-500)" },
    success: { bg: "var(--success-50)", bd: "var(--green-200)", fg: "var(--green-700)", ic: "var(--green-500)" },
    warning: { bg: "var(--warning-50)", bd: "#f0dcb0", fg: "#9a6512", ic: "var(--warning-500)" },
    danger: { bg: "var(--danger-50)", bd: "#f0cabf", fg: "#9a3324", ic: "var(--danger-500)" },
  };
  const t = tones[tone] || tones.info;
  const icon = { info: "ⓘ", success: "✓", warning: "!", danger: "×" }[tone];

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "flex-start",
        padding: "var(--space-4)",
        background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: "var(--radius-md)",
        color: t.fg,
        ...style,
      }}
    >
      <span style={{ flex: "0 0 auto", fontWeight: 700, color: t.ic }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {title && <span style={{ font: "var(--type-label)", color: t.fg }}>{title}</span>}
        <span style={{ font: "var(--type-body-sm)" }}>{children}</span>
      </div>
    </div>
  );
}
