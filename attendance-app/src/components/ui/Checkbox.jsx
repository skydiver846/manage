import { useId } from "react";

export default function Checkbox({ label, checked, onChange, disabled = false, id, style }) {
  const reactId = useId();
  const fieldId = id || reactId;
  return (
    <label
      htmlFor={fieldId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        cursor: disabled ? "not-allowed" : "pointer",
        font: "var(--type-body-sm)",
        color: "var(--text-body)",
        ...style,
      }}
    >
      <input
        id={fieldId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ width: 16, height: 16, accentColor: "var(--green-500)" }}
      />
      {label}
    </label>
  );
}
