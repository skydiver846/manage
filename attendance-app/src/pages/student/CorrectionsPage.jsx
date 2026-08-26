import { useEffect, useState } from "react";
import {
  getUserDoc, listPeriods, getMyRecord, createCorrection, listMyCorrections,
} from "../../lib/firestore";
import { Card, Input, Select, Textarea, Button, Alert, Pill } from "../../components/ui";
import { STATUS_LABEL, CORRECTION_STATUS_LABEL } from "../../lib/ui";

const today = new Date().toISOString().slice(0, 10);
const AFTER_OPTS = ["present", "late", "earlyLeave", "absent", "excused"].map((s) => ({ value: s, label: STATUS_LABEL[s] }));

export default function StudentCorrectionsPage({ user }) {
  const [me, setMe] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [date, setDate] = useState(today);
  const [periodId, setPeriodId] = useState("");
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState("present");
  const [reason, setReason] = useState("");
  const [mine, setMine] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserDoc(user.uid).then(async (doc) => {
      setMe(doc);
      if (doc?.courseId) {
        const p = await listPeriods(doc.courseId);
        setPeriods(p);
        setPeriodId(p[0]?.id || "");
      }
    });
    reloadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  async function reloadMine() {
    setMine(await listMyCorrections(user.uid));
  }

  useEffect(() => {
    if (!me?.courseId || !periodId) return;
    getMyRecord(me.courseId, date, periodId, user.uid).then((rec) => setBefore(rec?.status || null));
  }, [me, date, periodId, user.uid]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const p = periods.find((x) => x.id === periodId);
      await createCorrection({
        uid: user.uid, courseId: me.courseId, date, periodId,
        periodLabel: p ? `${p.no} ${p.subject}` : periodId,
        before: before || "excused", after, reason,
      });
      setReason("");
      setMsg("정정 요청을 제출했습니다. 담당 교관 검토를 기다려주세요.");
    } catch (err) {
      setMsg("오류: " + err.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    reloadMine().catch((e) => console.error(e));
  }

  if (me === null) return <p style={{ color: "var(--text-muted)" }}>불러오는 중...</p>;
  if (!me.courseId) return <Card>소속 과정이 없습니다.</Card>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 760 }}>
      <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>출결 정정 요청</h1>

      <Card>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <Input type="date" label="대상 일자" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select
              label="교시"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              options={periods.map((p) => ({ value: p.id, label: `${p.no} · ${p.subject}` }))}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
            현재 상태: <Pill status={before || "excused"}>{before ? STATUS_LABEL[before] : "미체크"}</Pill>
          </div>
          <Select label="정정 요청 상태" value={after} onChange={(e) => setAfter(e.target.value)} options={AFTER_OPTS} />
          <Textarea
            label="정정 사유"
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 소속서 비상소집 후 복귀 (근무명령 첨부 예정)"
          />
          <Button type="submit" loading={saving} style={{ width: 160 }}>정정 요청 제출</Button>
          {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}
        </form>
      </Card>

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          나의 요청 현황
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {mine === null && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>불러오는 중...</span>}
          {mine?.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>제출한 정정 요청이 없습니다.</span>}
          {mine?.map((c) => (
            <div key={c.id} style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                <strong style={{ font: "var(--type-body-sm)" }}>{c.date} {c.periodLabel}</strong>
                <Pill tone={c.status === "pending" ? "info" : c.status === "approved" ? "ok" : "bad"}>{CORRECTION_STATUS_LABEL[c.status]}</Pill>
              </div>
              <div style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
                {STATUS_LABEL[c.before] || c.before} → {STATUS_LABEL[c.after] || c.after} · {c.reason}
              </div>
              {c.decisionNote && <div style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>사유: {c.decisionNote}</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
