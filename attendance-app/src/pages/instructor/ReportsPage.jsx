import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { listReportsByCourse } from "../../lib/firestore";
import { createReport } from "../../lib/reports";
import { Card, Select, Input, Button, Alert, Pill } from "../../components/ui";
import { REPORT_STATUS_LABEL } from "../../lib/ui";

const today = new Date().toISOString().slice(0, 10);

export default function InstructorReportsPage({ user, role }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(today);
  const [reports, setReports] = useState(null);
  const [saving, setSaving] = useState(false);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 800 }}>
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>결과보고서</h1>

      <Card style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <Select label="과정" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: 220 }} options={courses.map((c) => ({ value: c.id, label: c.name }))} />
        <Input type="date" label="대상 일자" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button disabled={saving || !courseId} loading={saving} onClick={handleCreate}>일일 결과보고서 생성</Button>
      </Card>
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          보고서 이력
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {reports === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {reports?.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>생성된 보고서가 없습니다.</span>}
          {reports?.map((r) => (
            <Link
              key={r.id}
              to={`/reports/${r.id}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "var(--space-2)", textDecoration: "none", color: "inherit" }}
            >
              <div>
                <strong style={{ font: "var(--type-body-sm)" }}>{r.date}</strong>
                <span style={{ color: "var(--text-muted)", font: "var(--type-caption)", marginLeft: "var(--space-2)" }}>
                  재적 {r.summary?.total ?? 0} · 출석률 {r.summary?.rate ?? 0}%
                </span>
              </div>
              <Pill tone={r.status === "approved" ? "ok" : r.status === "rejected" ? "bad" : r.status === "reviewing" ? "info" : "warn"}>
                {REPORT_STATUS_LABEL[r.status] || r.status}
              </Pill>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
