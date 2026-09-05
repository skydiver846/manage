const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const crypto = require("node:crypto");

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast3" });

const VALID_ROLES = ["STU", "INS", "ADM", "APR", "SYS"];
const EMAIL_DOMAIN = "fireacademy.local";
// 5회 로그인 실패 시 잠기는 시간. 기존에는 10년(사실상 영구 잠금)이었으나,
// 관리자 본인 계정이 잠기면 아무도 풀 수 없는 문제가 있어 30분 자동 해제로 변경.
const LOGIN_LOCK_DURATION_MS = 1000 * 60 * 30; // 30분
const ADMIN_ROLES = ["ADM", "SYS"];
// 첫날 자가등록(selfEnrollAndCheckIn)의 휴대전화 뒷자리 4자리 무차별 대입 방지용 잠금.
const ENROLL_LOCK_DURATION_MS = 1000 * 60 * 30; // 30분
const ENROLL_MAX_ATTEMPTS = 5;

function toEmail(loginId) {
  return `${loginId}@${EMAIL_DOMAIN}`;
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[crypto.randomInt(chars.length)];
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
  const { loginId, name, role, courseId, org, phone, password } = request.data || {};
  if (!loginId || !name || !VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", "loginId, name, role(STU/INS/ADM/APR/SYS)은 필수입니다.");
  }
  // 관리자가 비밀번호를 직접 지정할 수도 있고(권장), 비워두면 기존처럼 임시 비밀번호를 자동 생성한다.
  // (교육생 계정은 어차피 첫날 QR 자가등록 시 비밀번호가 재설정되므로 자동생성으로 충분하다.)
  if (password && password.length < 8) {
    throw new HttpsError("invalid-argument", "비밀번호는 8자 이상이어야 합니다.");
  }

  const email = toEmail(loginId);
  const setByAdmin = !!password;
  const finalPassword = password || generateTempPassword();

  let userRecord;
  try {
    userRecord = await admin.auth().createUser({ email, password: finalPassword, displayName: name });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", `이미 사용 중인 계정ID입니다: ${loginId}`);
    }
    throw new HttpsError("internal", e.message);
  }
  await admin.auth().setCustomUserClaims(userRecord.uid, { role, courseId: courseId || null });

  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    loginId, name, role, courseId: courseId || null, org: org || null, phone: phone || null,
    status: "active", mustChangePassword: !setByAdmin,
    createdAt: FieldValue.serverTimestamp(), createdBy: caller.uid,
  });

  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `users/${userRecord.uid}`,
    action: `계정 생성 (${role})`, category: "계정 변경",
  });

  // TODO: 실제 운영 시 여기서 SMS 발송 API(알리고/NCP SENS 등) 연동
  // setByAdmin이 true면 관리자가 이미 그 비밀번호를 알고 있으므로 굳이 화면에 다시 노출하지 않는다.
  return { uid: userRecord.uid, loginId, tempPassword: setByAdmin ? null : finalPassword, setByAdmin };
});

/**
 * 첫날 공통 QR로 본인이 직접 가입(계정 활성화) + 입교등록 + 그날 출석을 한 번에 처리.
 * 관리자가 엑셀로 미리 만들어둔 계정(로그인ID·이름·전화번호가 users 문서에 있는 상태)을
 * 교육생 본인이 "로그인ID + 휴대전화 뒷자리 4자리"로 확인·활성화한다.
 * 인증 없이 호출 가능 — 대신 전화번호 뒷자리 일치 여부로 본인 확인을 대신한다.
 *
 * Firebase Auth는 비밀번호 최소 6자를 요구하므로, 실제 비밀번호는
 * `로그인ID_전화번호뒷4자리` 형태로 만든다. 화면에서는 사용자가 뒷자리 4자리만
 * 입력하면 되고, 이 조합은 프론트엔드가 로그인 시에도 동일하게 만들어 써야 한다
 * (아래 makePassword와 반드시 같은 규칙을 프론트엔드에도 적용할 것).
 */
function makePassword(loginId, phoneLast4) {
  return `${loginId}_${phoneLast4}`;
}

exports.selfEnrollAndCheckIn = onCall(async (request) => {
  const { loginId, phoneLast4, courseId, periodId } = request.data || {};
  if (!loginId || !phoneLast4 || !courseId || !periodId) {
    throw new HttpsError("invalid-argument", "loginId, phoneLast4, courseId, periodId는 필수입니다.");
  }
  if (!/^\d{4}$/.test(phoneLast4)) {
    throw new HttpsError("invalid-argument", "휴대전화 뒷자리는 숫자 4자리여야 합니다.");
  }

  // 뒷자리 4자리(경우의 수 10,000)는 무차별 대입이 쉬우므로, 인증 없이 호출 가능한
  // 이 함수는 loginId 기준으로 실패 횟수를 세어 잠근다(로그인 5회 실패 잠금과 동일한 패턴).
  const attemptRef = admin.firestore().doc(`enrollAttempts/${loginId}`);
  const attemptSnap = await attemptRef.get();
  const attemptData = attemptSnap.data();
  if (attemptData?.lockedUntil && attemptData.lockedUntil.toMillis() > Date.now()) {
    const remainingMin = Math.ceil((attemptData.lockedUntil.toMillis() - Date.now()) / 60000);
    throw new HttpsError(
      "permission-denied",
      `입력 시도 횟수를 초과했습니다. 약 ${remainingMin}분 후 다시 시도하거나 관리자에게 문의하세요.`
    );
  }
  async function recordAttemptFailure() {
    await admin.firestore().runTransaction(async (tx) => {
      const doc = await tx.get(attemptRef);
      const count = (doc.data()?.count || 0) + 1;
      const patch = { count, lastFailAt: FieldValue.serverTimestamp() };
      if (count >= ENROLL_MAX_ATTEMPTS) {
        patch.lockedUntil = Timestamp.fromMillis(Date.now() + ENROLL_LOCK_DURATION_MS);
      }
      tx.set(attemptRef, patch, { merge: true });
    });
  }

  const usersSnap = await admin.firestore().collection("users")
    .where("loginId", "==", loginId).limit(1).get();
  if (usersSnap.empty) {
    await recordAttemptFailure();
    throw new HttpsError("not-found", "등록되지 않은 로그인ID입니다. 관리자에게 문의하세요.");
  }
  const userDoc = usersSnap.docs[0];
  const userData = userDoc.data();

  if (userData.status !== "active") {
    throw new HttpsError("failed-precondition", "비활성화된 계정입니다. 관리자에게 문의하세요.");
  }
  // 이미 첫날 자가등록을 마친 계정은 이 함수를 다시 쓸 수 없게 막는다 — 그렇지 않으면
  // loginId+휴대전화 뒷자리만 알면 언제든 비밀번호를 재설정하고 로그인할 수 있는
  // 영구 백도어가 되어버린다. 이후 로그인은 정식 로그인 화면(비밀번호)을 사용해야 한다.
  if (userData.selfClaimed) {
    throw new HttpsError(
      "failed-precondition",
      "이미 입교등록이 완료된 계정입니다. 등록 시 설정된 비밀번호로 로그인해주세요."
    );
  }
  if (!userData.phone || !userData.phone.endsWith(phoneLast4)) {
    await recordAttemptFailure();
    throw new HttpsError("permission-denied", "휴대전화 뒷자리 4자리가 일치하지 않습니다.");
  }
  if (userData.courseId && userData.courseId !== courseId) {
    await recordAttemptFailure();
    throw new HttpsError("permission-denied", "이 과정에 등록된 계정이 아닙니다.");
  }

  const uid = userDoc.id;
  const newPassword = makePassword(loginId, phoneLast4);

  await admin.auth().updateUser(uid, { password: newPassword });
  await userDoc.ref.set(
    { selfClaimed: true, mustChangePassword: false, claimedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  await attemptRef.set({ count: 0, lockedUntil: null }, { merge: true });

  // 그날 출석을 "신청(pending)" 상태로 기록 — 다른 체크인 방식과 동일하게
  // 교관이 교시 종료 후 일괄 확정한다. uid가 문서ID라 다시 스캔해도 중복되지 않는다.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  await admin.firestore()
    .doc(`attendance/${courseId}/${today}/${periodId}/records/${uid}`)
    .set({ status: "pending", checkedInAt: FieldValue.serverTimestamp(), method: "selfEnroll" }, { merge: true });

  await writeAudit({
    actorUid: uid, actorRole: userData.role, target: `users/${uid}`,
    action: "본인 계정 활성화(입교등록) + 첫날 출석", category: "계정 변경",
  });

  // 프론트엔드가 signInWithCustomToken()으로 즉시 로그인 처리할 수 있도록 커스텀 토큰 발급.
  // 계정 생성 시 이미 설정된 role 등의 커스텀 클레임은 그대로 유지된다.
  const customToken = await admin.auth().createCustomToken(uid);

  return { customToken, name: userData.name, role: userData.role };
});

/** 로그인 시도 전에 호출 — 5회 실패 잠금 여부 확인 */
exports.checkLoginAllowed = onCall(async (request) => {
  const { loginId } = request.data || {};
  if (!loginId) throw new HttpsError("invalid-argument", "loginId는 필수입니다.");

  const ref = admin.firestore().doc(`loginAttempts/${loginId}`);
  const snap = await ref.get();
  const data = snap.data();
  if (data?.lockedUntil && data.lockedUntil.toMillis() > Date.now()) {
    const remainingMin = Math.ceil((data.lockedUntil.toMillis() - Date.now()) / 60000);
    throw new HttpsError(
      "permission-denied",
      `5회 로그인 실패로 계정이 잠겼습니다. 약 ${remainingMin}분 후 다시 시도하거나, 행정담당자에게 잠금 해제를 요청하세요.`
    );
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
    if (count >= 5) patch.lockedUntil = Timestamp.fromMillis(Date.now() + LOGIN_LOCK_DURATION_MS);
    tx.set(ref, patch, { merge: true });
    return { count, locked: count >= 5 };
  });
  return result;
});

/**
 * 로그인 성공 시 호출 — 실패 카운터 초기화.
 * 이 함수 자체는 인증 여부를 강제하지 않으면 "성공 시에만 호출"이라는 약속을
 * 클라이언트가 어겨도(또는 공격자가 직접 호출해도) 막을 방법이 없어, 5회 실패
 * 잠금 자체가 무력화된다. 따라서 반드시 "지금 loginId 본인 계정으로 로그인된
 * 상태"일 때만 허용한다 — 이는 실제로 비밀번호를 맞혀 Firebase Auth 로그인에
 * 성공한 경우에만 성립하므로, 잠금 우회 목적으로는 쓸 수 없다.
 */
exports.resetLoginFailures = onCall(async (request) => {
  const caller = request.auth;
  const { loginId } = request.data || {};
  if (!loginId) throw new HttpsError("invalid-argument", "loginId는 필수입니다.");
  if (!caller || caller.token.email !== toEmail(loginId)) {
    throw new HttpsError("permission-denied", "본인 계정의 실패 카운터만 초기화할 수 있습니다.");
  }
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

/** 행정담당자/시스템관리자가 첫날 자가등록(selfEnrollAndCheckIn) 시도 잠금을 해제 */
exports.unlockEnrollAttempt = onCall(async (request) => {
  const caller = request.auth;
  if (!caller || !["ADM", "SYS"].includes(caller.token.role)) {
    throw new HttpsError("permission-denied", "행정담당자 또는 시스템관리자만 잠금을 해제할 수 있습니다.");
  }
  const { loginId } = request.data || {};
  if (!loginId) throw new HttpsError("invalid-argument", "loginId는 필수입니다.");

  await admin.firestore().doc(`enrollAttempts/${loginId}`).set(
    { count: 0, lockedUntil: null }, { merge: true });
  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `enrollAttempts/${loginId}`,
    action: "입교등록(첫날 자가등록) 시도 잠금 해제", category: "계정 변경",
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

  // 마지막 남은 관리자(ADM/SYS) 계정은 비활성화할 수 없다 — 관리자가 0명이 되면
  // 이후 잠금·비밀번호 문제가 생겼을 때 아무도 앱 화면으로 복구할 수 없기 때문이다.
  const targetSnap = await admin.firestore().doc(`users/${uid}`).get();
  const targetData = targetSnap.data();
  if (targetData && ADMIN_ROLES.includes(targetData.role) && targetData.status !== "expired") {
    const otherActiveAdmins = await admin.firestore().collection("users")
      .where("role", "in", ADMIN_ROLES)
      .where("status", "==", "active")
      .get();
    const remaining = otherActiveAdmins.docs.filter((d) => d.id !== uid);
    if (remaining.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "마지막 남은 관리자(행정담당자/시스템관리자) 계정은 비활성화할 수 없습니다. 먼저 다른 관리자 계정을 만드세요."
      );
    }
  }

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

/**
 * 본인이 임시 비밀번호(mustChangePassword:true)를 최초 로그인 직후 새 비밀번호로 변경 완료했음을 기록.
 * 실제 Firebase Auth 비밀번호 변경은 클라이언트가 updatePassword()로 직접 처리하고,
 * users 문서는 클라이언트 쓰기가 막혀 있으므로(firestore.rules) 그 이후 이 함수로 플래그만 내린다.
 */
exports.completePasswordChange = onCall(async (request) => {
  const caller = request.auth;
  if (!caller) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  await admin.firestore().doc(`users/${caller.uid}`).set(
    { mustChangePassword: false }, { merge: true }
  );
  await writeAudit({
    actorUid: caller.uid, actorRole: caller.token.role, target: `users/${caller.uid}`,
    action: "최초 로그인 비밀번호 변경 완료", category: "계정 변경",
  });
  return { ok: true };
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
