import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const createReportFn = httpsCallable(functions, "createReport");
const forwardReportFn = httpsCallable(functions, "forwardReport");
const decideReportFn = httpsCallable(functions, "decideReport");

export async function createReport(courseId, date) {
  const res = await createReportFn({ courseId, date });
  return res.data;
}

export async function forwardReport(reportId) {
  const res = await forwardReportFn({ reportId });
  return res.data;
}

export async function decideReport(reportId, decision, note) {
  const res = await decideReportFn({ reportId, decision, note });
  return res.data;
}
