import {
  LayoutDashboard,
  Users,
  UserX,
  Landmark,
  UserPlus,
  ClipboardList,
  MessageCircleWarning,
  Target,
  Star,
  BarChart3,
  UserCog,
  ShieldCheck,
  History,
  Settings,
  UserCircle,
} from 'lucide-react';

// Each item's permission gate mirrors the exact permissionMiddleware check(s)
// on the corresponding backend route(s) — so a nav item only appears when
// the admin can actually do something on that page, and the sidebar never
// promises access the API will then 403.
export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    // No permission required — every authenticated admin has a home view.
  },
  {
    label: 'Customers',
    to: '/customers',
    icon: Users,
    permission: 'view_customer_profile',
  },
  {
    label: 'Incomplete Registrations',
    to: '/incomplete-registrations',
    icon: UserX,
    anyOf: ['view_all_incomplete_registrations', 'view_assigned_incomplete_registrations'],
  },
  {
    label: 'Loans',
    to: '/loans',
    icon: Landmark,
    anyOf: [
      'view_loan_details',
      'view_loan_queue',
      'view_overdue_loans',
      'view_repayment_logs',
    ],
  },
  {
    label: 'Leads',
    to: '/leads',
    icon: UserPlus,
    anyOf: ['view_all_leads', 'view_assigned_leads'],
  },
  {
    label: 'Collection Cases',
    to: '/collection',
    icon: ClipboardList,
    anyOf: ['view_all_collection_cases', 'view_assigned_collection_cases'],
  },
  {
    label: 'Complaints',
    to: '/complaints',
    icon: MessageCircleWarning,
    anyOf: ['view_all_complaints', 'view_assigned_complaints'],
  },
  {
    label: 'KPI',
    to: '/kpi',
    icon: Target,
    anyOf: [
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
    ],
  },
  {
    label: 'Scoring',
    to: '/scoring',
    icon: Star,
    anyOf: [
      'score_telemarketer_team',
      'score_collection_officer_team',
      'score_customer_care_team',
      'score_any_team',
      'view_qualitative_scores',
    ],
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: BarChart3,
    anyOf: [
      'view_telemarketer_team_reports',
      'view_collection_officer_team_reports',
      'view_customer_care_team_reports',
      'view_all_staff_reports',
      'view_npl_default_reports',
      'view_revenue',
      'view_company_wide_kpis',
      'view_payout_logs',
    ],
  },
  {
    label: 'Admin Users',
    to: '/admin-users',
    icon: UserCog,
    permission: 'view_admin_users',
  },
  {
    label: 'Roles & Permissions',
    to: '/roles',
    icon: ShieldCheck,
    permission: 'view_roles',
  },
  {
    label: 'Audit Logs',
    to: '/audit',
    icon: History,
    permission: 'view_audit_logs',
  },
  {
    label: 'Platform Config',
    to: '/config',
    icon: Settings,
    // Mirrors misc.js configRouter's GET gate exactly (5 specific
    // configure_* permissions, 'any' mode) — not the full configure_*
    // list, since view access is only gated by those 5 on the backend.
    anyOf: [
      'configure_interest_rate',
      'configure_penalty_rate',
      'configure_loan_duration',
      'configure_primary_provider',
      'configure_session_timeouts',
    ],
  },
  {
    label: 'My Profile',
    to: '/profile',
    icon: UserCircle,
    permission: 'view_own_profile',
  },
];
