export default function Card({ children, padding = "lg", style, ...rest }) {
  const pads = { none: 0, sm: "var(--space-4)", md: "var(--space-5)", lg: "var(--space-6)" };
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: pads[padding],
        boxShadow: "var(--shadow-xs)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
