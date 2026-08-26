import { useState } from "react";
import { loginWithId } from "../lib/auth";
import { Button, Input, Alert, Checkbox } from "../components/ui";

export default function Login() {
  const [loginId, setLoginId] = useState(() => localStorage.getItem("savedLoginId") || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => !!localStorage.getItem("savedLoginId"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithId(loginId.trim(), password);
      if (remember) localStorage.setItem("savedLoginId", loginId.trim());
      else localStorage.removeItem("savedLoginId");
    } catch (err) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

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

      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--surface-card)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ padding: "var(--space-5) var(--space-6)", background: "var(--green-800)" }}>
          <div style={{ font: "var(--type-label)", color: "#fff" }}>출석관리시스템 로그인</div>
        </div>

        <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input
            label="아이디"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="사번 또는 교육생 번호"
            required
            autoFocus
            size="lg"
          />
          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            size="lg"
          />

          {error && <Alert tone="danger">{error}</Alert>}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            로그인
          </Button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Checkbox label="아이디 저장" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>5회 실패 시 계정 잠금</span>
          </div>
        </div>

        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            background: "var(--green-50)",
            borderTop: "1px solid var(--green-100)",
          }}
        >
          <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
            문의 · 교육기획과 운영지원팀 내선 2204
          </span>
        </div>
      </form>
    </div>
  );
}
