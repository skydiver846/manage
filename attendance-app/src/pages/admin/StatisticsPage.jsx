import { useEffect, useState } from "react";
import { listCourses, listReportsByCourse, computeCourseRisk, listOrgNotificationsByCourse } from "../../lib/firestore";
import { notifyOrg } from "../../lib/notifications";
import { Card, Select, StatCard, Pill, Button, Alert, PageHeader, EmptyState } from "../../components/ui";

function formatTs(ts) {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function StatisticsPage() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [reports, setReports] = useState(null);
  const [risk, setRisk] = useState(null);
  const [orgLog, setOrgLog] = useState(null);
  const [busyUid, setBusyUid] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    listCourses().then((list) => {
      setCourses(list);
      if (list.length) setCourseId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setReports(null);
    setRisk(null);
    setMsg("");
    listReportsByCourse(courseId).then(setReports);
    computeCourseRisk(courseId).then(setRisk);
    reloadOrgLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function reloadOrgLog() {
    return listOrgNotificationsByCourse(courseId).then(setOrgLog);
  }

  async function handleNotifyOrg(student) {
    const defaultReason = `누적 출석률 ${student.rate}% (기준 90% 미달) — 지각 ${student.late}회, 조퇴 ${student.earlyLeave}회, 결석 ${student.absent}회`;
    const reason = window.prompt(`${student.org}에 통보할 사유를 확인/수정해주세요.`, defaultReason);
    if (!reason) return;
    setBusyUid(student.id);
    setMsg("");
    try {
      await notifyOrg(student.id, reason);
      setMsg(`${student.org}에 통보 이력을 기록했습니다 (실제 SMS/이메일 발송사 미연동 — 담당자가 직접 전달 필요).`);
    } catch (err) {
      setMsg("오류: " + err.message);
      setBusyUid(null);
      return;
    }
    setBusyUid(null);
    reloadOrgLog().catch((e) => console.error(e));
  }

  const avgRate = reports?.length
    ? Math.round((reports.reduce((sum, r) => sum + (r.summary?.rate || 0), 0) / reports.length) * 10) / 10
    : null;
  const approvedCount = reports?.filter((r) => r.status === "approved").length ?? 0;
  const atRisk = risk?.students.filter((s) => s.rate < 90) ?? [];
  const maxRate = Math.max(1, ...(reports?.map((r) => r.summary?.rate ?? 0) ?? [1]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 960 }}>
      <PageHeader title="통계" subtitle="과정·날짜별 출석률 추이와 수료 위험자 현황" />

      <Card style={{ display: "flex", alignItems: "flex-end" }}>
        <Select
          label="과정"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          style={{ width: 260 }}
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Card>

      {courseId && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
            <StatCard label="재적 인원" value={risk?.students.length ?? "-"} unit="명" />
            <StatCard label="평균 출석률" value={avgRate ?? "-"} unit="%" accent={avgRate != null && avgRate < 90 ? "clay" : "brand"} />
            <StatCard label="생성된 보고서" value={reports?.length ?? "-"} unit="건" accent="sky" />
            <StatCard label="결재 완료" value={approvedCount} unit="건" accent="amber" />
          </div>

          <Card padding="none">
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
              날짜별 출석률 추이
            </div>
            <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {reports === null && <span style={{ color: "var(--text-muted)" }}>불러오는 중...</span>}
              {reports?.length === 0 && <EmptyState compact message="생성된 보고서가 없습니다." />}
              {reports?.slice().reverse().map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ width: 90, font: "var(--type-caption)", color: "var(--text-muted)", flex: "0 0 auto" }}>{r.date}</span>
                  <div style={{ flex: 1, height: 10, background: "var(--surface-sunken)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${((r.summary?.rate ?? 0) / maxRate) * 100}%`, height: "100%",
                        background: (r.summary?.rate ?? 0) < 90 ? "var(--clay-500)" : "var(--green-400)",
                        borderRadius: "var(--radius-pill)",
                      }}
                    />
                  </div>
                  <span style={{ width: 48, font: "var(--type-mono)", fontSize: 13, textAlign: "right", flex: "0 0 auto" }}>{r.summary?.rate ?? 0}%</span>
                </div>
              ))}
            </div>
          </Card>

          {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

          <Card padding="none">
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
              수료 위험자 (출석률 90% 미만, {atRisk.length}명)
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {risk === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
              {risk && atRisk.length === 0 && <EmptyState compact message="수료 위험자가 없습니다." />}
              {atRisk.sort((a, b) => a.rate - b.rate).map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  <div>
                    <strong style={{ font: "var(--type-body-sm)" }}>{s.name}</strong>
                    <span style={{ color: "var(--text-muted)", font: "var(--type-caption)", marginLeft: "var(--space-2)" }}>
                      {s.loginId} · 지각 {s.late}회 · 조퇴 {s.earlyLeave}회 · 결석 {s.absent}회{s.org ? ` · ${s.org}` : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <Pill tone={s.rate < 80 ? "bad" : "warn"}>{s.rate}%</Pill>
                    {s.org ? (
                      <Button size="sm" variant="secondary" disabled={busyUid === s.id} onClick={() => handleNotifyOrg(s)}>
                        {busyUid === s.id ? "처리 중..." : "소속기관 통보"}
                      </Button>
                    ) : (
                      <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>소속기관 미등록</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="none">
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
              소속기관 통보 이력 ({orgLog?.length ?? 0}건)
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {orgLog === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
              {orgLog?.length === 0 && <EmptyState compact message="통보 이력이 없습니다." />}
              {orgLog?.map((n) => (
                <div key={n.id} style={{ padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
                    <strong style={{ font: "var(--type-body-sm)" }}>{n.studentName} → {n.org}</strong>
                    <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>{formatTs(n.sentAt)}</span>
                  </div>
                  <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{n.reason}</span>
                  <Pill tone="warn">발송 대기 (수동 전달 필요)</Pill>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
