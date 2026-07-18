import { useAuth } from '../auth/AuthContext';

/**
 * Conditionally renders children based on the current admin's permissions.
 *
 * Usage:
 *   <PermissionGate permission="export_data">...</PermissionGate>
 *   <PermissionGate anyOf={['view_all_leads', 'view_assigned_leads']}>...</PermissionGate>
 *   <PermissionGate allOf={['view_kyc_full', 'view_customer_profile']}>...</PermissionGate>
 *
 * This mirrors permissionMiddleware's 'all' (default) vs 'any' modes on the
 * backend, so the same permission combinations used to gate a route there
 * can be used to gate the corresponding UI here.
 */
export default function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let allowed = true;
  if (permission) allowed = hasPermission(permission);
  else if (anyOf) allowed = hasAnyPermission(anyOf);
  else if (allOf) allowed = hasAllPermissions(allOf);

  return allowed ? children : fallback;
}
