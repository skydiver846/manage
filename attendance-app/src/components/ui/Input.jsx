import { useId, useState } from "react";

export default function Input({ label, hint, error, size = "md", disabled = false, id, style, ...rest }) {
  const reactId = useId();
  const fieldId = id || reactId;
  const [focused, setFocused] = useState(false);
  const heights = { sm: "var(--control-sm)", md: "var(--control-md)", lg: "var(--control-lg)" };
  const borderColor = error ? "var(--danger-500)" : focused ? "var(--green-400)" : "var(--border-default)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", ...style }}>
      {label && (
        <label htmlFor={fieldId} style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>
          {label}
        </label>
      )}
      <input
        id={fieldId}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: heights[size] || heights.md,
          padding: "0 var(--space-3)",
          background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focused && !error ? "var(--ring)" : "none",
          font: "var(--type-body-sm)",
          color: "var(--text-strong)",
          outline: "none",
          transition: "var(--transition-base)",
        }}
        {...rest}
      />
      {(hint || error) && (
        <span style={{ font: "var(--type-caption)", color: error ? "var(--danger-500)" : "var(--text-muted)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
