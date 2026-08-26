import { useEffect, useState } from "react";
import { getUserDoc, getCourse, listPeriods, getMyRecord, checkIn } from "../../lib/firestore";
import { Card, Button, Alert, Pill } from "../../components/ui";
import { STATUS_LABEL } from "../../lib/ui";

const today = new Date().toISOString().slice(0, 10);

export default function DashboardPage({ user }) {
  const [me, setMe] = useState(null);
  const [course, setCourse] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [records, setRecords] = useState({});
  const [busyPeriod, setBusyPeriod] = useState(null);
  const [msg, setMsg] = useState("");

  async function reload() {
    const myDoc = await getUserDoc(user.uid);
    setMe(myDoc);
    if (!myDoc?.courseId) return;
    const [c, p] = await Promise.all([getCourse(myDoc.courseId), listPeriods(myDoc.courseId)]);
    setCourse(c);
    setPeriods(p);
    const recs = {};
    for (const period of p) {
      recs[period.id] = await getMyRecord(myDoc.courseId, today, period.id, user.uid);
    }
    setRecords(recs);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  async function handleCheckIn(periodId) {
    setBusyPeriod(periodId);
    setMsg("");
    try {
      await checkIn(me.courseId, today, periodId, user.uid, { method: "manual" });
      setMsg("출석 신청이 완료되었습니다 — 교관 확정 대기");
    } catch (err) {
      setMsg("오류: " + err.message);
      setBusyPeriod(null);
      return;
    }
    setBusyPeriod(null);
    reload().catch((e) => console.error(e));
  }

  if (me === null) return <p style={{ color: "var(--text-muted)" }}>불러오는 중...</p>;
  if (!me.courseId) {
    return (
      <Card>
        <p>아직 소속된 과정이 없습니다. 행정담당자에게 문의해주세요.</p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 760 }}>
      <div>
        <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>출결 대시보드</h1>
        {course && (
          <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
            {course.name} · {today}
          </span>
        )}
      </div>
      {msg && <Alert tone={msg.startsWith("오류") ? "danger" : "success"}>{msg}</Alert>}

      <Card padding="none">
        <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", font: "var(--type-label)", color: "var(--text-strong)" }}>
          오늘 시간표
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {periods.length === 0 && <span style={{ padding: "var(--space-4) var(--space-5)", color: "var(--text-muted)" }}>등록된 교시가 없습니다.</span>}
          {periods.map((p) => {
            const rec = records[p.id];
            const status = rec?.status;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
                  padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ font: "var(--type-body-sm)", fontWeight: 600, color: "var(--text-strong)" }}>{p.no} · {p.subject}</div>
                  <div style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{p.startTime}–{p.endTime} · {p.place}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  {status ? (
                    <>
                      <Pill status={status}>{STATUS_LABEL[status] || status}</Pill>
                      {rec.locked && <span style={{ font: "var(--type-caption)", color: "var(--text-subtle)" }}>확정됨</span>}
                    </>
                  ) : (
                    <Pill status="excused">미체크</Pill>
                  )}
                  <Button
                    size="sm"
                    disabled={busyPeriod === p.id || (status && status !== "pending")}
                    onClick={() => handleCheckIn(p.id)}
                  >
                    {busyPeriod === p.id ? "처리 중..." : status === "pending" ? "재신청" : "출석체크"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
