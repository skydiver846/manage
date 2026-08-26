import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const bootstrapFirstAdminFn = httpsCallable(functions, "bootstrapFirstAdmin");
const createAccountFn = httpsCallable(functions, "createAccount");
const deactivateAccountFn = httpsCallable(functions, "deactivateAccount");

/** 최초 1회만 동작하는 관리자 계정 생성. 관리자가 이미 있으면 already-exists 에러를 던진다. */
export async function bootstrapFirstAdmin({ loginId, password, name }) {
  const res = await bootstrapFirstAdminFn({ loginId, password, name });
  return res.data; // { uid, email }
}

export async function createAccount({ loginId, name, role, courseId, org, phone }) {
  const res = await createAccountFn({ loginId, name, role, courseId, org, phone });
  return res.data; // { uid, loginId, tempPassword }
}

export async function deactivateAccount(uid) {
  const res = await deactivateAccountFn({ uid });
  return res.data;
}
