import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { logout } from "../lib/auth";

const ROLE_LABELS = {
  STU: "교육생",
  INS: "담당 교수(교관)",
  ADM: "관리자",
  APR: "결재권자",
};

const NAV = [
  { group: "출결", path: "/student", label: "출결 대시보드", tab: "홈", roles: ["STU"] },
  { group: "출결", path: "/student/corrections", label: "출결 정정 요청", tab: "정정요청", roles: ["STU"] },
  { group: "출결", path: "/instructor/attendance", label: "실시간 출석현황", tab: "출석현황", roles: ["INS", "ADM"] },
  { group: "출결", path: "/instructor/corrections", label: "정정 승인/반려", tab: "정정승인", roles: ["INS", "ADM"] },
  { group: "보고서", path: "/instructor/reports", label: "결과보고서 작성", tab: "보고서", roles: ["INS", "ADM"] },
  { group: "보고서", path: "/admin/reports", label: "결과보고서 관리", tab: "보고서관리", roles: ["ADM"] },
  { group: "관리", path: "/admin/courses", label: "과정 관리", tab: "과정", roles: ["ADM"] },
  { group: "관리", path: "/admin/accounts", label: "계정 관리", tab: "계정", roles: ["ADM"] },
  { group: "관리", path: "/admin/statistics", label: "통계", tab: "통계", roles: ["ADM"] },
  { group: "관리", path: "/admin/audit-log", label: "감사로그 조회", tab: "감사로그", roles: ["ADM"] },
  { group: "결재", path: "/approval", label: "결재 대기함", tab: "결재", roles: ["APR"] },
];

const NARROW_BREAKPOINT = 900;

export default function Layout({ role }) {
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < NARROW_BREAKPOINT);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => setNavOpen(false), [location.pathname]);

  const items = NAV.filter((n) => n.roles.includes(role));
  const groups = [...new Set(items.map((i) => i.group))].map((g) => ({
    name: g, items: items.filter((i) => i.group === g),
  }));
  const tabItems = items.slice(0, 4);

  const navLinkStyle = ({ isActive }) => ({
    padding: "9px 10px",
    borderRadius: "var(--radius-md)",
    color: isActive ? "#fff" : "#cfe3da",
    background: isActive ? "var(--green-700)" : "transparent",
    textDecoration: "none",
    font: "var(--type-body-sm)",
    fontWeight: isActive ? 700 : 400,
    transition: "var(--transition-base)",
  });

  const navGroups = (
    <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {groups.map((g) => (
        <div key={g.name} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: "var(--text-md)", lineHeight: 1.2, fontWeight: 700, letterSpacing: "var(--tracking-wide)",
              textTransform: "uppercase", color: "var(--amber-400)",
              padding: "var(--space-1) var(--space-2) var(--space-2)",
              borderBottom: "1px solid rgba(224,166,75,0.3)", marginBottom: "var(--space-1)",
            }}
          >
            {g.name}
          </span>
          {g.items.map((it) => (
            <NavLink key={it.path} to={it.path} end style={navLinkStyle}>
              {it.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {!isNarrow && (
        <aside
          style={{
            width: "var(--sidebar-width)", flex: "0 0 var(--sidebar-width)",
            background: "var(--surface-inverse)", color: "#cfe3da",
            padding: "var(--space-5) var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-5)",
            position: "sticky", top: 0, alignSelf: "flex-start", maxHeight: "100vh", overflow: "auto",
          }}
        >
          <Brand role={role} />
          {navGroups}
          <LogoutButton />
        </aside>
      )}

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface-page)" }}>
        <header
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)",
            justifyContent: isNarrow ? "flex-start" : "flex-end",
            height: 64, padding: "0 var(--space-6)",
            background: "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)",
            position: "sticky", top: 0, zIndex: 10,
          }}
        >
          {isNarrow ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <img src="/emblem.png?v=2" alt="소방학교" style={{ height: 24, width: "auto" }} />
              <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>출석관리시스템</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <img src="/emblem.png?v=2" alt="소방학교" style={{ height: 40, width: "auto" }} />
              <span style={{ font: "var(--type-h3)", fontWeight: 800, color: "var(--text-strong)" }}>
                전남광주통합특별시 소방학교
              </span>
            </div>
          )}
        </header>

        <div style={{ padding: "var(--space-6)", flex: 1, paddingBottom: isNarrow ? 88 : "var(--space-6)" }}>
          <Outlet />
        </div>
      </main>

      {isNarrow && (
        <nav
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, display: "flex",
            background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-lg)", zIndex: 30, padding: "8px 4px",
          }}
        >
          {tabItems.map((it) => (
            <NavLink
              key={it.path}
              to={it.path}
              end
              style={({ isActive }) => ({
                flex: 1, minHeight: 56, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                textDecoration: "none",
                color: isActive ? "var(--green-600)" : "var(--text-muted)",
                fontWeight: isActive ? 700 : 400,
              })}
            >
              <span style={{ font: "var(--type-caption)", fontSize: 12, textAlign: "center" }}>{it.tab}</span>
            </NavLink>
          ))}
          {items.length > tabItems.length && (
            <button
              onClick={() => setNavOpen(true)}
              style={{ flex: 1, minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", font: "var(--type-caption)", fontSize: 12 }}
            >
              전체 메뉴
            </button>
          )}
        </nav>
      )}

      {isNarrow && navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(8,38,32,.5)", zIndex: 50, display: "flex" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(300px, 84vw)", background: "var(--surface-inverse)", color: "#cfe3da", padding: "var(--space-5) var(--space-3)", overflow: "auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <Brand role={role} />
            {navGroups}
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}

function Brand({ role }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 var(--space-2)" }}>
      <span style={{ fontSize: "var(--text-lg)", lineHeight: 1.2, fontWeight: 800, color: "#fff" }}>출석관리시스템</span>
      <span style={{ fontSize: "var(--text-sm)", lineHeight: 1.2, fontWeight: 500, opacity: 0.7 }}>{ROLE_LABELS[role] || role}</span>
    </div>
  );
}

function LogoutButton() {
  return (
    <button
      onClick={logout}
      style={{ marginTop: "auto", height: 38, borderRadius: "var(--radius-md)", border: "1px solid rgba(207,227,218,.25)", background: "transparent", color: "#cfe3da", font: "var(--type-label)", cursor: "pointer" }}
    >
      로그아웃
    </button>
  );
}
