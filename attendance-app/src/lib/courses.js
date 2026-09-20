import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const deleteCourseFn = httpsCallable(functions, "deleteCourse");

/**
 * 과정 영구 삭제 — 교시·출결기록·정정요청·소속기관 통보 이력까지 함께 제거된다.
 * 이미 결과보고서가 작성된 과정은 서버에서 거부한다(감사 기록 보존).
 */
export async function deleteCourse(courseId) {
  const res = await deleteCourseFn({ courseId });
  return res.data; // { ok: true }
}
