import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const notifyOrgFn = httpsCallable(functions, "notifyOrg");

export async function notifyOrg(uid, reason) {
  const res = await notifyOrgFn({ uid, reason });
  return res.data; // { id, message, dispatch }
}
