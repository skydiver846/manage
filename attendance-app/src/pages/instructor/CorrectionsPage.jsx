import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { listPendingCorrectionsForCourse, getUserDoc } from "../../lib/firestore";
import { decideCorrection } from "../../lib/corrections";
import { Card, Select, Input, Button, Alert, Pill } from "../../components/ui";
import { STATUS_LABEL } from "../../lib/ui";

export default function InstructorCorrectionsPage({ user, role }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [items, setItems] = useState(null);
  const [names, setNames] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");
  const [noteDraft, setNoteDraft] = useState({});

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
    const list = await listPendingCorrectionsForCourse(courseId);
    setItems(list);
    const nameMap = {};
    for (const c of list) {
      if (!nameMap[c.uid]) {
        const u = await getUserDoc(c.uid);
        nameMap[c.uid] = u?.name || c.uid;
      }
    }
    setNames(nameMap);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleDecide(id, decision) {
    setBusyId(id);
    setMsg("");
    try {
      await decideCorrection(id, decision, noteDraft[id] || "");
      setMsg(decision === "approved" ? "정정을 승인했습니다." : "정정을 반려했습니다.");
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
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>정정 요청 승인/반려</h1>

      {courses.length > 1 && (
        <Select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: 240 }} options={courses.map((c) => ({ value: c.id, label: c.name }))} />
      )}
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          검토 대기 ({items?.length ?? 0}건)
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {!courseId && (
            <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>
              {courses.length === 0 ? (role === "INS" ? "담당으로 지정된 과정이 없습니다." : "등록된 과정이 없습니다.") : "먼저 과정을 선택해주세요."}
            </span>
          )}
          {courseId && items === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {courseId && items?.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>대기 중인 정정 요청이 없습니다.</span>}
          {items?.map((c) => (
            <div key={c.id} style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
                <strong style={{ font: "var(--type-body-sm)" }}>{names[c.uid] || c.uid} · {c.date} {c.periodLabel}</strong>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Pill status={c.before}>{STATUS_LABEL[c.before] || c.before}</Pill>
                  <span style={{ color: "var(--text-subtle)" }}>→</span>
                  <Pill status={c.after}>{STATUS_LABEL[c.after] || c.after}</Pill>
                </span>
              </div>
              <div style={{ font: "var(--type-body-sm)", color: "var(--text-body)" }}>{c.reason}</div>
              <Input
                placeholder="처리 사유(선택, 반려 시 권장)"
                value={noteDraft[c.id] || ""}
                onChange={(e) => setNoteDraft({ ...noteDraft, [c.id]: e.target.value })}
                size="sm"
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button size="sm" disabled={busyId === c.id} onClick={() => handleDecide(c.id, "approved")}>승인</Button>
                <Button variant="secondary" size="sm" disabled={busyId === c.id} onClick={() => handleDecide(c.id, "rejected")} style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}>
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
