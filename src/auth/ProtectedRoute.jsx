import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Guards a route behind authentication, and optionally behind a permission
 * check. If the admin lacks the required permission, they see an in-app
 * "access denied" state rather than being bounced — they ARE logged in,
 * they just can't see this particular page.
 */
export default function ProtectedRoute({
  children,
  permission,
  anyOf,
}) {
  const { isAuthenticated, session, hasPermission, hasAnyPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Backend blocks every endpoint except change-password while this flag is
  // set (adminTokenMiddleware's first-login guard) — mirror that here so
  // the admin lands on a dedicated screen instead of a normal page whose
  // API calls would all silently 403.
  if (session?.isFirstLogin) {
    return <Navigate to="/force-password-change" replace />;
  }

  let allowed = true;
  if (permission) allowed = hasPermission(permission);
  else if (anyOf) allowed = hasAnyPermission(anyOf);

  if (!allowed) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-ink-900">Access restricted</p>
        <p className="max-w-sm text-sm text-ink-500">
          Your role doesn't include permission to view this page. Contact an
          administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return children;
}
