import { useState } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../lib/firebase";
import { selfEnrollAndCheckIn } from "../lib/account";
import { Button, Input, Alert } from "../components/ui";

// 첫날 공통 QR을 스캔해서 들어오는 화면. 로그인 상태와 무관하게 열려있어야 하므로
// App.jsx에서 로그인 여부를 확인하기 전에 이 페이지로 분기시킨다.
// QR에는 이 URL이 그대로 인코딩되어 있다: `${origin}/enroll?c={courseId}&p={periodId}`
// (관리자 화면에서 표시하는 QR — src/pages/admin/CourseDetailPage.jsx의 "첫날 등록 QR" 참고)
export default function EnrollPage() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("c");
  const periodId = params.get("p");

  const [loginId, setLoginId] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [autoLoginFailed, setAutoLoginFailed] = useState(false);

  if (!courseId || !periodId) {
    return (
      <CenterCard>
        <div style={{ padding: "var(--space-6)" }}>
          <Alert tone="danger">
            잘못된 QR코드입니다. 관리자·교관에게 다시 QR을 띄워달라고 요청해주세요.
          </Alert>
        </div>
      </CenterCard>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await selfEnrollAndCheckIn({
        loginId: loginId.trim(),
        phoneLast4: phoneLast4.trim(),
        courseId,
        periodId,
      });
      // 입교등록·오늘 출석은 서버에서 이미 완료된 뒤 응답이 온 것이므로, 자동 로그인용
      // customToken 발급이 실패했더라도(res.autoLoginFailed) 등록 자체는 성공으로 처리하고
      // 로그인 화면으로 보내 직접 로그인하도록 안내한다.
      if (res.customToken) {
        await signInWithCustomToken(auth, res.customToken);
      } else {
        setAutoLoginFailed(true);
      }
      setDone(true);
      // 로그인 상태가 반영된 정상 화면으로 이동 — 전체 새로고침으로 이동해야
      // App.jsx가 "/enroll" 우회 분기를 벗어나 정상 라우팅을 시작한다.
      setTimeout(() => {
        window.location.href = "/";
      }, res.customToken ? 900 : 2500);
    } catch (err) {
      setError(err.message || "등록에 실패했습니다. 입력값을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <CenterCard>
        <div style={{ padding: "var(--space-6)" }}>
          <Alert tone="success">
            {autoLoginFailed
              ? `입교등록과 오늘 출석이 완료됐습니다. 자동 로그인에는 실패했으니, 로그인 화면에서 로그인ID "${loginId.trim()}", 비밀번호 "${loginId.trim()}_${phoneLast4.trim()}"로 로그인해주세요. 잠시 후 이동합니다...`
              : "입교등록과 오늘 출석이 완료됐습니다. 잠시 후 이동합니다..."}
          </Alert>
        </div>
      </CenterCard>
    );
  }

  return (
    <CenterCard>
      <div style={{ padding: "var(--space-5) var(--space-6)", background: "var(--green-800)" }}>
        <div style={{ font: "var(--type-label)", color: "#fff" }}>입교등록 · 오늘 출석</div>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
          로그인ID(사번)와 휴대전화 뒷자리 4자리를 입력하면 입교등록과 오늘 출석이 함께 처리됩니다.
        </span>
        <Input
          label="로그인ID (사번)"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="사번 또는 교육생 번호"
          required
          autoFocus
          size="lg"
        />
        <Input
          label="휴대전화 뒷자리 4자리"
          value={phoneLast4}
          onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
          inputMode="numeric"
          maxLength={4}
          required
          size="lg"
        />
        {error && <Alert tone="danger">{error}</Alert>}
        <Button type="submit" size="lg" fullWidth loading={loading}>
          등록하고 출석 체크
        </Button>
      </form>
    </CenterCard>
  );
}

function CenterCard({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-8)",
        background: "var(--surface-inverse)",
        padding: "var(--space-8) var(--space-4)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: "var(--radius-lg)",
            background: "var(--green-200)", color: "var(--green-800)",
            display: "flex", alignItems: "center", justifyContent: "center",
            font: "var(--type-h3)", fontWeight: 800,
          }}
        >
          FA
        </div>
        <h1 style={{ font: "var(--type-h1)", color: "#fff", letterSpacing: "var(--tracking-tight)" }}>
          출석관리시스템
        </h1>
        <span style={{ font: "var(--type-body-sm)", color: "#9ec2b3" }}>소방학교</span>
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--surface-card)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
