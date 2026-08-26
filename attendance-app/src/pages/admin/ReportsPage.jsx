import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listReportsByStatus } from "../../lib/firestore";
import { forwardReport } from "../../lib/reports";
import { Card, Button, Alert, Pill } from "../../components/ui";
import { REPORT_STATUS_LABEL } from "../../lib/ui";

export default function AdminReportsPage() {
  const [reports, setReports] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");

  async function reload() {
    setReports(await listReportsByStatus("submitted"));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleForward(id) {
    setBusyId(id);
    setMsg("");
    try {
      await forwardReport(id);
      setMsg("결재권자에게 상신했습니다.");
    } catch (err) {
      setMsg("오류: " + err.message);
      setBusyId(null);
      return;
    }
    setBusyId(null);
    reload().catch((e) => console.error(e));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 800 }}>
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>결과보고서 관리</h1>
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          상신 대기 ({reports?.length ?? 0}건)
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {reports === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {reports?.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>상신 대기 중인 보고서가 없습니다.</span>}
          {reports?.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <Link to={`/reports/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <strong style={{ font: "var(--type-body-sm)" }}>{r.courseName}</strong>
                <span style={{ color: "var(--text-muted)", font: "var(--type-caption)", marginLeft: "var(--space-2)" }}>
                  {r.date} · 재적 {r.summary?.total ?? 0} · 출석률 {r.summary?.rate ?? 0}%
                </span>
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Pill tone="warn">{REPORT_STATUS_LABEL[r.status] || r.status}</Pill>
                <Button size="sm" disabled={busyId === r.id} onClick={() => handleForward(r.id)}>
                  {busyId === r.id ? "처리 중..." : "결재 요청"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
