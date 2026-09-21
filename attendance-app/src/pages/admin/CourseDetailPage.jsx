import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import QRCode from "qrcode";
import { getCourse, listPeriods, addPeriod, listAllUsers } from "../../lib/firestore";
import { deleteCourse } from "../../lib/courses";
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
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [msg, setMsg] = useState("");
  const [quickMsg, setQuickMsg] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    no: "", startTime: "", endTime: "", subject: "", kind: "이론", place: "", authMethod: "manual",
  });
  const [enrollQr, setEnrollQr] = useState(null); // { periodId, dataUrl }
  // 여러 과목을 세분화하지 않고, 하루 "출석 1회 + 퇴실 1회"만 체크하는 전문과정(1일~1주 등)을 위한
  // 단축 생성 폼. 교시는 특정 날짜에 묶이지 않고 과정 전체 기간(startDate~endDate)에 매일 동일하게
  // 적용되므로, 여기서 딱 한 번만 만들면 며칠짜리 과정이든 그대로 적용된다.
  const [quickTimes, setQuickTimes] = useState({ checkIn: "09:00", checkOut: "18:00" });

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

  async function handleQuickCreatePeriods(e) {
    e.preventDefault();
    setQuickMsg("");
    if (periods.some((p) => p.no === "출석" || p.no === "퇴실")) {
      setQuickMsg("오류: 이미 \"출석\" 또는 \"퇴실\" 교시가 있습니다. 아래 시간표에서 확인해주세요.");
      return;
    }
    try {
      await addPeriod(courseId, {
        no: "출석", startTime: quickTimes.checkIn, endTime: quickTimes.checkIn,
        subject: "-", kind: "출석", place: "-", authMethod: "qr",
      });
      await addPeriod(courseId, {
        no: "퇴실", startTime: quickTimes.checkOut, endTime: quickTimes.checkOut,
        subject: "-", kind: "퇴실", place: "-", authMethod: "qr",
      });
      setQuickMsg("출석·퇴실 교시를 만들었습니다. 과정 시작일부터 종료일까지 매일 동일하게 적용됩니다.");
    } catch (err) {
      setQuickMsg("오류: " + err.message);
      return;
    }
    reload().catch((e) => console.error(e));
  }

  async function handleDeleteCourse() {
    if (!window.confirm(
      `"${course.name}" 과정을 영구 삭제하시겠습니까?\n` +
      "교시·출결기록·정정요청 이력까지 함께 삭제되며 되돌릴 수 없습니다. " +
      "(이미 작성된 결과보고서 자체는 별도로 보존되어 계속 조회할 수 있습니다)"
    )) return;
    setDeleting(true);
    setDeleteMsg("");
    try {
      await deleteCourse(courseId);
    } catch (err) {
      setDeleteMsg("오류: " + err.message);
      setDeleting(false);
      return;
    }
    navigate("/admin/courses");
  }

  async function handleShowEnrollQr(periodId) {
    // 첫날 공통 QR — 아직 로그인하지 않은 교육생이 스마트폰 카메라로 바로 스캔해서
    // 열 수 있도록 실제 URL을 인코딩한다 (src/pages/EnrollPage.jsx가 이 링크를 받는다).
    const url = `${window.location.origin}/enroll?c=${courseId}&p=${periodId}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });
    setEnrollQr({ periodId, dataUrl });
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
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Link to={`/admin/courses/${courseId}/upload`}>
            <Button variant="secondary">교육생 명단 엑셀 업로드</Button>
          </Link>
          <Button
            variant="secondary"
            disabled={deleting}
            onClick={handleDeleteCourse}
            style={{ color: "var(--danger-500)", borderColor: "var(--danger-500)" }}
          >
            {deleting ? "삭제 중..." : "과정 삭제"}
          </Button>
        </div>
      </div>
      {deleteMsg && <Alert tone="danger">{deleteMsg}</Alert>}

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
        <form onSubmit={handleQuickCreatePeriods} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>출석·퇴실 교시 자동 생성 (전문과정 추천)</span>
            <span style={{ display: "block", marginTop: "var(--space-2)", font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
              과목별로 시간표를 세분화하지 않고, 하루 "출석" 1회 + "퇴실" 1회만 QR로 체크하면 되는 짧은
              과정(1일~1주 등)에 적합합니다. 아래에서 한 번만 만들면 과정 시작일부터 종료일까지 매일
              동일하게 적용됩니다.
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
            <Input
              type="time" label="출석 시간" required
              value={quickTimes.checkIn}
              onChange={(e) => setQuickTimes({ ...quickTimes, checkIn: e.target.value })}
            />
            <Input
              type="time" label="퇴실 시간" required
              value={quickTimes.checkOut}
              onChange={(e) => setQuickTimes({ ...quickTimes, checkOut: e.target.value })}
            />
            <Button type="submit" variant="secondary">출석·퇴실 교시 자동 생성</Button>
          </div>
          {quickMsg && <Alert tone={quickMsg.startsWith("오류") ? "danger" : "success"}>{quickMsg}</Alert>}
        </form>
      </Card>

      <Card>
        <form onSubmit={handleAddPeriod} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>교시 직접 추가 (정규 과정 · 과목별 세부 시간표용)</span>
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
              <span style={{ color: "var(--text-muted)" }}>
                {p.kind} · {p.place} · {AUTH_OPTS.find((o) => o.value === p.authMethod)?.label}
              </span>
              <Button size="sm" variant="secondary" style={{ marginLeft: "auto" }} onClick={() => handleShowEnrollQr(p.id)}>
                첫날 등록 QR
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {enrollQr && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
          onClick={() => setEnrollQr(null)}
        >
          <div
            style={{
              background: "var(--surface-card)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", maxWidth: 360,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>
              {course.name} — 첫날 입교등록 QR
            </span>
            <img src={enrollQr.dataUrl} alt="첫날 등록 QR코드" width={320} height={320} />
            <span style={{ font: "var(--type-caption)", color: "var(--text-muted)", textAlign: "center" }}>
              교육생이 각자 휴대폰 카메라(앱 설치·로그인 불필요)로 이 QR을 스캔하면,
              로그인ID와 휴대전화 뒷자리 4자리 입력만으로 입교등록과 오늘 출석이 함께 처리됩니다.
              입구에 출력해서 붙여두거나 화면에 띄워두세요.
            </span>
            <Button variant="secondary" onClick={() => setEnrollQr(null)}>닫기</Button>
          </div>
        </div>
      )}
    </div>
  );
}
