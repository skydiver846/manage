import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { listReportsByCourse } from "../../lib/firestore";
import { createReport, createEnrollmentReport, deleteReport } from "../../lib/reports";
import { Card, Select, Input, Button, Alert, Pill } from "../../components/ui";
import { REPORT_STATUS_LABEL, REPORT_TYPE_LABEL } from "../../lib/ui";

const today = new Date().toISOString().slice(0, 10);

export default function InstructorReportsPage({ user, role }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(today);
  const [reports, setReports] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      const base = collection(db, "courses");
      const q = role === "INS" ? query(base, where("instructorUid", "==", user.uid)) : base;
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCourses(list);
      if (list.length) setCourseId(list[0].id);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid, role]);

  async function reload() {
    if (!courseId) return;
    setReports(await listReportsByCourse(courseId));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleCreate() {
    setSaving(true);
    setMsg("");
    try {
      const res = await createReport(courseId, date);
      setMsg(`보고서를 생성했습니다 — 재적 ${res.summary.total}명, 출석률 ${res.summary.rate}%`);
    } catch (err) {
      setMsg("오류: " + err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    reload().catch((e) => console.error(e));
  }

  async function handleCreateEnrollment() {
    setSavingEnrollment(true);
    setMsg("");
    try {
      const res = await createEnrollmentReport(courseId);
      setMsg(`입교등록 결과보고서를 생성했습니다 — 등록 인원 ${res.count}명`);
    } catch (err) {
      setMsg("오류: " + err.message);
      setSavingEnrollment(false);
      return;
    }
    setSavingEnrollment(false);
    reload().catch((e) => console.error(e));
  }

  async function handleDelete(id, date) {
    if (!window.confirm(`${date} 결과보고서를 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    setDeletingId(id);
    setMsg("");
    try {
      await deleteReport(id);
      setMsg("보고서를 삭제했습니다.");
    } catch (err) {
      setMsg("오류: " + err.message);
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    reload().catch((e) => console.error(e));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 800 }}>
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>결과보고서</h1>

      <Card style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <Select label="과정" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: 220 }} options={courses.map((c) => ({ value: c.id, label: c.name }))} />
        <Input type="date" label="대상 일자" value={date} onChange={(e) => setDate(e.target.value)} />
        <div style={{ display: "flex", gap: "var(--space-4)" }}>
          <Button disabled={saving || !courseId} loading={saving} onClick={handleCreate}>일일 결과보고서 생성</Button>
          <Button
            variant="secondary" disabled={savingEnrollment || !courseId} loading={savingEnrollment}
            onClick={handleCreateEnrollment}
          >
            입교등록 결과보고서 생성
          </Button>
        </div>
      </Card>
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          보고서 이력
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {!courseId && (
            <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>
              {courses.length === 0 ? "등록된 과정이 없습니다." : "먼저 위에서 과정을 선택해주세요."}
            </span>
          )}
          {courseId && reports === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {courseId && reports?.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>생성된 보고서가 없습니다.</span>}
          {reports?.map((r) => (
            <div
              key={r.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "var(--space-2)" }}
            >
              <Link to={`/reports/${r.id}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                <strong style={{ font: "var(--type-body-sm)" }}>{r.date}</strong>
                <span style={{ color: "var(--text-subtle)", font: "var(--type-caption)", marginLeft: "var(--space-2)" }}>
                  [{REPORT_TYPE_LABEL[r.type] || r.type}]
                </span>
                <span style={{ color: "var(--text-muted)", font: "var(--type-caption)", marginLeft: "var(--space-2)" }}>
                  {r.type === "enrollment"
                    ? `등록 인원 ${r.roster?.length ?? 0}명`
                    : `재적 ${r.summary?.total ?? 0} · 출석률 ${r.summary?.rate ?? 0}%`}
                </span>
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Pill tone={r.status === "approved" ? "ok" : r.status === "rejected" ? "bad" : r.status === "reviewing" ? "info" : "warn"}>
                  {REPORT_STATUS_LABEL[r.status] || r.status}
                </Pill>
                {role === "ADM" && r.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={deletingId === r.id}
                    onClick={() => handleDelete(r.id, r.date)}
                    style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}
                  >
                    {deletingId === r.id ? "삭제 중..." : "삭제"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
