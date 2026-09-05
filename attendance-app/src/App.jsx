import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { subscribeAuthState } from "./lib/auth";
import { getUserDoc } from "./lib/firestore";
import Login from "./pages/Login";
import EnrollPage from "./pages/EnrollPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import Layout from "./components/Layout";
import CoursesPage from "./pages/admin/CoursesPage";
import CourseDetailPage from "./pages/admin/CourseDetailPage";
import AccountsPage from "./pages/admin/AccountsPage";
import BulkUploadPage from "./pages/admin/BulkUploadPage";
import AdminReportsPage from "./pages/admin/ReportsPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import StatisticsPage from "./pages/admin/StatisticsPage";
import DashboardPage from "./pages/student/DashboardPage";
import StudentCorrectionsPage from "./pages/student/CorrectionsPage";
import AttendancePage from "./pages/instructor/AttendancePage";
import InstructorCorrectionsPage from "./pages/instructor/CorrectionsPage";
import InstructorReportsPage from "./pages/instructor/ReportsPage";
import ApprovalInboxPage from "./pages/approval/InboxPage";
import ReportDetailPage from "./pages/reports/DetailPage";

const DEFAULT_ROUTE = {
  STU: "/student",
  INS: "/instructor/attendance",
  ADM: "/admin/courses",
  SYS: "/admin/courses",
  APR: "/approval",
};

/** 현재 role이 roles에 없으면 자신의 홈 화면으로 되돌린다 — 직접 URL 입력으로 다른 역할 화면에 접근하는 것을 막는다. */
function RequireRole({ roles, role, children }) {
  if (!roles.includes(role)) return <Navigate to={DEFAULT_ROUTE[role] || "/student"} replace />;
  return children;
}

function App() {
  const [state, setState] = useState({ loading: true, user: null, role: null, mustChangePassword: false });

  useEffect(() => {
    const unsub = subscribeAuthState(async ({ user, role }) => {
      if (!user) {
        setState({ loading: false, user: null, role: null, mustChangePassword: false });
        return;
      }
      // mustChangePassword는 커스텀 클레임이 아니라 Firestore users 문서에 있으므로 별도 조회가 필요하다.
      const userDoc = await getUserDoc(user.uid);
      setState({ loading: false, user, role, mustChangePassword: !!userDoc?.mustChangePassword });
    });
    return unsub;
  }, []);

  if (state.loading) return null;

  // /enroll(첫날 공통 QR로 들어오는 화면)은 로그인 여부와 무관하게 항상 접근 가능해야 한다.
  if (window.location.pathname === "/enroll") return <EnrollPage />;

  if (!state.user) return <Login />;

  // 관리자가 임시 비밀번호로 계정을 만들었다면, 다른 화면보다 먼저 비밀번호 변경을 강제한다.
  if (state.mustChangePassword) {
    return (
      <ChangePasswordPage
        onDone={() => setState((s) => ({ ...s, mustChangePassword: false }))}
      />
    );
  }

  const { user, role } = state;
  const home = DEFAULT_ROUTE[role] || "/student";

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout user={user} role={role} />}>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="/student" element={
            <RequireRole roles={["STU"]} role={role}><DashboardPage user={user} /></RequireRole>
          } />
          <Route path="/student/corrections" element={
            <RequireRole roles={["STU"]} role={role}><StudentCorrectionsPage user={user} /></RequireRole>
          } />
          <Route path="/instructor/attendance" element={
            <RequireRole roles={["INS", "ADM", "SYS"]} role={role}><AttendancePage user={user} role={role} /></RequireRole>
          } />
          <Route path="/instructor/corrections" element={
            <RequireRole roles={["INS", "ADM", "SYS"]} role={role}><InstructorCorrectionsPage user={user} role={role} /></RequireRole>
          } />
          <Route path="/instructor/reports" element={
            <RequireRole roles={["INS", "ADM", "SYS"]} role={role}><InstructorReportsPage user={user} role={role} /></RequireRole>
          } />
          <Route path="/admin/courses" element={
            <RequireRole roles={["ADM", "SYS"]} role={role}><CoursesPage /></RequireRole>
          } />
          <Route path="/admin/courses/:courseId" element={
            <RequireRole roles={["ADM", "SYS"]} role={role}><CourseDetailPage /></RequireRole>
          } />
          <Route path="/admin/courses/:courseId/upload" element={
            <RequireRole roles={["ADM", "SYS"]} role={role}><BulkUploadPage /></RequireRole>
          } />
          <Route path="/admin/accounts" element={
            <RequireRole roles={["ADM", "SYS"]} role={role}><AccountsPage /></RequireRole>
          } />
          <Route path="/admin/reports" element={
            <RequireRole roles={["ADM", "SYS"]} role={role}><AdminReportsPage /></RequireRole>
          } />
          <Route path="/admin/statistics" element={
            <RequireRole roles={["ADM", "SYS"]} role={role}><StatisticsPage /></RequireRole>
          } />
          <Route path="/admin/audit-log" element={
            <RequireRole roles={["ADM", "SYS"]} role={role}><AuditLogPage /></RequireRole>
          } />
          <Route path="/approval" element={
            <RequireRole roles={["APR"]} role={role}><ApprovalInboxPage /></RequireRole>
          } />
          <Route path="/reports/:reportId" element={
            <RequireRole roles={["INS", "ADM", "APR", "SYS"]} role={role}><ReportDetailPage /></RequireRole>
          } />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
