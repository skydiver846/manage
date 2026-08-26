import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAllUsers, listCourses } from "../../lib/firestore";
import { createAccount, deactivateAccount } from "../../lib/account";
import { Card, Input, Select, Button, Alert, Pill } from "../../components/ui";

const ROLE_OPTS = [
  { value: "STU", label: "교육생" },
  { value: "INS", label: "담당 교관" },
  { value: "ADM", label: "행정담당자" },
  { value: "APR", label: "결재권자" },
  { value: "SYS", label: "시스템관리자" },
];

export default function AccountsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ loginId: "", name: "", role: "STU", courseId: "", org: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(null);
  const [busyUid, setBusyUid] = useState(null);
  const [bulkCourseId, setBulkCourseId] = useState("");

  async function reload() {
    setUsers(await listAllUsers());
  }

  useEffect(() => {
    reload();
    listCourses().then(setCourses);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setCreated(null);
    try {
      const res = await createAccount({
        loginId: form.loginId,
        name: form.name,
        role: form.role,
        courseId: form.role === "STU" ? form.courseId || null : null,
        org: form.org || null,
        phone: form.phone || null,
      });
      setCreated(res);
      setForm({ loginId: "", name: "", role: "STU", courseId: "", org: "", phone: "" });
    } catch (err) {
      setMsg("오류: " + err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    reload().catch((e) => console.error(e));
  }

  async function handleDeactivate(uid, name) {
    if (!window.confirm(`${name} 계정을 즉시 만료(비활성화) 처리하시겠습니까?`)) return;
    setBusyUid(uid);
    setMsg("");
    try {
      await deactivateAccount(uid);
    } catch (err) {
      setMsg("오류: " + err.message);
      setBusyUid(null);
      return;
    }
    setBusyUid(null);
    reload().catch((e) => console.error(e));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>계정 관리</h1>

      <Card>
        <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>교육생 대량 업로드</span>
        <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
          <Select
            label="대상 과정"
            value={bulkCourseId}
            onChange={(e) => setBulkCourseId(e.target.value)}
            style={{ width: 260 }}
            options={[{ value: "", label: "과정을 선택하세요" }, ...courses.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Button
            variant="secondary"
            disabled={!bulkCourseId}
            onClick={() => navigate(`/admin/courses/${bulkCourseId}/upload`)}
          >
            엑셀로 수강생 명단 업로드
          </Button>
        </div>
        <span style={{ display: "block", marginTop: "var(--space-2)", font: "var(--type-caption)", color: "var(--text-muted)" }}>
          교육생 계정은 과정에 소속돼야 하므로, 먼저 업로드할 과정을 선택하세요.
        </span>
      </Card>

      <Card>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>계정 생성</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            <Input label="로그인 ID" required value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} placeholder="사번 또는 교육생 번호" />
            <Input label="이름" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="역할" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLE_OPTS} />
            {form.role === "STU" && (
              <Select
                label="소속 과정"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                options={[{ value: "", label: "선택 안 함" }, ...courses.map((c) => ({ value: c.id, label: c.name }))]}
              />
            )}
            <Input label="소속기관" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="예: 중부소방서" />
            <Input label="연락처" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
          </div>
          <Button type="submit" loading={saving} style={{ width: 140 }}>계정 생성</Button>
          {msg && <Alert tone="danger">{msg}</Alert>}
          {created && (
            <Alert tone="success">
              생성 완료 — 로그인 ID: <strong>{created.loginId}</strong> / 초기 비밀번호:{" "}
              <strong style={{ fontFamily: "var(--font-mono)" }}>{created.tempPassword}</strong>
              <br />
              (SMS 자동발송 미연동 — 지금은 이 화면에서 직접 전달해주세요)
            </Alert>
          )}
        </form>
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          전체 계정 ({users?.length ?? 0})
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {users === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {users?.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex", gap: "var(--space-3)", alignItems: "center",
                padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)",
                font: "var(--type-body-sm)",
              }}
            >
              <span style={{ font: "var(--type-mono)", fontSize: 11, background: "var(--surface-sunken)", borderRadius: "var(--radius-xs)", padding: "2px 6px", color: "var(--text-muted)" }}>
                {u.role}
              </span>
              <strong>{u.name}</strong>
              <span style={{ color: "var(--text-muted)" }}>{u.loginId}</span>
              {u.org && <span style={{ color: "var(--text-muted)" }}>{u.org}</span>}
              <span style={{ marginLeft: "auto" }}>
                {u.status === "expired" ? (
                  <Pill tone="bad">만료됨</Pill>
                ) : (
                  <Button variant="secondary" size="sm" disabled={busyUid === u.id} onClick={() => handleDeactivate(u.id, u.name)} style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}>
                    {busyUid === u.id ? "처리 중..." : "비활성화"}
                  </Button>
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
