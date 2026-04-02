import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route } from 'react-router-dom';
import PinGate from '../components/PinGate';
import { useAuthStatus } from '../hooks/useAuthStatus';
import '../styles/parent-portal.css';

const COPY = {
  loading: 'Loading parent portal...',
  subscriptionTitle: 'Subscription',
  subscriptionDescription: 'Subscription controls are coming soon.',
} as const;

const ParentLayout = lazy(() => import('../layouts/ParentLayout'));
const DashboardPage = lazy(() => import('../pages/parent/DashboardPage'));
const ChildProfilesPage = lazy(() => import('../pages/parent/ChildProfilesPage'));
const InsightsPage = lazy(() => import('../pages/parent/InsightsPage'));
const SettingsPage = lazy(() => import('../pages/parent/SettingsPage'));

const LoadingFallback = () => {
  return (
    <div className="pp-root" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }} aria-label={COPY.loading}>
      <div className="pp-skeleton" style={{ width: 220, height: 42 }} />
    </div>
  );
};

const ParentRoute = () => {
  const { isAuthenticated, isLoading } = useAuthStatus();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PinGate>
      <Outlet />
    </PinGate>
  );
};

const ParentSubscriptionPage = () => {
  return (
    <main className="pp-content">
      <article className="pp-card">
        <h1 className="pp-title">{COPY.subscriptionTitle}</h1>
        <p className="pp-empty">{COPY.subscriptionDescription}</p>
      </article>
    </main>
  );
};

export const ParentRoutes = (
  <Route path="/parent" element={<ParentRoute />}>
    <Route
      element={(
        <Suspense fallback={<LoadingFallback />}>
          <ParentLayout />
        </Suspense>
      )}
    >
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route
        path="dashboard"
        element={(
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        )}
      />
      <Route
        path="children"
        element={(
          <Suspense fallback={<LoadingFallback />}>
            <ChildProfilesPage />
          </Suspense>
        )}
      />
      <Route
        path="children/new"
        element={(
          <Suspense fallback={<LoadingFallback />}>
            <ChildProfilesPage />
          </Suspense>
        )}
      />
      <Route
        path="insights"
        element={(
          <Suspense fallback={<LoadingFallback />}>
            <InsightsPage />
          </Suspense>
        )}
      />
      <Route
        path="settings"
        element={(
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPage />
          </Suspense>
        )}
      />
      <Route path="subscription" element={<ParentSubscriptionPage />} />
    </Route>
  </Route>
);
