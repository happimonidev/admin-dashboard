import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { NAV_ITEMS } from '../config/navigation';
import Logo from './ui/Logo';

const COLLAPSE_KEY = 'appcredit_sidebar_collapsed';

function useVisibleNavItems() {
  const { hasPermission, hasAnyPermission } = useAuth();
  return NAV_ITEMS.filter((item) => {
    if (item.permission) return hasPermission(item.permission);
    if (item.anyOf) return hasAnyPermission(item.anyOf);
    return true; // no gate — always visible (e.g. Dashboard)
  });
}

function NavList({ onNavigate, collapsed }) {
  const items = useVisibleNavItems();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            } ${
              isActive
                ? 'bg-dodger-50 text-dodger-700'
                : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
            }`
          }
        >
          <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // Storage unavailable (e.g. private browsing) — collapse state just
      // won't persist across reloads. Not worth surfacing to the user.
    }
  }, [collapsed]);

  return (
    <>
      {/* ── Desktop: persistent, collapsible sidebar ────────────────── */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-ink-100 bg-white transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-60'
        }`}
      >
        <div
          className={`flex items-center border-b border-ink-50 px-4 py-4 ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <Logo size="sm" withWordmark={!collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="rounded-control p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        <NavList collapsed={collapsed} />

        <div className="border-t border-ink-50 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : undefined}
            className={`flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-900 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile: drawer + backdrop, always full width, never collapsed ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/40"
            onClick={onCloseMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="rounded-control p-1.5 text-ink-400 hover:bg-ink-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={onCloseMobile} collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}
