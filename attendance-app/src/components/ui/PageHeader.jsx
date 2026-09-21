// 페이지 최상단 제목 영역. 브랜드 그린 밑줄로 본문과 시각적으로 분리해
// "제목만 덩그러니 있는" 밋밋한 느낌을 줄인다. actions는 제목 옆(넓은 화면) 또는
// 아래(좁은 화면)에 배치되는 버튼류.
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: "var(--space-3)",
        paddingBottom: "var(--space-4)", borderBottom: "2px solid var(--green-500)",
      }}
    >
      <div>
        <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>{title}</h1>
        {subtitle && (
          <span style={{ display: "block", marginTop: "var(--space-1)", font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
            {subtitle}
          </span>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
