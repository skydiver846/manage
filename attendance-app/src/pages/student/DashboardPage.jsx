import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { getUserDoc, getCourse, listPeriods, getMyRecord, checkIn } from "../../lib/firestore";
import { decodeQrPayload } from "../../lib/qr";
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
  const [scanPeriodId, setScanPeriodId] = useState(null);

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

  async function handleCheckIn(periodId, method = "manual") {
    setBusyPeriod(periodId);
    setMsg("");
    try {
      await checkIn(me.courseId, today, periodId, user.uid, { method });
      setMsg(method === "qr" ? "QR 스캔으로 출석 처리되었습니다." : "출석 신청이 완료되었습니다 — 교관 확정 대기");
    } catch (err) {
      setMsg("오류: " + err.message);
      setBusyPeriod(null);
      return;
    }
    setBusyPeriod(null);
    reload().catch((e) => console.error(e));
  }

  function handleQrMatched() {
    const periodId = scanPeriodId;
    setScanPeriodId(null);
    handleCheckIn(periodId, "qr");
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
                  {p.authMethod === "qr" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyPeriod === p.id || (status && status !== "pending")}
                      onClick={() => setScanPeriodId(p.id)}
                    >
                      {busyPeriod === p.id ? "처리 중..." : "QR 스캔"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busyPeriod === p.id || (status && status !== "pending")}
                      onClick={() => handleCheckIn(p.id)}
                    >
                      {busyPeriod === p.id ? "처리 중..." : status === "pending" ? "재신청" : "출석체크"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {scanPeriodId && (
        <QrScanModal
          expected={{ courseId: me.courseId, periodId: scanPeriodId }}
          onMatched={handleQrMatched}
          onClose={() => setScanPeriodId(null)}
        />
      )}
    </div>
  );
}

function QrScanModal({ expected, onMatched, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let stream = null;

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          const payload = decodeQrPayload(code.data);
          if (payload && payload.courseId === expected.courseId && payload.periodId === expected.periodId) {
            onMatched();
            return;
          }
          if (payload) setError("다른 교시의 QR코드입니다. 올바른 QR을 스캔해주세요.");
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        videoRef.current.srcObject = s;
        videoRef.current.play();
        tick();
      })
      .catch(() => setError("카메라를 사용할 수 없습니다. 브라우저 카메라 권한을 확인해주세요."));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expected.courseId, expected.periodId]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface-card)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", maxWidth: 340,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>QR코드를 카메라에 비춰주세요</span>
        <video ref={videoRef} muted playsInline style={{ width: 280, borderRadius: "var(--radius-md)", background: "#000" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {error && <Alert tone="danger">{error}</Alert>}
        <Button variant="secondary" onClick={onClose}>취소</Button>
      </div>
    </div>
  );
}
