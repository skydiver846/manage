import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCourse, listAllUsers } from "../../lib/firestore";
import { createAccount } from "../../lib/account";
import { parseStudentExcel, downloadStudentTemplate, downloadResultsExcel } from "../../lib/excel";
import { Card, Button, Alert, Pill } from "../../components/ui";

export default function BulkUploadPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getCourse(courseId).then(setCourse);
  }, [courseId]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    setMsg("");
    try {
      const users = await listAllUsers();
      const existingLoginIds = users.map((u) => u.loginId);
      const parsed = await parseStudentExcel(file, existingLoginIds);
      setRows(parsed);
    } catch (err) {
      setMsg("오류: 파일을 읽을 수 없습니다 — " + err.message);
      setRows(null);
    }
  }

  const validRows = rows?.filter((r) => r.ok) ?? [];
  const invalidRows = rows?.filter((r) => !r.ok) ?? [];

  async function handleBulkCreate() {
    setUploading(true);
    setProgress(0);
    const out = [];
    for (const r of validRows) {
      try {
        const res = await createAccount({
          loginId: r.loginId, name: r.name, role: "STU", courseId,
          org: r.org || null, phone: r.phone || null,
        });
        out.push({ ...r, ok: true, tempPassword: res.tempPassword });
      } catch (err) {
        out.push({ ...r, ok: false, error: err.message });
      }
      setProgress((p) => p + 1);
    }
    setResults(out);
    setUploading(false);
  }

  const successCount = results?.filter((r) => r.ok).length ?? 0;
  const failCount = results?.filter((r) => !r.ok).length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 900 }}>
      <div>
        <Link to={`/admin/courses/${courseId}`} style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>← {course?.name || "과정"}으로 돌아가기</Link>
        <h1 style={{ font: "var(--type-h2)", color: "var(--text-strong)" }}>수강생 명단 일괄 업로드</h1>
        <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{course?.name}</span>
      </div>

      <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>1. 양식 다운로드 후 작성</span>
          <Button variant="secondary" onClick={downloadStudentTemplate}>엑셀 양식 다운로드</Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>2. 작성한 파일 업로드</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          {fileName && <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{fileName}</span>}
        </div>
        {msg && <Alert tone="danger">{msg}</Alert>}
      </Card>

      {rows && (
        <Card padding="none">
          <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <span style={{ font: "var(--type-label)", color: "var(--text-strong)" }}>
              3. 미리보기 — 정상 {validRows.length}건 / 오류 {invalidRows.length}건
            </span>
            {!results && (
              <Button disabled={validRows.length === 0 || uploading} loading={uploading} onClick={handleBulkCreate}>
                {uploading ? `등록 중... (${progress}/${validRows.length})` : `${validRows.length}건 일괄 등록`}
              </Button>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-sunken)" }}>
                  {["행", "로그인ID", "이름", "소속기관", "연락처", "상태"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 16px", font: "var(--type-caption)", color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px 16px", font: "var(--type-body-sm)" }}>{r.row}</td>
                    <td style={{ padding: "8px 16px", font: "var(--type-body-sm)" }}>{r.loginId || "-"}</td>
                    <td style={{ padding: "8px 16px", font: "var(--type-body-sm)" }}>{r.name || "-"}</td>
                    <td style={{ padding: "8px 16px", font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{r.org || "-"}</td>
                    <td style={{ padding: "8px 16px", font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{r.phone || "-"}</td>
                    <td style={{ padding: "8px 16px" }}>
                      {r.ok ? <Pill tone="ok">정상</Pill> : <Pill tone="bad">{r.errors.join(", ")}</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {results && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <Alert tone={failCount === 0 ? "success" : "warning"}>
              등록 완료 — 성공 {successCount}건{failCount > 0 ? `, 실패 ${failCount}건` : ""}
            </Alert>
            <Button variant="secondary" onClick={() => downloadResultsExcel(results, course?.name)}>결과(초기 비밀번호) 엑셀 다운로드</Button>
          </div>
          <p style={{ font: "var(--type-caption)", color: "var(--text-subtle)", marginTop: "var(--space-3)" }}>
            SMS 자동발송 미연동 — 다운로드한 엑셀로 초기 비밀번호를 교육생에게 직접 전달해주세요.
          </p>
        </Card>
      )}
    </div>
  );
}
