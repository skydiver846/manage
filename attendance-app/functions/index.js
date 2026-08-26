const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast3" });

const VALID_ROLES = ["STU", "INS", "ADM", "APR", "SYS"];
const EMAIL_DOMAIN = "fireacademy.local";

function toEmail(loginId) {
  return `${loginId}@${EMAIL_DOMAIN}`;
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function writeAudit({ actorUid, actorRole, target, action, reason, category }) {
  await admin.firestore().collection("auditLogs").add({
    at: FieldValue.serverTimestamp(),
    actorUid: actorUid || null,
    actorRole: actorRole || null,
    target: target || null,
    action,
    reason: reason || null,
    category: category || null,
  });
}

/**
 * 최초 1회만 동작하는 관리자 부트스트랩.
 * users 컬렉션에 ADM 또는 SYS 역할이 하나라도 존재하면 이후 호출은 전부 거부된다.
 * 인증 없이 호출 가능하지만, 자기 자신을 잠그는(self-limiting) 구조라 안전하다.
 */
exports.bootstrapFirstAdmin = onCall(async (request) => {
  const { loginId, password, name } = request.data || {};
  if (!loginId || !password || !name) {
    throw new HttpsError("invalid-argument", "loginId, password, name은 필수입니다.");
  }
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "비밀번호는 8자 이상이어야 합니다.");
  }

  const existingAdmins = await admin.firestore().collection("users")
    .where("role", "in", ["ADM", "SYS"]).limit(1).get();
  if (!existingAdmins.empty) {
    throw new HttpsError("already-exists", "이미 관리자 계정이 존재합니다. 이 부트스트랩은 최초 1회만 사용할 수 있습니다.");
  }

  const email = toEmail(loginId);
  const userRecord = await admin.auth().createUser({ email, password, displayName: name });
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: "SYS" });

  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    loginId, name, role: "SYS", status: "active",
    createdAt: FieldValue.serverTimestamp(), createdBy: "bootstrap",
  });

  await writeAudit({
    actorUid: userRecord.uid, actorRole: "SYS", target: `users/${userRecord.uid}`,
    action: "최초 관리자 부트스트랩 생성", category: "계정 변경",
  });

  return { uid: userRecord.uid, email };
});

/**
 * 행정담당자(ADM)/시스템관리자(SYS)가 계정을 생성한다.
 * 역할·계정ID·이름은 필수, courseId/org/phone은 선택.
 */
exports.createAccount = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || !["ADM", "SYS"].includes(caller.token.role)) {
    throw new HttpsError("permission-denied", "행정담당자 또는 시스템관리자만 계정을 생성할 수 있습니다.");
  }
  const { loginId, name, role, courseId, org, phone } = request.data || {};
  if (!loginId || !name || !VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", "loginId, name, role(STU/INS/ADM/APR/SYS)은 필수입니다.");
  }

  const email = toEmail(loginId);
  const tempPassword = generateTempPassword();

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({ email, password: tempPassword, displayName: name });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", `이미 사용 중인 계정ID입니다: ${loginId}`);
    }
    throw new HttpsError("internal", e.message);
  }
  await admin.auth().setCustomUserClaims(userRecord.uid, { role, courseId: courseId || null });

  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    loginId, name, role, courseId: courseId || null, org: org || null, phone: phone || null,
    status: "active", mustChangePassword: true,
    createdAt: FieldValue.serverTimestamp(), createdBy: caller.uid,
  });

  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `users/${userRecord.uid}`,
    action: `계정 생성 (${role})`, category: "계정 변경",
  });

  // TODO: 실제 운영 시 여기서 SMS 발송 API(알리고/NCP SENS 등) 연동
  return { uid: userRecord.uid, loginId, tempPassword };
});

/** 로그인 시도 전에 호출 — 5회 실패 잠금 여부 확인 */
exports.checkLoginAllowed = onCall(async (request) => {
  const { loginId } = request.data || {};
  if (!loginId) throw new HttpsError("invalid-argument", "loginId는 필수입니다.");

  const ref = admin.firestore().doc(`loginAttempts/${loginId}`);
  const snap = await ref.get();
  const data = snap.data();
  if (data?.lockedUntil && data.lockedUntil.toMillis() > Date.now()) {
    throw new HttpsError("permission-denied", "5회 로그인 실패로 계정이 잠겼습니다. 행정담당자에게 문의하세요.");
  }
  return { allowed: true };
});

/** 로그인 실패 시 호출 — 5회 누적되면 잠금 */
exports.recordLoginFailure = onCall(async (request) => {
  const { loginId } = request.data || {};
  if (!loginId) throw new HttpsError("invalid-argument", "loginId는 필수입니다.");

  const ref = admin.firestore().doc(`loginAttempts/${loginId}`);
  const result = await admin.firestore().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const count = (doc.data()?.count || 0) + 1;
    const patch = { count, lastFailAt: FieldValue.serverTimestamp() };
    if (count >= 5) patch.lockedUntil = Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 3650);
    tx.set(ref, patch, { merge: true });
    return { count, locked: count >= 5 };
  });
  return result;
});

/** 로그인 성공 시 호출 — 실패 카운터 초기화 */
exports.resetLoginFailures = onCall(async (request) => {
  const { loginId } = request.data || {};
  if (!loginId) throw new HttpsError("invalid-argument", "loginId는 필수입니다.");
  await admin.firestore().doc(`loginAttempts/${loginId}`).set(
    { count: 0, lockedUntil: null }, { merge: true });
  return { ok: true };
});

/** 시스템관리자가 계정 잠금을 해제 */
exports.unlockAccount = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || !["ADM", "SYS"].includes(caller.token.role)) {
    throw new HttpsError("permission-denied", "행정담당자 또는 시스템관리자만 잠금을 해제할 수 있습니다.");
  }
  const { loginId } = request.data || {};
  if (!loginId) throw new HttpsError("invalid-argument", "loginId는 필수입니다.");

  await admin.firestore().doc(`loginAttempts/${loginId}`).set(
    { count: 0, lockedUntil: null }, { merge: true });
  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `loginAttempts/${loginId}`,
    action: "계정 잠금 해제", category: "계정 변경",
  });
  return { ok: true };
});

/** 행정담당자/시스템관리자가 계정을 즉시 만료(비활성화) 처리 — 감사 기록 보존을 위해 삭제 대신 비활성화 */
exports.deactivateAccount = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || !["ADM", "SYS"].includes(caller.token.role)) {
    throw new HttpsError("permission-denied", "행정담당자 또는 시스템관리자만 계정을 만료 처리할 수 있습니다.");
  }
  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "uid는 필수입니다.");

  await admin.auth().updateUser(uid, { disabled: true });
  await admin.firestore().doc(`users/${uid}`).set(
    { status: "expired", deactivatedAt: FieldValue.serverTimestamp(), deactivatedBy: caller.uid },
    { merge: true }
  );
  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `users/${uid}`,
    action: "계정 즉시 만료(비활성화)", category: "계정 변경",
  });
  return { ok: true };
});

/** 행정담당자/시스템관리자가 계정 비밀번호를 새 임시 비밀번호로 초기화 */
exports.resetPassword = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || !["ADM", "SYS"].includes(caller.token.role)) {
    throw new HttpsError("permission-denied", "행정담당자 또는 시스템관리자만 비밀번호를 초기화할 수 있습니다.");
  }
  const { uid } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "uid는 필수입니다.");

  const tempPassword = generateTempPassword();
  await admin.auth().updateUser(uid, { password: tempPassword });
  await admin.firestore().doc(`users/${uid}`).set(
    { mustChangePassword: true }, { merge: true }
  );
  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `users/${uid}`,
    action: "비밀번호 초기화", category: "계정 변경",
  });
  return { tempPassword };
});

async function assertInstructorOrAdmin(caller, courseId) {
  if (!caller) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  if (["ADM", "SYS"].includes(caller.token.role)) return;
  if (caller.token.role === "INS") {
    const course = await admin.firestore().doc(`courses/${courseId}`).get();
    if (course.exists && course.data().instructorUid === caller.uid) return;
  }
  throw new HttpsError("permission-denied", "해당 과정의 담당 교관 또는 관리자만 처리할 수 있습니다.");
}

/**
 * 정정 요청 승인/반려 — 승인 시 이미 잠긴(locked) 출결 레코드까지 함께 갱신해야 하므로
 * Firestore 규칙으로는 불가능하고 반드시 Admin SDK(Cloud Functions)를 거쳐야 한다.
 */
exports.decideCorrection = onCall(async (request) => {
  const caller = request.auth;
  const { correctionId, decision, note } = request.data || {};
  if (!correctionId || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "correctionId, decision(approved/rejected)은 필수입니다.");
  }

  const corrRef = admin.firestore().doc(`corrections/${correctionId}`);
  const corrSnap = await corrRef.get();
  if (!corrSnap.exists) throw new HttpsError("not-found", "정정 요청을 찾을 수 없습니다.");
  const corr = corrSnap.data();
  if (corr.status !== "pending") {
    throw new HttpsError("failed-precondition", "이미 처리된 정정 요청입니다.");
  }

  await assertInstructorOrAdmin(caller, corr.courseId);

  const batch = admin.firestore().batch();
  batch.update(corrRef, {
    status: decision, decidedBy: caller.uid, decidedAt: FieldValue.serverTimestamp(),
    decisionNote: note || null,
  });

  if (decision === "approved") {
    const attRef = admin.firestore().doc(
      `attendance/${corr.courseId}/${corr.date}/${corr.periodId}/records/${corr.uid}`);
    batch.set(attRef, {
      status: corr.after, locked: true, correctedFrom: correctionId,
    }, { merge: true });
  }
  await batch.commit();

  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `corrections/${correctionId}`,
    action: decision === "approved" ? "정정 승인" : "정정 반려", reason: note,
    category: decision === "approved" ? "정정 승인" : "정정 반려",
  });

  await admin.firestore().collection("notifications").add({
    uid: corr.uid,
    title: decision === "approved" ? "정정 요청 승인" : "정정 요청 반려",
    body: `${corr.date} ${corr.periodLabel || corr.periodId} · ${corr.before} → ${corr.after}` +
      (note ? ` · ${note}` : ""),
    createdAt: FieldValue.serverTimestamp(), read: false,
  });

  return { ok: true };
});

// ---------- 결과보고서 ----------

/** 해당 과정·날짜의 확정된 출결을 집계해 보고서를 생성한다 (담당 교관 또는 관리자). */
exports.createReport = onCall(async (request) => {
  const caller = request.auth;
  const { courseId, date } = request.data || {};
  if (!courseId || !date) throw new HttpsError("invalid-argument", "courseId, date는 필수입니다.");
  await assertInstructorOrAdmin(caller, courseId);

  const periodsSnap = await admin.firestore().collection(`courses/${courseId}/periods`).get();
  const summary = { total: 0, present: 0, late: 0, earlyLeave: 0, absent: 0, excused: 0, pending: 0 };
  for (const p of periodsSnap.docs) {
    const recordsSnap = await admin.firestore()
      .collection(`attendance/${courseId}/${date}/${p.id}/records`).get();
    for (const r of recordsSnap.docs) {
      const status = r.data().status;
      summary.total += 1;
      if (summary[status] !== undefined) summary[status] += 1;
    }
  }
  const denom = summary.total || 1;
  summary.rate = Math.round(((summary.total - summary.absent) / denom) * 1000) / 10;

  const course = await admin.firestore().doc(`courses/${courseId}`).get();

  const reportRef = await admin.firestore().collection("reports").add({
    courseId, courseName: course.data()?.name || courseId, date, type: "daily",
    writerUid: caller.uid, status: "submitted", summary,
    approvalPath: [
      { step: "작성", who: caller.uid, at: Timestamp.now(), status: "완료" },
    ],
    createdAt: FieldValue.serverTimestamp(),
  });

  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `reports/${reportRef.id}`,
    action: "결과보고서 작성", category: "보고서",
  });

  return { id: reportRef.id, summary };
});

/** 행정담당자가 보고서를 결재권자에게 상신한다. */
exports.forwardReport = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || !["ADM", "SYS"].includes(caller.token.role)) {
    throw new HttpsError("permission-denied", "행정담당자 또는 시스템관리자만 상신할 수 있습니다.");
  }
  const { reportId } = request.data || {};
  if (!reportId) throw new HttpsError("invalid-argument", "reportId는 필수입니다.");

  const ref = admin.firestore().doc(`reports/${reportId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "보고서를 찾을 수 없습니다.");
  if (snap.data().status !== "submitted") {
    throw new HttpsError("failed-precondition", "상신 가능한 상태가 아닙니다.");
  }

  await ref.update({
    status: "reviewing",
    approvalPath: FieldValue.arrayUnion({
      step: "검토·상신", who: caller.uid, at: Timestamp.now(), status: "완료",
    }),
  });

  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `reports/${reportId}`,
    action: "보고서 상신", category: "보고서",
  });
  return { ok: true };
});

/** 결재권자가 보고서를 승인/반려한다. */
exports.decideReport = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || caller.token.role !== "APR") {
    throw new HttpsError("permission-denied", "결재권자만 처리할 수 있습니다.");
  }
  const { reportId, decision, note } = request.data || {};
  if (!reportId || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "reportId, decision(approved/rejected)은 필수입니다.");
  }

  const ref = admin.firestore().doc(`reports/${reportId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "보고서를 찾을 수 없습니다.");
  if (snap.data().status !== "reviewing") {
    throw new HttpsError("failed-precondition", "결재 가능한 상태가 아닙니다.");
  }

  await ref.update({
    status: decision,
    approvalPath: FieldValue.arrayUnion({
      step: "결재", who: caller.uid, at: Timestamp.now(),
      status: decision === "approved" ? "승인" : "반려", note: note || null,
    }),
  });

  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `reports/${reportId}`,
    action: decision === "approved" ? "보고서 승인" : "보고서 반려", reason: note, category: "보고서",
  });
  return { ok: true };
});

/**
 * 교육생의 소속기관(예: 관할 소방서)에 출결 관련 사항을 통보한다.
 * 실제 SMS/이메일 발송 API(알리고, NCP SENS 등)는 아직 연동되지 않았다 — 발송 이력은
 * orgNotifications 컬렉션에 정식으로 기록되고 감사로그에도 남지만, 실제 문자/메일 전송은
 * 아래 TODO 지점에 발송사 SDK 호출을 추가해야 완성된다.
 */
exports.notifyOrg = onCall(async (request) => {
  const caller = request.auth;
  const { uid, reason } = request.data || {};
  if (!uid || !reason) throw new HttpsError("invalid-argument", "uid, reason은 필수입니다.");

  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  if (!userSnap.exists) throw new HttpsError("not-found", "교육생을 찾을 수 없습니다.");
  const student = userSnap.data();
  if (student.role !== "STU") throw new HttpsError("invalid-argument", "교육생 계정이 아닙니다.");
  if (!student.org) throw new HttpsError("failed-precondition", "등록된 소속기관 정보가 없습니다.");

  await assertInstructorOrAdmin(caller, student.courseId);

  let courseName = student.courseId || "-";
  if (student.courseId) {
    const courseSnap = await admin.firestore().doc(`courses/${student.courseId}`).get();
    courseName = courseSnap.data()?.name || courseName;
  }

  const message = `[소방학교] ${student.name}(${student.loginId}) 교육생 관련 안내: ${reason}`;

  // TODO: 실제 발송 연동 지점.
  // 예) 알리고 SMS: await sendAligoSms(student.phone, message)
  // 예) NCP SENS: await sendSensSms(student.phone, message)
  // 예) 이메일: await sendEmail(orgEmail, message) — Firebase "Trigger Email" 확장 등 이용
  const dispatch = { channel: "pending", note: "SMS/이메일 발송사 미연동 — 관리자가 수동으로 전달해야 합니다." };

  const ref = await admin.firestore().collection("orgNotifications").add({
    uid, studentName: student.name, loginId: student.loginId, org: student.org,
    courseId: student.courseId || null, courseName, reason, message,
    channel: dispatch.channel, dispatchNote: dispatch.note,
    sentBy: caller.uid, sentByRole: caller.token.role, sentAt: FieldValue.serverTimestamp(),
  });

  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `users/${uid}`,
    action: `소속기관 통보 (${student.org})`, reason, category: "소속기관 통보",
  });

  return { id: ref.id, message, dispatch };
});
