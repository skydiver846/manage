import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listReportsByStatus } from "../../lib/firestore";
import { decideReport } from "../../lib/reports";
import { Card, Input, Button, Alert, Pill } from "../../components/ui";
import { REPORT_STATUS_LABEL } from "../../lib/ui";

export default function ApprovalInboxPage() {
  const [reports, setReports] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [noteDraft, setNoteDraft] = useState({});
  const [msg, setMsg] = useState("");

  async function reload() {
    setReports(await listReportsByStatus("reviewing"));
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
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>결재 대기함</h1>
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          결재 대기 ({reports?.length ?? 0}건)
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {reports === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {reports?.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>결재 대기 중인 보고서가 없습니다.</span>}
          {reports?.map((r) => (
            <div key={r.id} style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
                <Link to={`/reports/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <strong style={{ font: "var(--type-body-sm)" }}>{r.courseName} · {r.date}</strong>
                </Link>
                <Pill tone="info">{REPORT_STATUS_LABEL[r.status] || r.status}</Pill>
              </div>
              <div style={{ font: "var(--type-body-sm)", color: "var(--text-body)" }}>
                재적 {r.summary?.total ?? 0} · 출석 {r.summary?.present ?? 0} · 지각 {r.summary?.late ?? 0} ·
                조퇴 {r.summary?.earlyLeave ?? 0} · 결석 {r.summary?.absent ?? 0} · 출석률 {r.summary?.rate ?? 0}%
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
    </div>
  );
}
