import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { subscribeAuthState } from "./lib/auth";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import CoursesPage from "./pages/admin/CoursesPage";
import CourseDetailPage from "./pages/admin/CourseDetailPage";
import AccountsPage from "./pages/admin/AccountsPage";
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

function App() {
  const [state, setState] = useState({ loading: true, user: null, role: null });

  useEffect(() => {
    const unsub = subscribeAuthState(({ user, role }) => {
      setState({ loading: false, user, role });
    });
    return unsub;
  }, []);

  if (state.loading) return null;
  if (!state.user) return <Login />;

  const { user, role } = state;
  const home = DEFAULT_ROUTE[role] || "/student";

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout user={user} role={role} />}>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="/student" element={<DashboardPage user={user} />} />
          <Route path="/student/corrections" element={<StudentCorrectionsPage user={user} />} />
          <Route path="/instructor/attendance" element={<AttendancePage user={user} role={role} />} />
          <Route path="/instructor/corrections" element={<InstructorCorrectionsPage user={user} role={role} />} />
          <Route path="/instructor/reports" element={<InstructorReportsPage user={user} role={role} />} />
          <Route path="/admin/courses" element={<CoursesPage />} />
          <Route path="/admin/courses/:courseId" element={<CourseDetailPage />} />
          <Route path="/admin/accounts" element={<AccountsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/statistics" element={<StatisticsPage />} />
          <Route path="/admin/audit-log" element={<AuditLogPage />} />
          <Route path="/approval" element={<ApprovalInboxPage />} />
          <Route path="/reports/:reportId" element={<ReportDetailPage />} />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
