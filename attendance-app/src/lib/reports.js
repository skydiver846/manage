import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const createReportFn = httpsCallable(functions, "createReport");
const createEnrollmentReportFn = httpsCallable(functions, "createEnrollmentReport");
const forwardReportFn = httpsCallable(functions, "forwardReport");
const decideReportFn = httpsCallable(functions, "decideReport");
const deleteReportFn = httpsCallable(functions, "deleteReport");
const withdrawReportFn = httpsCallable(functions, "withdrawReport");
const refreshReportSummaryFn = httpsCallable(functions, "refreshReportSummary");

export async function createReport(courseId, date) {
  const res = await createReportFn({ courseId, date });
  return res.data;
}

/** 첫날 QR 자가등록을 마친 교육생 명단(순번·시도·소속·계급·성명·입교등록시간)으로 보고서를 만든다. */
export async function createEnrollmentReport(courseId) {
  const res = await createEnrollmentReportFn({ courseId });
  return res.data; // { id, count }
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

/** 관리자 전용 — 결재 대기 중인 보고서를 "작성 완료" 상태로 되돌린다(상신취소). */
export async function withdrawReport(reportId) {
  const res = await withdrawReportFn({ reportId });
  return res.data;
}

/** 아직 상신 전인 보고서의 집계를 현재 출결 데이터로 다시 계산 (수정). */
export async function refreshReportSummary(reportId) {
  const res = await refreshReportSummaryFn({ reportId });
  return res.data; // { summary }
}
