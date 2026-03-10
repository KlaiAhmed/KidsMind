import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const GetStartedPage = React.lazy(() => import('./pages/GetStartedPage'));

/**
 * App — Root component with client-side routing.
 *
 * Lazy-loads LoginPage and GetStartedPage for code splitting.
 * HomePage is loaded eagerly as the primary landing page.
 */
function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
            aria-label="Loading page"
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid var(--border-subtle)',
                borderTopColor: 'var(--accent-main)',
                borderRadius: '50%',
                animation: 'spinRing 0.8s linear infinite',
              }}
            />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/get-started" element={<GetStartedPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
