import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReport, getUserDoc } from "../../lib/firestore";
import { Card, Button, Pill } from "../../components/ui";
import { REPORT_STATUS_LABEL } from "../../lib/ui";

const STEP_LABEL = { 작성: "작성", "검토·상신": "검토·상신", 결재: "결재" };

function formatTs(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [names, setNames] = useState({});
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getReport(reportId).then(async (r) => {
      if (!r) { setNotFound(true); return; }
      setReport(r);
      const nameMap = {};
      for (const step of r.approvalPath || []) {
        if (step.who && !nameMap[step.who]) {
          const u = await getUserDoc(step.who);
          nameMap[step.who] = u?.name || step.who;
        }
      }
      setNames(nameMap);
    });
  }, [reportId]);

  if (notFound) return <Card>보고서를 찾을 수 없습니다.</Card>;
  if (!report) return <p style={{ color: "var(--text-muted)" }}>불러오는 중...</p>;

  const s = report.summary || {};
  const docNo = `R-${report.date}-${report.id.slice(0, 6).toUpperCase()}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 760 }}>
      <div data-no-print style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="ghost" onClick={() => navigate(-1)}>← 목록으로</Button>
        <Button onClick={() => window.print()}>PDF로 저장 / 인쇄</Button>
      </div>

      <div data-print-area>
        <Card style={{ padding: "var(--space-8)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "center", textAlign: "center", marginBottom: "var(--space-6)" }}>
            <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>소방학교</span>
            <h1 style={{ font: "var(--type-h1)", color: "var(--text-strong)" }}>
              {report.type === "daily" ? "일일" : report.type === "weekly" ? "주간" : "과정종료"} 출석결과보고서
            </h1>
            <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
              문서번호: {docNo}
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-6)" }}>
            <tbody>
              {[
                ["과정명", report.courseName],
                ["대상 일자", report.date],
                ["작성일시", formatTs(report.createdAt)],
                ["상태", REPORT_STATUS_LABEL[report.status] || report.status],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", background: "var(--surface-sunken)", font: "var(--type-label)", color: "var(--text-strong)", width: 140 }}>{k}</th>
                  <td style={{ padding: "10px 12px", font: "var(--type-body-sm)" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ font: "var(--type-label)", color: "var(--text-strong)", marginBottom: "var(--space-3)" }}>출결 집계</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "var(--space-6)" }}>
            <thead>
              <tr>
                {["재적", "출석", "지각", "조퇴", "결석", "출석률"].map((h) => (
                  <th key={h} style={{ border: "1px solid var(--border-default)", padding: "10px", background: "var(--surface-sunken)", font: "var(--type-label)", color: "var(--text-strong)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[s.total ?? 0, s.present ?? 0, s.late ?? 0, s.earlyLeave ?? 0, s.absent ?? 0, `${s.rate ?? 0}%`].map((v, i) => (
                  <td key={i} style={{ border: "1px solid var(--border-default)", padding: "10px", textAlign: "center", font: "var(--type-mono)", fontWeight: 600 }}>{v}</td>
                ))}
              </tr>
            </tbody>
          </table>

          <div style={{ font: "var(--type-label)", color: "var(--text-strong)", marginBottom: "var(--space-3)" }}>결재</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: "1px solid var(--border-default)" }}>
            {["작성", "검토·상신", "결재"].map((stepName, i) => {
              const step = (report.approvalPath || []).find((p) => p.step === stepName);
              return (
                <div key={stepName} style={{ borderLeft: i > 0 ? "1px solid var(--border-default)" : "none", display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "var(--surface-sunken)", padding: "8px", textAlign: "center", font: "var(--type-label)", borderBottom: "1px solid var(--border-default)" }}>
                    {stepName}
                  </div>
                  <div style={{ padding: "var(--space-4)", minHeight: 90, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {step ? (
                      <>
                        <span style={{ font: "var(--type-body-sm)", fontWeight: 700 }}>{names[step.who] || step.who}</span>
                        <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{formatTs(step.at)}</span>
                        {step.status && step.status !== "완료" && (
                          <Pill tone={step.status === "승인" ? "ok" : "bad"}>{step.status}</Pill>
                        )}
                        {step.note && <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>{step.note}</span>}
                      </>
                    ) : (
                      <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>대기</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
