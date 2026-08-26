import Card from "./Card";

export default function StatCard({ label, value, unit, caption, accent = "brand" }) {
  const accents = {
    brand: "var(--green-500)", sky: "var(--sky-500)", amber: "var(--amber-500)", clay: "var(--clay-500)",
  };
  return (
    <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <span style={{ font: "var(--type-caption)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ font: "var(--type-h2)", color: accents[accent] || accents.brand }}>{value}</span>
        {unit && <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{unit}</span>}
      </div>
      {caption && <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>{caption}</span>}
    </Card>
  );
}
