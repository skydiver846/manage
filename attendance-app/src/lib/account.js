import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const createAccountFn = httpsCallable(functions, "createAccount");
const deactivateAccountFn = httpsCallable(functions, "deactivateAccount");

export async function createAccount({ loginId, name, role, courseId, org, phone }) {
  const res = await createAccountFn({ loginId, name, role, courseId, org, phone });
  return res.data; // { uid, loginId, tempPassword }
}

export async function deactivateAccount(uid) {
  const res = await deactivateAccountFn({ uid });
  return res.data;
}
