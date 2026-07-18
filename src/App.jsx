import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/auth/Login';
import VerifyOtp from './pages/auth/VerifyOtp';
import ForcePasswordChange from './pages/auth/ForcePasswordChange';
import DashboardHome from './pages/dashboard/DashboardHome';
import CustomersList from './pages/customers/CustomersList';
import CustomerDetail from './pages/customers/CustomerDetail';
import LoansList from './pages/loans/LoansList';
import LoanDetail from './pages/loans/LoanDetail';
import LeadsList from './pages/leads/LeadsList';
import CollectionCasesList from './pages/collection/CollectionCasesList';
import ComplaintsList from './pages/complaints/ComplaintsList';
import ProfilePage from './pages/profile/ProfilePage';
import AdminUsersList from './pages/adminUsers/AdminUsersList';
import RolesList from './pages/roles/RolesList';
import RoleDetail from './pages/roles/RoleDetail';
import KpiPage from './pages/kpi/KpiPage';
import ScoringPage from './pages/scoring/ScoringPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import ReportsPage from './pages/reports/ReportsPage';
import PlatformConfigPage from './pages/config/PlatformConfigPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/force-password-change" element={<ForcePasswordChange />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardHome />} />

        <Route
          path="/customers"
          element={
            <ProtectedRoute anyOf={['view_customer_profile', 'view_assigned_complaints', 'view_team_customers']}>
              <CustomersList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:userID"
          element={
            <ProtectedRoute
              anyOf={[
                'view_customer_profile',
                'view_assigned_collection_cases',
                'view_assigned_leads',
                'view_assigned_complaints',
                'view_team_customers',
              ]}
            >
              <CustomerDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/loans"
          element={
            <ProtectedRoute
              anyOf={[
                'view_loan_details',
                'view_loan_queue',
                'view_overdue_loans',
                'view_repayment_logs',
              ]}
            >
              <LoansList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loans/:loanID"
          element={
            <ProtectedRoute permission="view_loan_details">
              <LoanDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leads"
          element={
            <ProtectedRoute anyOf={['view_all_leads', 'view_assigned_leads']}>
              <LeadsList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/collection"
          element={
            <ProtectedRoute anyOf={['view_all_collection_cases', 'view_assigned_collection_cases']}>
              <CollectionCasesList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/complaints"
          element={
            <ProtectedRoute anyOf={['view_all_complaints', 'view_assigned_complaints']}>
              <ComplaintsList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute permission="view_own_profile">
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-users"
          element={
            <ProtectedRoute permission="view_admin_users">
              <AdminUsersList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <ProtectedRoute permission="view_roles">
              <RolesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles/:roleID"
          element={
            <ProtectedRoute permission="view_roles">
              <RoleDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kpi"
          element={
            <ProtectedRoute
              anyOf={[
                'view_own_kpi',
                'view_telemarketer_kpi',
                'view_collection_officer_kpi',
                'view_customer_care_kpi',
                'view_junior_operations_kpi',
                'view_all_kpi',
                'set_telemarketer_targets',
                'set_collection_officer_targets',
                'set_customer_care_targets',
                'set_junior_operations_targets',
              ]}
            >
              <KpiPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scoring"
          element={
            <ProtectedRoute
              anyOf={[
                'score_telemarketer_team',
                'score_collection_officer_team',
                'score_customer_care_team',
                'score_any_team',
                'view_qualitative_scores',
              ]}
            >
              <ScoringPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit"
          element={
            <ProtectedRoute permission="view_audit_logs">
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              anyOf={[
                'view_telemarketer_team_reports',
                'view_collection_officer_team_reports',
                'view_customer_care_team_reports',
                'view_all_staff_reports',
                'view_npl_default_reports',
                'view_revenue',
                'view_company_wide_kpis',
                'view_payout_logs',
              ]}
            >
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/config"
          element={
            <ProtectedRoute
              anyOf={[
                'configure_interest_rate',
                'configure_penalty_rate',
                'configure_loan_duration',
                'configure_primary_provider',
                'configure_session_timeouts',
              ]}
            >
              <PlatformConfigPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
