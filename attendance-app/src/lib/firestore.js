import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, query, where,
  orderBy, serverTimestamp, writeBatch, limit,
} from "firebase/firestore";
import { db } from "./firebase";

// ---------- 과정(courses) ----------

export async function listCourses() {
  const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCourse(courseId) {
  const snap = await getDoc(doc(db, "courses", courseId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createCourse({ name, type, startDate, endDate }) {
  const ref = await addDoc(collection(db, "courses"), {
    name, type, startDate, endDate, status: "active",
    policy: { lateMinutes: 10, earlyLeaveMinutes: 20, lateToAbsentRatio: 3, completionRate: 90 },
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ---------- 교시(periods, 과정 하위 서브컬렉션) ----------

export async function listPeriods(courseId) {
  const snap = await getDocs(
    query(collection(db, "courses", courseId, "periods"), orderBy("no"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addPeriod(courseId, { no, startTime, endTime, subject, kind, place, authMethod }) {
  const ref = await addDoc(collection(db, "courses", courseId, "periods"), {
    no, startTime, endTime, subject, kind, place, authMethod: authMethod || "manual",
  });
  return ref.id;
}

// ---------- 사용자(users) ----------

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listUsersByCourse(courseId) {
  const snap = await getDocs(
    query(collection(db, "users"), where("courseId", "==", courseId), where("role", "==", "STU"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllUsers() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- 출결(attendance) ----------
// 경로: attendance/{courseId}/{date}/{periodId}/records/{uid}

function recordsRef(courseId, date, periodId) {
  return collection(db, "attendance", courseId, date, periodId, "records");
}

export async function getMyRecord(courseId, date, periodId, uid) {
  const snap = await getDoc(doc(recordsRef(courseId, date, periodId), uid));
  return snap.exists() ? snap.data() : null;
}

/** 교육생 셀프 체크인 — Firestore 규칙상 pending 상태로만 신청 가능 */
export async function checkIn(courseId, date, periodId, uid, { method } = {}) {
  await setDoc(
    doc(recordsRef(courseId, date, periodId), uid),
    {
      status: "pending",
      checkedAt: serverTimestamp(),
      checkedMethod: method || "manual",
      locked: false,
    },
    { merge: true }
  );
}

/** 교시의 전체 출결 기록 조회 (교관용) */
export async function listRecords(courseId, date, periodId) {
  const snap = await getDocs(recordsRef(courseId, date, periodId));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/** 교관 일괄 확정 — pending은 present로, 미체크(문서 없음)는 호출부에서 absent로 채워 넣어 전달 */
export async function confirmPeriod(courseId, date, periodId, finalRecords, instructorUid) {
  const batch = writeBatch(db);
  for (const r of finalRecords) {
    batch.set(
      doc(recordsRef(courseId, date, periodId), r.uid),
      {
        status: r.status,
        locked: true,
        confirmedBy: instructorUid,
        confirmedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
  await batch.commit();
}

export async function updateRecordStatus(courseId, date, periodId, uid, status) {
  await updateDoc(doc(recordsRef(courseId, date, periodId), uid), { status });
}

// ---------- 정정 요청(corrections) ----------
// 승인/반려는 반드시 decideCorrection Cloud Function을 거친다 (src/lib/corrections.js) — 여기는 조회/생성만.

export async function createCorrection({ uid, courseId, date, periodId, periodLabel, before, after, reason }) {
  const ref = await addDoc(collection(db, "corrections"), {
    uid, courseId, date, periodId, periodLabel: periodLabel || periodId,
    before, after, reason, status: "pending", requestedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyCorrections(uid) {
  const snap = await getDocs(
    query(collection(db, "corrections"), where("uid", "==", uid), orderBy("requestedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listPendingCorrectionsForCourse(courseId) {
  const snap = await getDocs(
    query(
      collection(db, "corrections"),
      where("courseId", "==", courseId),
      where("status", "==", "pending"),
      orderBy("requestedAt", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- 알림(notifications) ----------

export async function listNotifications(uid) {
  const snap = await getDocs(
    query(collection(db, "notifications"), where("uid", "==", uid), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

// ---------- 결과보고서(reports) ----------
// 생성/상신/결재는 반드시 Cloud Function을 거친다 (src/lib/reports.js) — 여기는 조회만.

export async function listReportsByCourse(courseId) {
  const snap = await getDocs(
    query(collection(db, "reports"), where("courseId", "==", courseId), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listReportsByStatus(status) {
  const snap = await getDocs(
    query(collection(db, "reports"), where("status", "==", status), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getReport(id) {
  const snap = await getDoc(doc(db, "reports", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- 소속기관 통보(orgNotifications) ----------
// 발송은 반드시 notifyOrg Cloud Function을 거친다 (src/lib/notifications.js) — 여기는 조회만.

export async function listOrgNotificationsByCourse(courseId) {
  const snap = await getDocs(
    query(collection(db, "orgNotifications"), where("courseId", "==", courseId), orderBy("sentAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- 감사로그(auditLogs) ----------
// 클라이언트 쓰기는 항상 차단되어 있고(Cloud Functions만 기록), 여기는 조회만.

export async function listAuditLogs(max = 100) {
  const snap = await getDocs(
    query(collection(db, "auditLogs"), orderBy("at", "desc"), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- 통계(statistics) ----------
// 서버 롤업 없이 클라이언트에서 확정 출결을 직접 집계 — 과정당 학생 수·보고서가 만들어진 날짜 수만큼만 읽으므로
// 소규모 조직 규모에서는 충분히 가볍다. 규모가 커지면 firebase 연동 가이드의 nightlyAttendanceRollup으로 대체.

export async function computeCourseRisk(courseId) {
  const [periods, reports, students] = await Promise.all([
    listPeriods(courseId), listReportsByCourse(courseId), listUsersByCourse(courseId),
  ]);
  const dates = [...new Set(reports.map((r) => r.date))];
  const tally = {};
  for (const s of students) tally[s.id] = { present: 0, late: 0, earlyLeave: 0, absent: 0, excused: 0, total: 0 };

  for (const date of dates) {
    for (const p of periods) {
      const records = await listRecords(courseId, date, p.id);
      for (const r of records) {
        if (!tally[r.uid]) continue;
        tally[r.uid].total += 1;
        if (tally[r.uid][r.status] !== undefined) tally[r.uid][r.status] += 1;
      }
    }
  }

  const students_ = students.map((s) => {
    const t = tally[s.id];
    const rate = t.total ? Math.round(((t.total - t.absent) / t.total) * 1000) / 10 : 100;
    return { ...s, ...t, rate };
  });

  return { dates, students: students_ };
}
