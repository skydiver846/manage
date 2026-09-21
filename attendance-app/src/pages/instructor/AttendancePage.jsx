import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { listPeriods, listUsersByCourse, listRecords, confirmPeriod } from "../../lib/firestore";
import { encodeQrPayload } from "../../lib/qr";
import { Card, Select, Button, Alert, Pill, PageHeader, EmptyState } from "../../components/ui";
import { STATUS_LABEL } from "../../lib/ui";

const today = new Date().toISOString().slice(0, 10);

export default function AttendancePage({ user, role }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState("");
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);

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

  useEffect(() => {
    if (!courseId) return;
    listPeriods(courseId).then((p) => {
      setPeriods(p);
      setPeriodId(p[0]?.id || "");
    });
    listUsersByCourse(courseId).then(setStudents);
  }, [courseId]);

  async function reloadRecords() {
    if (!courseId || !periodId) return;
    const list = await listRecords(courseId, today, periodId);
    const map = {};
    for (const r of list) map[r.uid] = r;
    setRecords(map);
  }

  useEffect(() => {
    reloadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, periodId]);

  const course = courses.find((c) => c.id === courseId);
  const period = periods.find((p) => p.id === periodId);
  // 담당 교관 본인, 또는 관리자(교관 부재 시 대신 확정)가 확정할 수 있다.
  const canConfirm = (role === "INS" && course?.instructorUid === user.uid) || role === "ADM";
  const anyLocked = students.some((s) => records[s.id]?.locked);

  async function handleShowQr() {
    const url = await QRCode.toDataURL(encodeQrPayload(courseId, periodId), { width: 320, margin: 1 });
    setQrDataUrl(url);
  }

  async function handleConfirm() {
    setConfirming(true);
    setMsg("");
    try {
      const finalRecords = students.map((s) => {
        const rec = records[s.id];
        const status = rec?.status === "pending" ? "present" : rec?.status || "absent";
        return { uid: s.id, status };
      });
      await confirmPeriod(courseId, today, periodId, finalRecords, user.uid);
      setMsg("출결을 확정했습니다 — 확정 후에는 정정 절차를 거쳐야 합니다.");
    } catch (err) {
      setMsg("오류: " + err.message);
      setConfirming(false);
      return;
    }
    setConfirming(false);
    reloadRecords().catch((e) => console.error(e));
  }

  // QR 스캔이 안 되는 상황(기기 문제, 네트워크 등)에서도 교관/관리자 권한으로 그 교시를
  // 전원 출석 처리하고 바로 확정할 수 있게 하는 수단. 이미 개별 체크된 학생(지각·조퇴·결석 등)은
  // 그대로 두고, 아직 미체크인 학생만 출석으로 채워서 확정한다.
  async function handleMarkAllPresent() {
    if (!window.confirm("QR 체크 없이 미체크 학생 전원을 출석으로 처리하고 확정하시겠습니까?")) return;
    setConfirming(true);
    setMsg("");
    try {
      const finalRecords = students.map((s) => {
        const rec = records[s.id];
        const status = rec?.status === "pending" ? "present" : rec?.status || "present";
        return { uid: s.id, status };
      });
      await confirmPeriod(courseId, today, periodId, finalRecords, user.uid);
      setMsg("QR 없이 전원 출석 처리 후 확정했습니다 — 확정 후에는 정정 절차를 거쳐야 합니다.");
    } catch (err) {
      setMsg("오류: " + err.message);
      setConfirming(false);
      return;
    }
    setConfirming(false);
    reloadRecords().catch((e) => console.error(e));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>
      <PageHeader title="실시간 출석현황" subtitle={today} />

      {courses.length === 0 && (
        <Card>
          <EmptyState
            compact
            message={role === "INS" ? "담당으로 지정된 과정이 없습니다." : "등록된 과정이 없습니다."}
            action={role === "ADM" && (
              <Button size="sm" variant="secondary" onClick={() => navigate("/admin/courses")}>과정 만들러 가기</Button>
            )}
          />
        </Card>
      )}

      {courses.length > 0 && (
        <Card style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
          <Select
            label="과정"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            style={{ width: 220 }}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="교시"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            style={{ width: 200 }}
            options={periods.map((p) => ({ value: p.id, label: `${p.no} · ${p.subject}` }))}
          />
          {period?.authMethod === "qr" && (
            <Button variant="secondary" onClick={handleShowQr}>QR 코드 표시</Button>
          )}
          {canConfirm && !anyLocked && (
            <Button
              variant="secondary"
              disabled={confirming || periods.length === 0}
              onClick={handleMarkAllPresent}
              title="QR 스캔이 안 될 때, 미체크 학생 전원을 출석 처리하고 바로 확정합니다."
            >
              QR 없이 전원 출석 확정
            </Button>
          )}
          {canConfirm && (
            <Button style={{ marginLeft: "auto" }} disabled={confirming || periods.length === 0 || anyLocked} loading={confirming} onClick={handleConfirm}>
              {anyLocked ? "확정 완료" : "이 교시 일괄 확정"}
            </Button>
          )}
        </Card>
      )}

      {qrDataUrl && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
          onClick={() => setQrDataUrl(null)}
        >
          <div
            style={{
              background: "var(--surface-card)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>
                {course?.name} · {period?.no} {period?.subject}
              </span>
              <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>
                교시별 출석 QR · 앱 내부 스캔 전용 (첫날 등록 QR과는 다른 용도입니다)
              </span>
            </div>
            <img src={qrDataUrl} alt="출석 QR코드" width={320} height={320} />
            <span style={{ font: "var(--type-caption)", color: "var(--text-muted)", textAlign: "center" }}>
              이미 로그인된 교육생이 [출결 대시보드]의 "QR 스캔" 버튼을 눌러 이 QR을 비추면 자동 출석 처리됩니다.
              휴대폰 기본 카메라 앱으로 직접 스캔해도 아무 일도 일어나지 않습니다 — 반드시 앱 안에서 스캔해야 합니다.
              (로그인 없이 휴대폰 카메라로 바로 스캔하는 QR은 과정 관리 화면의 "첫날 등록 QR"입니다.)
            </span>
            <Button variant="secondary" onClick={() => setQrDataUrl(null)}>닫기</Button>
          </div>
        </div>
      )}
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      {periods.length > 0 && (
        <Card padding="none">
          <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
            교육생 출결 ({students.length}명)
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {students.length === 0 && <EmptyState compact message="등록된 교육생이 없습니다." />}
            {students.map((s) => {
              const rec = records[s.id];
              const status = rec?.status;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <strong style={{ font: "var(--type-body-sm)" }}>{s.name}</strong>
                    <span style={{ color: "var(--text-muted)", font: "var(--type-caption)", marginLeft: "var(--space-2)" }}>{s.loginId}</span>
                  </div>
                  <Pill status={status || "excused"}>{status ? STATUS_LABEL[status] || status : "미체크"}</Pill>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
