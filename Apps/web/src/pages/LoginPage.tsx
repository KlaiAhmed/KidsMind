import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import AuthLayout from '../components/shared/AuthLayout/AuthLayout';
import LoginForm from '../components/LoginForm/LoginForm';

/**
 * LoginPage — Authentication page for returning parent users.
 *
 * Uses AuthLayout for the split-screen wrapper.
 * Manages login form state via the LoginForm child component.
 * Navigates to dashboard on successful login.
 */
export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  function handleLoginSuccess() {
    window.location.href = '/dashboard';
  }

  return (
    <div
      data-theme={theme}
      dir={t.dir}
      lang={lang}
    >
      <AuthLayout
        illustrationVariant="login"
        t={t}
        lang={lang}
        onSetLang={setLang}
        theme={theme}
        onToggleTheme={toggleTheme}
      >
        <LoginForm t={t} onSuccess={handleLoginSuccess} />
      </AuthLayout>
    </div>
  );
}
