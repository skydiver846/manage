import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdTokenResult,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./firebase";

const EMAIL_DOMAIN = "fireacademy.local";
const toEmail = (loginId) => `${loginId}@${EMAIL_DOMAIN}`;

const checkLoginAllowed = httpsCallable(functions, "checkLoginAllowed");
const recordLoginFailure = httpsCallable(functions, "recordLoginFailure");
const resetLoginFailures = httpsCallable(functions, "resetLoginFailures");

/** 사번/교육생번호 + 비밀번호로 로그인. 5회 실패 잠금 로직을 포함한다. */
export async function loginWithId(loginId, password) {
  await checkLoginAllowed({ loginId }); // 잠금 상태면 여기서 permission-denied throw

  try {
    const cred = await signInWithEmailAndPassword(auth, toEmail(loginId), password);
    await resetLoginFailures({ loginId });
    return cred.user;
  } catch (e) {
    if (["auth/wrong-password", "auth/invalid-credential", "auth/user-not-found"].includes(e.code)) {
      const r = await recordLoginFailure({ loginId });
      if (r.data.locked) {
        throw new Error("5회 로그인 실패로 계정이 잠겼습니다. 행정담당자에게 문의하세요.");
      }
      throw new Error(`아이디 또는 비밀번호가 올바르지 않습니다. (실패 ${r.data.count}/5회)`);
    }
    throw e;
  }
}

export function logout() {
  return signOut(auth);
}

/** 로그인 상태 + 역할(Custom Claims)을 구독한다. */
export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback({ user: null, role: null });
    const token = await getIdTokenResult(user, true);
    callback({ user, role: token.claims.role || null });
  });
}
