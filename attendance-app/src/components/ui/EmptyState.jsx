// 목록이 비어있을 때 쓰는 공용 표시. 예전에는 회색 텍스트 한 줄만 덩그러니
// 있어서 밋밋했던 것을, 아이콘 + 문구(+선택적 설명·액션 버튼)로 보강.
export default function EmptyState({ message, description, action, compact = false }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "var(--space-2)", padding: compact ? "var(--space-6) var(--space-5)" : "var(--space-8) var(--space-5)",
        textAlign: "center",
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" style={{ opacity: 0.7 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5 5.25 4.5h13.5l1.5 3M3.75 7.5v10.5a1 1 0 0 0 1 1h14.5a1 1 0 0 0 1-1V7.5M3.75 7.5h16.5M8.25 11.5h7.5" />
      </svg>
      <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{message}</span>
      {description && <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>{description}</span>}
      {action}
    </div>
  );
}
