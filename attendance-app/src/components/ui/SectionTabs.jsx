import { useState } from "react";

/**
 * 제목만 보이다가 누르면 그 아래에 내용이 펼쳐지는 가로 탭 헤더.
 * 눌러지는 버튼임을 알 수 있도록 마우스 오버 시 배경이 바뀌고, 선택된 탭에는
 * 화살표가 뒤집혀서 "펼쳐짐" 상태를 보여준다. 내용(children)은 호출부에서
 * active 값에 따라 조건부로 렌더링한다.
 */
export default function SectionTabs({ tabs, active, onChange }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ display: "flex" }}>
      {tabs.map((t, i) => {
        const isActive = active === t.key;
        const isHovered = hovered === t.key && !isActive;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(isActive ? null : t.key)}
            onMouseEnter={() => setHovered(t.key)}
            onMouseLeave={() => setHovered((h) => (h === t.key ? null : h))}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "var(--space-2)", textAlign: "left", padding: "var(--space-4) var(--space-5)",
              background: isActive ? "var(--surface-card)" : isHovered ? "var(--action-ghost-hover)" : "var(--surface-sunken)",
              border: "none", borderLeft: i > 0 ? "1px solid var(--border-subtle)" : "none",
              borderBottom: `2px solid ${isActive ? "var(--green-600)" : "transparent"}`,
              cursor: "pointer", font: "var(--type-label)",
              color: isActive ? "var(--text-strong)" : "var(--text-muted)",
              transition: "var(--transition-base)",
            }}
          >
            <span>{t.label}</span>
            <span
              style={{
                font: "var(--type-caption)", color: "var(--text-subtle)",
                transform: isActive ? "rotate(180deg)" : "none", transition: "var(--transition-base)",
              }}
            >
              ▾
            </span>
          </button>
        );
      })}
    </div>
  );
}
