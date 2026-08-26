import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCourse, listPeriods, addPeriod, listAllUsers } from "../../lib/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card, Input, Select, Button, Alert } from "../../components/ui";

const AUTH_OPTS = [
  { value: "qr", label: "QR 스캔" },
  { value: "gps", label: "GPS 위치확인" },
  { value: "nfc", label: "NFC 카드" },
  { value: "manual", label: "버튼 체크" },
];

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    no: "", startTime: "", endTime: "", subject: "", kind: "이론", place: "", authMethod: "manual",
  });

  async function reload() {
    const [c, p] = await Promise.all([getCourse(courseId), listPeriods(courseId)]);
    setCourse(c);
    setPeriods(p);
  }

  useEffect(() => {
    reload();
    listAllUsers().then((users) => setInstructors(users.filter((u) => u.role === "INS")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleAssignInstructor(e) {
    const instructorUid = e.target.value;
    await updateDoc(doc(db, "courses", courseId), { instructorUid: instructorUid || null });
    await reload();
    setMsg("담당 교관을 지정했습니다.");
  }

  async function handleAddPeriod(e) {
    e.preventDefault();
    setMsg("");
    try {
      await addPeriod(courseId, form);
      setForm({ no: "", startTime: "", endTime: "", subject: "", kind: "이론", place: "", authMethod: "manual" });
      setMsg("교시를 추가했습니다.");
    } catch (err) {
      setMsg("오류: " + err.message);
      return;
    }
    reload().catch((e) => console.error(e));
  }

  if (!course) return <p style={{ color: "var(--text-muted)" }}>불러오는 중...</p>;

  const assignedInstructor = instructors.find((i) => i.id === course.instructorUid);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>{course.name}</h1>
          <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
            {course.type} · {course.startDate}~{course.endDate}
          </span>
        </div>
        <Link to={`/admin/courses/${courseId}/upload`}>
          <Button variant="secondary">수강생 명단 엑셀 업로드</Button>
        </Link>
      </div>

      <Card>
        <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>담당 교관</span>
        <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <Select
            value={course.instructorUid || ""}
            onChange={handleAssignInstructor}
            style={{ width: 260 }}
            options={[
              { value: "", label: "미지정" },
              ...instructors.map((i) => ({ value: i.id, label: `${i.name} (${i.loginId})` })),
            ]}
          />
          {assignedInstructor && <span style={{ font: "var(--type-body-sm)", color: "var(--green-600)" }}>현재: {assignedInstructor.name}</span>}
        </div>
      </Card>

      <Card>
        <form onSubmit={handleAddPeriod} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>교시 추가</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-4)" }}>
            <Input label="교시" required value={form.no} onChange={(e) => setForm({ ...form, no: e.target.value })} placeholder="1교시" />
            <Input type="time" label="시작시간" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Input type="time" label="종료시간" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            <Select
              label="구분"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              options={[{ value: "이론", label: "이론" }, { value: "실습", label: "실습" }]}
            />
            <Input label="과목명" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="소방학개론" />
            <Input label="장소" required value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="제1강의실" />
            <Select label="인증방식" value={form.authMethod} onChange={(e) => setForm({ ...form, authMethod: e.target.value })} options={AUTH_OPTS} />
          </div>
          <Button type="submit" style={{ width: 140 }}>교시 추가</Button>
          {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}
        </form>
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          시간표
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {periods.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>등록된 교시가 없습니다.</span>}
          {periods.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex", gap: "var(--space-4)", alignItems: "center",
                padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)",
                font: "var(--type-body-sm)",
              }}
            >
              <strong style={{ minWidth: 48 }}>{p.no}</strong>
              <span style={{ font: "var(--type-mono)" }}>{p.startTime}–{p.endTime}</span>
              <span>{p.subject}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                {p.kind} · {p.place} · {AUTH_OPTS.find((o) => o.value === p.authMethod)?.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
