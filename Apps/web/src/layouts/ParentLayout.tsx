import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import ChildSelector from '../components/parent/ChildSelector';
import { authStore } from '../store/auth.store';
import { useChildStore } from '../store/child.store';
import { useCurrentUser } from '../hooks/api/useCurrentUser';
import { useExportPdf } from '../hooks/api/useExportPdf';
import '../styles/parent-portal.css';

const COPY = {
  logo: 'KidsMind',
  subtitle: 'Parent Portal',
  pinActive: 'PIN session active',
  pinLocked: 'PIN required',
  menu: 'Open navigation menu',
  exportPdf: 'Export PDF',
  aiReport: 'AI report',
  profile: 'Profile',
  logout: 'Logout',
  overview: 'Overview',
  childProfiles: 'Child Profiles',
  insights: 'Insights',
  appSettings: 'App Settings',
  subscription: 'Subscription',
  main: 'Main',
  account: 'Account',
  loading: 'Loading account...',
  exportDone: 'Download ready',
  exportError: 'Unable to export right now.',
} as const;

interface NavItem {
  label: string;
  to: string;
}

const MAIN_NAV: NavItem[] = [
  { label: COPY.overview, to: '/parent/dashboard' },
  { label: COPY.childProfiles, to: '/parent/children' },
  { label: COPY.insights, to: '/parent/insights' },
];

const ACCOUNT_NAV: NavItem[] = [
  { label: COPY.appSettings, to: '/parent/settings' },
  { label: COPY.subscription, to: '/parent/subscription' },
];

const PAGE_TITLES: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/parent\/dashboard/, title: COPY.overview },
  { pattern: /^\/parent\/children/, title: COPY.childProfiles },
  { pattern: /^\/parent\/insights/, title: COPY.insights },
  { pattern: /^\/parent\/settings/, title: COPY.appSettings },
  { pattern: /^\/parent\/subscription/, title: COPY.subscription },
];

const hasPinCookie = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie.split('; ').some((entry) => entry.startsWith('pin_session=valid'));
};

const ParentLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeChild } = useChildStore();
  const userQuery = useCurrentUser();
  const exportPdf = useExportPdf(activeChild?.child_id ?? null);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  const pageTitle = useMemo(() => {
    const match = PAGE_TITLES.find((item) => item.pattern.test(location.pathname));
    return match?.title ?? COPY.overview;
  }, [location.pathname]);

  const pinStatusClassName = hasPinCookie() ? 'pp-pin-active' : 'pp-pin-locked';
  const pinStatusLabel = hasPinCookie() ? COPY.pinActive : COPY.pinLocked;

  const userInitial = useMemo(() => {
    const username = userQuery.data?.username ?? userQuery.data?.email ?? 'P';
    return username.slice(0, 1).toUpperCase();
  }, [userQuery.data]);

  const closeSidebarOnMobile = (): void => {
    setIsSidebarOpen(false);
  };

  const renderNavSection = (title: string, items: NavItem[]): React.ReactNode => {
    return (
      <section className="pp-nav-group" aria-label={title}>
        <p className="pp-nav-title">{title}</p>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `pp-nav-link pp-touch pp-focusable ${isActive ? 'pp-nav-link-active' : ''}`}
            aria-label={item.label}
            onClick={closeSidebarOnMobile}
          >
            {item.label}
          </NavLink>
        ))}
      </section>
    );
  };

  return (
    <div className="pp-root pp-layout">
      <aside className={`pp-sidebar ${isSidebarOpen ? 'pp-sidebar-open' : ''}`}>
        <div className="pp-logo">
          <h1 className="pp-title">{COPY.logo}</h1>
          <p>{COPY.subtitle}</p>
        </div>

        <div className={`pp-pin-banner ${pinStatusClassName}`} role="status" aria-live="polite">
          {pinStatusLabel}
        </div>

        {renderNavSection(COPY.main, MAIN_NAV)}
        {renderNavSection(COPY.account, ACCOUNT_NAV)}

        <div style={{ marginTop: 'auto' }}>
          <ChildSelector />
        </div>
      </aside>

      <div className="pp-main">
        <header className="pp-topbar">
          <div className="pp-topbar-left">
            <button
              type="button"
              className="pp-button pp-sidebar-drawer-toggle pp-touch pp-focusable"
              aria-label={COPY.menu}
              onClick={() => {
                setIsSidebarOpen((current) => !current);
              }}
            >
              ☰
            </button>
            <h2 className="pp-title">{pageTitle}</h2>
          </div>

          <div className="pp-topbar-actions">
            <button
              type="button"
              className="pp-button pp-touch pp-focusable"
              aria-label={COPY.exportPdf}
              disabled={exportPdf.isPending}
              onClick={() => {
                exportPdf
                  .mutateAsync(undefined)
                  .then(() => {
                    setActionMessage(COPY.exportDone);
                  })
                  .catch(() => {
                    setActionMessage(exportPdf.error?.message ?? COPY.exportError);
                  });
              }}
            >
              {exportPdf.isPending ? `${COPY.exportPdf}...` : COPY.exportPdf}
            </button>

            <button
              type="button"
              className="pp-button pp-touch pp-focusable"
              aria-label={COPY.aiReport}
              onClick={() => {
                navigate('/parent/insights?tab=progress');
              }}
            >
              {COPY.aiReport}
            </button>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="pp-avatar-chip pp-touch pp-focusable"
                aria-label={COPY.profile}
                onClick={() => {
                  setIsUserMenuOpen((current) => !current);
                }}
              >
                {userQuery.isLoading ? '…' : userInitial}
              </button>

              {isUserMenuOpen && (
                <div className="pp-card" style={{ position: 'absolute', right: 0, top: '110%', minWidth: 150, zIndex: 20 }}>
                  {userQuery.isLoading ? (
                    <p>{COPY.loading}</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="pp-button pp-touch pp-focusable"
                        aria-label={COPY.profile}
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate('/parent/settings?tab=profile');
                        }}
                      >
                        {COPY.profile}
                      </button>
                      <button
                        type="button"
                        className="pp-button pp-touch pp-focusable"
                        aria-label={COPY.logout}
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          authStore.logout({ redirectToLogin: true });
                        }}
                      >
                        {COPY.logout}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <Outlet />
      </div>

      {actionMessage && (
        <div className="pp-toast" role="status" aria-live="polite">
          <div className="pp-toast-card">{actionMessage}</div>
        </div>
      )}
    </div>
  );
};

export default ParentLayout;
