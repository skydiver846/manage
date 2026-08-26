import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCourses, createCourse, listAllUsers } from "../../lib/firestore";
import { Card, Input, Select, Button, Alert } from "../../components/ui";

export default function CoursesPage() {
  const [courses, setCourses] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState({ name: "", type: "신임교육", startDate: "", endDate: "" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    setCourses(await listCourses());
  }

  useEffect(() => {
    reload();
    listAllUsers().then((users) => setInstructors(users.filter((u) => u.role === "INS")));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await createCourse(form);
      setForm({ name: "", type: "신임교육", startDate: "", endDate: "" });
      setMsg("과정을 생성했습니다.");
    } catch (err) {
      setMsg("오류: " + err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    reload().catch((e) => console.error(e));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>
      <div>
        <span style={{ font: "var(--type-caption)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
          과정 관리
        </span>
        <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>과정 관리</h1>
      </div>

      <Card>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>새 과정 등록</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            <Input label="과정명" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 신임소방사 133기" />
            <Select
              label="유형"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={[
                { value: "신임교육", label: "신임교육" },
                { value: "전문교육", label: "전문교육" },
                { value: "자격취득", label: "자격취득" },
                { value: "직무전문", label: "직무전문" },
              ]}
            />
            <Input type="date" label="시작일" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input type="date" label="종료일" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Button type="submit" loading={saving} style={{ width: 140 }}>과정 등록</Button>
          {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}
          {instructors.length === 0 && (
            <Alert tone="warning">
              아직 등록된 교관(INS) 계정이 없습니다 — 계정 관리에서 먼저 만들면 과정 상세에서 담당 교관을 지정할 수 있습니다.
            </Alert>
          )}
        </form>
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          과정 목록
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {courses === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {courses?.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>등록된 과정이 없습니다.</span>}
          {courses?.map((c) => (
            <Link
              key={c.id}
              to={`/admin/courses/${c.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--border-subtle)",
                textDecoration: "none",
                color: "var(--text-strong)",
                transition: "var(--transition-base)",
              }}
            >
              <span style={{ font: "var(--type-body-sm)", fontWeight: 600 }}>{c.name}</span>
              <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
                {c.type} · {c.startDate}~{c.endDate}
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
