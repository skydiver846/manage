import * as XLSX from "xlsx";

const HEADERS = ["로그인ID", "이름", "시도", "소속기관", "계급", "연락처"];
const LOGIN_ID_RE = /^[A-Za-z0-9._-]{2,30}$/;

/** 업로드용 빈 템플릿(.xlsx)을 다운로드한다. */
export function downloadStudentTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ["2026-0501", "홍길동", "서울", "동부소방서 예방안전과", "소방교", "010-1234-5678"],
  ]);
  ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 10 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "명단");
  XLSX.writeFile(wb, "교육생_명단_양식.xlsx");
}

/**
 * 엑셀/CSV 파일을 읽어 행별 검증 결과를 반환한다.
 * 실제 계정 생성은 하지 않는다 — 미리보기 전용.
 */
export async function parseStudentExcel(file, existingLoginIds) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const seen = new Set();
  const existing = new Set((existingLoginIds || []).map((s) => s.toLowerCase()));

  return rows.map((row, i) => {
    const loginId = String(row["로그인ID"] ?? "").trim();
    const name = String(row["이름"] ?? "").trim();
    const region = String(row["시도"] ?? "").trim();
    const org = String(row["소속기관"] ?? "").trim();
    const rank = String(row["계급"] ?? "").trim();
    const phone = String(row["연락처"] ?? "").trim();
    const errors = [];

    if (!loginId) errors.push("로그인ID 없음");
    else if (!LOGIN_ID_RE.test(loginId)) errors.push("로그인ID 형식 오류(영문/숫자/.-_만 2~30자)");
    else if (seen.has(loginId.toLowerCase())) errors.push("파일 내 로그인ID 중복");
    else if (existing.has(loginId.toLowerCase())) errors.push("이미 사용 중인 로그인ID");

    if (!name) errors.push("이름 없음");

    if (loginId) seen.add(loginId.toLowerCase());

    return { row: i + 2, loginId, name, region, org, rank, phone, errors, ok: errors.length === 0 };
  });
}

/** 일괄 등록 결과(로그인ID/초기 비밀번호)를 엑셀로 다운로드한다 — 학생들에게 배포할 목적. */
export function downloadResultsExcel(results, courseName) {
  const rows = [["로그인ID", "이름", "초기 비밀번호", "상태"]];
  for (const r of results) {
    rows.push([r.loginId, r.name, r.tempPassword || "-", r.ok ? "성공" : `실패: ${r.error}`]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "결과");
  XLSX.writeFile(wb, `${courseName || "일괄등록"}_계정생성결과.xlsx`);
}
