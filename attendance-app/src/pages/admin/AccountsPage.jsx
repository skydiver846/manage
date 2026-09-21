import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAllUsers, listCourses } from "../../lib/firestore";
import { createAccount, deactivateAccount, deleteAccount, resetPassword, unlockAccount, unlockEnrollAttempt } from "../../lib/account";
import { Card, Input, Select, Button, Alert, Pill, Checkbox } from "../../components/ui";

// 관리자가 "무작위 생성" 버튼을 눌렀을 때 화면에서 바로 채워줄 임시 비밀번호.
// 실제 비밀번호 생성/저장은 서버(createAccount)에서 다시 검증하며, 이건 입력 편의용이다.
function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// 이 화면의 "계정생성(교직원)" 탭 전용 — 교육생은 별도로 "계정생성(교육생)"(엑셀 일괄 업로드)로
// 만들기 때문에 역할 선택지에서 제외한다.
const STAFF_ROLE_OPTS = [
  { value: "INS", label: "담당 교관" },
  { value: "ADM", label: "관리자" },
  { value: "APR", label: "결재권자" },
];

// 기수별로 자주 갱신되는 교육생을 가장 먼저, 그다음 교관·결재권자·관리자 순으로 묶어서 보여준다.
const ROLE_GROUP_ORDER = ["STU", "INS", "APR", "ADM"];
const ROLE_GROUP_LABEL = { STU: "교육생", INS: "교관", APR: "결재권자", ADM: "관리자" };

export default function AccountsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ loginId: "", name: "", role: "INS", org: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState(null);
  const [busyUid, setBusyUid] = useState(null);
  const [bulkCourseId, setBulkCourseId] = useState("");
  const [resetBusyUid, setResetBusyUid] = useState(null);
  const [resetMsg, setResetMsg] = useState("");
  const [resetInfo, setResetInfo] = useState(null);
  const [unlockBusyUid, setUnlockBusyUid] = useState(null);
  const [unlockMsg, setUnlockMsg] = useState("");
  const [deleteBusyUid, setDeleteBusyUid] = useState(null);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [selectedUids, setSelectedUids] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [createTab, setCreateTab] = useState(null); // null | "bulk" | "manual"

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
        org: form.org || null,
        phone: form.phone || null,
        password: form.password || null,
      });
      setCreated(res);
      setForm({ loginId: "", name: "", role: "INS", org: "", phone: "", password: "" });
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

  async function handleResetPassword(uid, name, loginId) {
    if (!window.confirm(`${name} 계정의 비밀번호를 초기화하시겠습니까? 기존 비밀번호는 즉시 사용할 수 없게 됩니다.`)) return;
    setResetBusyUid(uid);
    setResetMsg("");
    setResetInfo(null);
    try {
      const res = await resetPassword(uid);
      setResetInfo({ loginId, tempPassword: res.tempPassword });
    } catch (err) {
      setResetMsg("오류: " + err.message);
      setResetBusyUid(null);
      return;
    }
    setResetBusyUid(null);
  }

  async function handleUnlockAccount(uid, loginId, name) {
    if (!window.confirm(`${name}(${loginId}) 계정의 로그인 잠금을 해제하시겠습니까?`)) return;
    setUnlockBusyUid(uid + ":login");
    setUnlockMsg("");
    try {
      await unlockAccount(loginId);
    } catch (err) {
      setUnlockMsg("오류: " + err.message);
    }
    setUnlockBusyUid(null);
  }

  async function handleUnlockEnroll(uid, loginId, name) {
    if (!window.confirm(`${name}(${loginId})의 첫날 입교등록(자가등록) 시도 잠금을 해제하시겠습니까?`)) return;
    setUnlockBusyUid(uid + ":enroll");
    setUnlockMsg("");
    try {
      await unlockEnrollAttempt(loginId);
    } catch (err) {
      setUnlockMsg("오류: " + err.message);
    }
    setUnlockBusyUid(null);
  }

  async function handleDelete(uid, name, loginId) {
    if (!window.confirm(
      `${name}(${loginId}) 계정을 영구 삭제하시겠습니까?\n` +
      "계정 정보는 완전히 사라지며 되돌릴 수 없습니다. (과거 출결·보고서 기록 자체는 그대로 남습니다)"
    )) return;
    setDeleteBusyUid(uid);
    setDeleteMsg("");
    try {
      await deleteAccount(uid);
    } catch (err) {
      setDeleteMsg("오류: " + err.message);
      setDeleteBusyUid(null);
      return;
    }
    setDeleteBusyUid(null);
    reload().catch((e) => console.error(e));
  }

  function toggleSelected(uid) {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function toggleSelectAllExpiredInGroup(groupUsers, checked) {
    const expiredIds = groupUsers.filter((u) => u.status === "expired").map((u) => u.id);
    setSelectedUids((prev) => {
      const next = new Set(prev);
      for (const id of expiredIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    const targets = (users || []).filter((u) => selectedUids.has(u.id));
    if (targets.length === 0) return;
    if (!window.confirm(
      `선택한 ${targets.length}개 계정을 영구 삭제하시겠습니까?\n` +
      "계정 정보는 완전히 사라지며 되돌릴 수 없습니다. (과거 출결·보고서 기록 자체는 그대로 남습니다)"
    )) return;
    setBulkDeleting(true);
    setBulkMsg("");
    const failures = [];
    for (const u of targets) {
      try {
        await deleteAccount(u.id);
      } catch (err) {
        failures.push(`${u.name}(${u.loginId}): ${err.message}`);
      }
    }
    setBulkDeleting(false);
    setSelectedUids(new Set());
    setBulkMsg(
      failures.length === 0
        ? `${targets.length}건 영구 삭제를 완료했습니다.`
        : `${targets.length - failures.length}건 삭제 완료, ${failures.length}건 실패 — ${failures.join(" / ")}`
    );
    reload().catch((e) => console.error(e));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>계정 관리</h1>

      <Card padding="none">
        <div style={{ display: "flex" }}>
          <button
            type="button"
            onClick={() => setCreateTab(createTab === "bulk" ? null : "bulk")}
            style={{
              flex: 1, textAlign: "left", padding: "var(--space-4) var(--space-5)",
              background: createTab === "bulk" ? "var(--surface-card)" : "var(--surface-sunken)",
              border: "none", borderBottom: `2px solid ${createTab === "bulk" ? "var(--green-600)" : "transparent"}`,
              cursor: "pointer", font: "var(--type-label)",
              color: createTab === "bulk" ? "var(--text-strong)" : "var(--text-muted)",
            }}
          >
            계정생성(교육생)
          </button>
          <button
            type="button"
            onClick={() => setCreateTab(createTab === "manual" ? null : "manual")}
            style={{
              flex: 1, textAlign: "left", padding: "var(--space-4) var(--space-5)",
              background: createTab === "manual" ? "var(--surface-card)" : "var(--surface-sunken)",
              border: "none", borderLeft: "1px solid var(--border-subtle)",
              borderBottom: `2px solid ${createTab === "manual" ? "var(--green-600)" : "transparent"}`,
              cursor: "pointer", font: "var(--type-label)",
              color: createTab === "manual" ? "var(--text-strong)" : "var(--text-muted)",
            }}
          >
            계정생성(교직원)
          </button>
        </div>

        {createTab === "bulk" && (
          <div style={{ padding: "var(--space-5)", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
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
                엑셀로 교육생 명단 업로드
              </Button>
            </div>
            <span style={{ display: "block", marginTop: "var(--space-2)", font: "var(--type-caption)", color: "var(--text-muted)" }}>
              교육생 계정은 과정에 소속돼야 하므로, 먼저 업로드할 과정을 선택하세요.
            </span>
          </div>
        )}

        {createTab === "manual" && (
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-5)", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            <Input label="로그인 ID" required value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} placeholder="사번" />
            <Input label="이름" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="역할" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={STAFF_ROLE_OPTS} />
            <Input label="소속기관" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="예: 중부소방서" />
            <Input label="연락처" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="초기 비밀번호 (선택, 8자 이상)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="비워두면 자동 생성됩니다"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setForm((f) => ({ ...f, password: generateRandomPassword() }))}
                >
                  무작위 생성
                </Button>
              </div>
              <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
                여기에 직접 입력하면 그 비밀번호로 계정이 만들어집니다. 비워두면 서버가 임시 비밀번호를 자동
                생성해서 생성 완료 후 화면에 한 번 보여줍니다.
              </span>
            </div>
          </div>
          <Button type="submit" loading={saving} style={{ width: 140 }}>계정 생성</Button>
          {msg && <Alert tone="danger">{msg}</Alert>}
          {created && (
            <Alert tone="success">
              {created.setByAdmin ? (
                <>
                  생성 완료 — 로그인 ID: <strong>{created.loginId}</strong> / 방금 입력하신 비밀번호로 바로
                  로그인할 수 있습니다.
                </>
              ) : (
                <>
                  생성 완료 — 로그인 ID: <strong>{created.loginId}</strong> / 초기 비밀번호:{" "}
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{created.tempPassword}</strong>
                  <br />
                  (SMS 자동발송 미연동 — 지금은 이 화면에서 직접 전달해주세요)
                </>
              )}
            </Alert>
          )}
        </form>
        )}
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          전체 계정 ({users?.length ?? 0})
        </div>
        {resetMsg && (
          <div style={{ padding: "var(--space-3) var(--space-5)" }}>
            <Alert tone="danger">{resetMsg}</Alert>
          </div>
        )}
        {resetInfo && (
          <div style={{ padding: "var(--space-3) var(--space-5)" }}>
            <Alert tone="success">
              비밀번호 초기화 완료 — 로그인 ID: <strong>{resetInfo.loginId}</strong> / 새 임시 비밀번호:{" "}
              <strong style={{ fontFamily: "var(--font-mono)" }}>{resetInfo.tempPassword}</strong>
              <br />
              (SMS 자동발송 미연동 — 지금은 이 화면에서 직접 전달해주세요)
            </Alert>
          </div>
        )}
        {unlockMsg && (
          <div style={{ padding: "var(--space-3) var(--space-5)" }}>
            <Alert tone="danger">{unlockMsg}</Alert>
          </div>
        )}
        {deleteMsg && (
          <div style={{ padding: "var(--space-3) var(--space-5)" }}>
            <Alert tone="danger">{deleteMsg}</Alert>
          </div>
        )}
        {bulkMsg && (
          <div style={{ padding: "var(--space-3) var(--space-5)" }}>
            <Alert tone={bulkMsg.includes("실패") ? "danger" : "success"}>{bulkMsg}</Alert>
          </div>
        )}
        {selectedUids.size > 0 && (
          <div style={{ padding: "var(--space-3) var(--space-5)", background: "var(--danger-50)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ font: "var(--type-body-sm)", color: "var(--text-strong)" }}>{selectedUids.size}건 선택됨</span>
            <Button
              size="sm" variant="secondary" disabled={bulkDeleting} onClick={handleBulkDelete}
              style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}
            >
              {bulkDeleting ? "삭제 중..." : `선택 항목 영구 삭제 (${selectedUids.size})`}
            </Button>
            <Button size="sm" variant="ghost" disabled={bulkDeleting} onClick={() => setSelectedUids(new Set())}>선택 해제</Button>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {users === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {users !== null && ROLE_GROUP_ORDER.map((roleKey) => {
            const groupUsers = users.filter((u) => u.role === roleKey);
            if (groupUsers.length === 0) return null;
            const expiredInGroup = groupUsers.filter((u) => u.status === "expired");
            const allExpiredSelected = expiredInGroup.length > 0 && expiredInGroup.every((u) => selectedUids.has(u.id));
            return (
              <div key={roleKey}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-2) var(--space-5)", background: "var(--surface-sunken)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>
                    {ROLE_GROUP_LABEL[roleKey]} ({groupUsers.length})
                  </span>
                  {expiredInGroup.length > 0 && (
                    <Checkbox
                      label={`만료 계정 전체 선택 (${expiredInGroup.length})`}
                      checked={allExpiredSelected}
                      onChange={(e) => toggleSelectAllExpiredInGroup(groupUsers, e.target.checked)}
                      style={{ marginLeft: "auto", font: "var(--type-caption)", color: "var(--text-muted)" }}
                    />
                  )}
                </div>
                {groupUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex", gap: "var(--space-3)", alignItems: "center",
                      padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)",
                      font: "var(--type-body-sm)",
                    }}
                  >
                    {u.status === "expired" && (
                      <Checkbox checked={selectedUids.has(u.id)} onChange={() => toggleSelected(u.id)} />
                    )}
                    <span style={{ font: "var(--type-mono)", fontSize: 11, background: "var(--surface-card)", borderRadius: "var(--radius-xs)", padding: "2px 6px", color: "var(--text-muted)" }}>
                      {u.role}
                    </span>
                    <strong>{u.name}</strong>
                    <span style={{ color: "var(--text-muted)" }}>{u.loginId}</span>
                    {u.org && <span style={{ color: "var(--text-muted)" }}>{u.org}</span>}
                    {u.role === "STU" && (
                      u.selfClaimed
                        ? <Pill tone="ok">입교등록 완료</Pill>
                        : <Pill tone="warn">첫날 QR 미등록</Pill>
                    )}
                    <span style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {u.status === "expired" ? (
                        <>
                          <Pill tone="bad">만료됨</Pill>
                          <Button variant="secondary" size="sm" disabled={deleteBusyUid === u.id} onClick={() => handleDelete(u.id, u.name, u.loginId)} style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}>
                            {deleteBusyUid === u.id ? "처리 중..." : "영구 삭제"}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="secondary" size="sm" disabled={unlockBusyUid === u.id + ":login"} onClick={() => handleUnlockAccount(u.id, u.loginId, u.name)}>
                            {unlockBusyUid === u.id + ":login" ? "처리 중..." : "로그인 잠금 해제"}
                          </Button>
                          {u.role === "STU" && (
                            <Button variant="secondary" size="sm" disabled={unlockBusyUid === u.id + ":enroll"} onClick={() => handleUnlockEnroll(u.id, u.loginId, u.name)}>
                              {unlockBusyUid === u.id + ":enroll" ? "처리 중..." : "입교등록 잠금 해제"}
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" disabled={resetBusyUid === u.id} onClick={() => handleResetPassword(u.id, u.name, u.loginId)}>
                            {resetBusyUid === u.id ? "처리 중..." : "비밀번호 초기화"}
                          </Button>
                          <Button variant="secondary" size="sm" disabled={busyUid === u.id} onClick={() => handleDeactivate(u.id, u.name)} style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}>
                            {busyUid === u.id ? "처리 중..." : "비활성화"}
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
