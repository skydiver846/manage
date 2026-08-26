export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: { height: "var(--control-sm)", padding: "0 var(--space-3)", font: "var(--text-sm)" },
    md: { height: "var(--control-md)", padding: "0 var(--space-5)", font: "var(--text-sm)" },
    lg: { height: "var(--control-lg)", padding: "0 var(--space-6)", font: "var(--text-md)" },
  };
  const variants = {
    primary: { background: "var(--action-primary)", color: "#fff", border: "1px solid transparent" },
    secondary: { background: "var(--surface-card)", color: "var(--text-brand)", border: "1px solid var(--border-default)" },
    ghost: { background: "transparent", color: "var(--text-brand)", border: "1px solid transparent" },
    danger: { background: "var(--danger-500)", color: "#fff", border: "1px solid transparent" },
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        height: s.height,
        padding: s.padding,
        width: fullWidth ? "100%" : "auto",
        font: `var(--weight-semibold) ${s.font}/1 var(--font-sans)`,
        borderRadius: "var(--radius-md)",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        transition: "var(--transition-base)",
        whiteSpace: "nowrap",
        ...v,
        ...style,
      }}
      {...rest}
    >
      {loading ? "처리 중..." : children}
    </button>
  );
}
