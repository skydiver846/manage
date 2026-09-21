import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listReportsByStatus, listReportsByStatuses } from "../../lib/firestore";
import { decideReport } from "../../lib/reports";
import { Card, Input, Button, Alert, Pill, PageHeader, EmptyState } from "../../components/ui";
import { REPORT_STATUS_LABEL, REPORT_TYPE_LABEL } from "../../lib/ui";

function formatTs(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ApprovalInboxPage() {
  const [reports, setReports] = useState(null);
  const [history, setHistory] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [noteDraft, setNoteDraft] = useState({});
  const [msg, setMsg] = useState("");

  async function reload() {
    const [pending, decided] = await Promise.all([
      listReportsByStatus("reviewing"),
      listReportsByStatuses(["approved", "rejected"]),
    ]);
    setReports(pending);
    setHistory(decided);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleDecide(id, decision) {
    setBusyId(id);
    setMsg("");
    try {
      await decideReport(id, decision, noteDraft[id] || "");
      setMsg(decision === "approved" ? "보고서를 승인했습니다." : "보고서를 반려했습니다.");
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
      <PageHeader title="결재 대기함" />
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          결재 대기 ({reports?.length ?? 0}건)
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {reports === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {reports?.length === 0 && <EmptyState compact message="결재 대기 중인 보고서가 없습니다." />}
          {reports?.map((r) => (
            <div key={r.id} style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
                <Link to={`/reports/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <strong style={{ font: "var(--type-body-sm)" }}>{r.courseName} · {r.date}</strong>
                  <span style={{ color: "var(--text-subtle)", font: "var(--type-caption)", marginLeft: "var(--space-2)" }}>
                    [{REPORT_TYPE_LABEL[r.type] || r.type}]
                  </span>
                </Link>
                <Pill tone="info">{REPORT_STATUS_LABEL[r.status] || r.status}</Pill>
              </div>
              <div style={{ font: "var(--type-body-sm)", color: "var(--text-body)" }}>
                {r.type === "enrollment" ? (
                  `등록 인원 ${r.roster?.length ?? 0}명`
                ) : (
                  <>
                    재적 {r.summary?.total ?? 0} · 출석 {r.summary?.present ?? 0} · 지각 {r.summary?.late ?? 0} ·
                    조퇴 {r.summary?.earlyLeave ?? 0} · 결석 {r.summary?.absent ?? 0} · 출석률 {r.summary?.rate ?? 0}%
                  </>
                )}
              </div>
              <Input
                placeholder="결재 의견(선택)"
                value={noteDraft[r.id] || ""}
                onChange={(e) => setNoteDraft({ ...noteDraft, [r.id]: e.target.value })}
                size="sm"
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button size="sm" disabled={busyId === r.id} onClick={() => handleDecide(r.id, "approved")}>승인</Button>
                <Button variant="secondary" size="sm" disabled={busyId === r.id} onClick={() => handleDecide(r.id, "rejected")} style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}>
                  반려
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          결재 완료 내역 ({history?.length ?? 0}건)
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {history === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {history?.length === 0 && <EmptyState compact message="아직 결재를 완료한 보고서가 없습니다." />}
          {history?.map((r) => {
            const decidedAt = (r.approvalPath || []).find((p) => p.step === "결재")?.at;
            return (
              <Link
                key={r.id}
                to={`/reports/${r.id}`}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)",
                  padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <span style={{ font: "var(--type-body-sm)" }}>
                  <strong>{r.courseName}</strong>
                  <span style={{ color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>
                    {r.date} · {r.type === "enrollment" ? `등록 인원 ${r.roster?.length ?? 0}명` : `출석률 ${r.summary?.rate ?? 0}%`}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{formatTs(decidedAt)}</span>
                  <Pill status={r.status}>{REPORT_STATUS_LABEL[r.status] || r.status}</Pill>
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
