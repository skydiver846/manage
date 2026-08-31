import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const bootstrapFirstAdminFn = httpsCallable(functions, "bootstrapFirstAdmin");
const createAccountFn = httpsCallable(functions, "createAccount");
const deactivateAccountFn = httpsCallable(functions, "deactivateAccount");
const resetPasswordFn = httpsCallable(functions, "resetPassword");
const selfEnrollAndCheckInFn = httpsCallable(functions, "selfEnrollAndCheckIn");

/** 최초 1회만 동작하는 관리자 계정 생성. 관리자가 이미 있으면 already-exists 에러를 던진다. */
export async function bootstrapFirstAdmin({ loginId, password, name }) {
  const res = await bootstrapFirstAdminFn({ loginId, password, name });
  return res.data; // { uid, email }
}

/**
 * 계정 생성. password를 직접 넘기면 관리자가 지정한 비밀번호로 생성되고,
 * 비워두면(undefined/null/"") 서버가 임시 비밀번호를 자동 생성한다.
 */
export async function createAccount({ loginId, name, role, courseId, org, phone, password }) {
  const res = await createAccountFn({ loginId, name, role, courseId, org, phone, password: password || undefined });
  return res.data; // { uid, loginId, tempPassword, setByAdmin }
}

export async function deactivateAccount(uid) {
  const res = await deactivateAccountFn({ uid });
  return res.data;
}

export async function resetPassword(uid) {
  const res = await resetPasswordFn({ uid });
  return res.data; // { tempPassword }
}

/**
 * 첫날 공통 QR로 본인이 직접 가입(계정 활성화) + 입교등록 + 그날 출석을 한 번에 처리.
 * 로그인 없이 호출 가능 — 휴대전화 뒷자리 4자리로 본인 확인을 대신한다.
 */
export async function selfEnrollAndCheckIn({ loginId, phoneLast4, courseId, periodId }) {
  const res = await selfEnrollAndCheckInFn({ loginId, phoneLast4, courseId, periodId });
  return res.data; // { customToken, name, role }
}
