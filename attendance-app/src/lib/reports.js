import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const createReportFn = httpsCallable(functions, "createReport");
const forwardReportFn = httpsCallable(functions, "forwardReport");
const decideReportFn = httpsCallable(functions, "decideReport");
const deleteReportFn = httpsCallable(functions, "deleteReport");

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

/** 관리자 전용 — 승인되지 않은 보고서 삭제 (오생성·테스트 보고서 정리용). */
export async function deleteReport(reportId) {
  const res = await deleteReportFn({ reportId });
  return res.data;
}
