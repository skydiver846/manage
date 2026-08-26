export default function Avatar({ name = "", size = 36, tone = "brand" }) {
  const tones = {
    brand: ["var(--green-100)", "var(--green-700)"],
    neutral: ["var(--neutral-200)", "var(--neutral-700)"],
  };
  const [bg, fg] = tones[tone] || tones.brand;
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        font: "var(--type-label)",
        fontSize: size * 0.38,
        flex: "0 0 auto",
      }}
    >
      {initials}
    </span>
  );
}
