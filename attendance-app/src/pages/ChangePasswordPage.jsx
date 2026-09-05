import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { completePasswordChange } from "../lib/account";
import { Button, Input, Alert } from "../components/ui";

// 관리자가 임시 비밀번호로 계정을 만든 경우(mustChangePassword:true) 최초 로그인 직후
// 반드시 거쳐야 하는 화면. App.jsx가 로그인 이후 다른 라우팅보다 먼저 이 화면으로 분기시킨다.
export default function ChangePasswordPage({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      await completePasswordChange();
      onDone();
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setError("보안을 위해 재로그인이 필요합니다. 로그아웃 후 다시 로그인해주세요.");
      } else {
        setError(err.message || "비밀번호 변경에 실패했습니다.");
      }
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
          비밀번호 변경 필요
        </h1>
        <span style={{ font: "var(--type-body-sm)", color: "#9ec2b3" }}>임시 비밀번호로 로그인하셨습니다</span>
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
          <div style={{ font: "var(--type-label)", color: "#fff" }}>새 비밀번호 설정</div>
        </div>
        <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
            계속 진행하려면 새 비밀번호를 설정해야 합니다.
          </span>
          <Input
            label="새 비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상"
            required
            autoFocus
            size="lg"
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="다시 입력"
            required
            size="lg"
          />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={loading}>
            비밀번호 변경
          </Button>
        </div>
      </form>
    </div>
  );
}
