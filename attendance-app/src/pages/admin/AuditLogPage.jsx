import { useEffect, useState } from "react";
import { listAuditLogs, getUserDoc } from "../../lib/firestore";
import { Card, Pill, Button, Select, PageHeader, EmptyState } from "../../components/ui";

const CATEGORY_TONE = {
  "계정 변경": "info",
  "출석 확정": "ok",
  "출결 변경": "warn",
  "정정 승인": "ok",
  "정정 반려": "bad",
  "보고서": "info",
};

function formatAt(at) {
  if (!at?.toDate) return "-";
  const d = at.toDate();
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState(null);
  const [names, setNames] = useState({});
  const [category, setCategory] = useState("전체");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  useEffect(() => {
    listAuditLogs(200).then(async (list) => {
      setLogs(list);
      const nameMap = {};
      for (const l of list) {
        if (l.actorUid && !nameMap[l.actorUid]) {
          const u = await getUserDoc(l.actorUid);
          nameMap[l.actorUid] = u?.name || l.actorUid;
        }
      }
      setNames(nameMap);
    });
  }, []);

  const categories = ["전체", ...new Set((logs || []).map((l) => l.category).filter(Boolean))];
  const filtered = logs?.filter((l) => category === "전체" || l.category === category);
  const totalPages = Math.max(1, Math.ceil((filtered?.length ?? 0) / pageSize));
  const pageItems = filtered?.slice(page * pageSize, page * pageSize + pageSize);

  function handleCategoryChange(c) {
    setCategory(c);
    setPage(0);
  }

  function handlePageSizeChange(n) {
    setPageSize(n);
    setPage(0);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 960 }}>
      <PageHeader title="감사로그 조회" />

      {logs && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryChange(c)}
                style={{
                  font: "var(--type-caption)", fontWeight: 600, padding: "6px 12px",
                  borderRadius: "var(--radius-pill)", cursor: "pointer", whiteSpace: "nowrap",
                  background: category === c ? "var(--green-500)" : "var(--surface-card)",
                  color: category === c ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${category === c ? "var(--green-500)" : "var(--border-subtle)"}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <Select
            value={String(pageSize)}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            style={{ width: 120 }}
            options={[
              { value: "10", label: "10개씩 보기" },
              { value: "20", label: "20개씩 보기" },
            ]}
          />
        </div>
      )}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          변경 이력 ({filtered?.length ?? 0}건)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-sunken)" }}>
                {["일시", "행위자", "대상", "행위", "사유", "구분"].map((h) => (
                  <th key={h} style={{ textAlign: "left", font: "var(--type-caption)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", padding: "10px var(--space-5)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs === null && (
                <tr><td colSpan={6} style={{ padding: "var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</td></tr>
              )}
              {filtered?.length === 0 && (
                <tr><td colSpan={6}><EmptyState compact message="기록이 없습니다." /></td></tr>
              )}
              {pageItems?.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 ? "var(--neutral-50)" : "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px var(--space-5)", font: "var(--type-body-sm)", whiteSpace: "nowrap" }}>{formatAt(l.at)}</td>
                  <td style={{ padding: "10px var(--space-5)", font: "var(--type-body-sm)", whiteSpace: "nowrap" }}>
                    {names[l.actorUid] || "-"} <span style={{ color: "var(--text-subtle)", font: "var(--type-caption)" }}>({l.actorRole})</span>
                  </td>
                  <td style={{ padding: "10px var(--space-5)", font: "var(--type-caption)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{l.target}</td>
                  <td style={{ padding: "10px var(--space-5)", font: "var(--type-body-sm)" }}>{l.action}</td>
                  <td style={{ padding: "10px var(--space-5)", font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{l.reason || "-"}</td>
                  <td style={{ padding: "10px var(--space-5)" }}>
                    {l.category && <Pill tone={CATEGORY_TONE[l.category] || "mute"}>{l.category}</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered && filtered.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-subtle)" }}>
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>이전</Button>
            <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{page + 1} / {totalPages} 페이지</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>다음</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
