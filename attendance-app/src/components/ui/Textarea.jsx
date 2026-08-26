import { useId, useState } from "react";

export default function Textarea({ label, hint, error, rows = 4, disabled = false, id, style, ...rest }) {
  const reactId = useId();
  const fieldId = id || reactId;
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "var(--danger-500)" : focused ? "var(--green-400)" : "var(--border-default)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", ...style }}>
      {label && (
        <label htmlFor={fieldId} style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          resize: "vertical",
          padding: "var(--space-3)",
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
