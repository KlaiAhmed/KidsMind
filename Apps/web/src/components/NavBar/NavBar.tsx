import { useState, useCallback, useEffect, useRef } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import type { ThemeMode, LanguageCode, TranslationMap } from '../../types';
import { LANGUAGES } from '../../utils/constants';
import { useScrollPosition } from '../../hooks/useScrollPosition';
import styles from './NavBar.module.css';

interface NavBarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  lang: LanguageCode;
  onSetLang: (code: LanguageCode) => void;
  t: TranslationMap;
}

function RocketLogo() {
  return (
    <svg
      className={styles.logoIcon}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M18 3C18 3 12 10 12 20C12 24 14 28 18 30C22 28 24 24 24 20C24 10 18 3 18 3Z" fill="var(--accent-main)" />
      <path d="M18 3C18 3 15 10 15 20C15 24 16 28 18 30C18 30 18 24 18 20C18 10 18 3 18 3Z" fill="var(--accent-main-hover)" opacity="0.6" />
      <path d="M12 20C12 20 8 18.5 7 22C8 23 10 23 12 22V20Z" fill="var(--accent-learn)" />
      <path d="M24 20C24 20 28 18.5 29 22C28 23 26 23 24 22V20Z" fill="var(--accent-learn)" />
      <circle cx="18" cy="16" r="2.5" fill="var(--bg-surface)" />
      <path d="M15 28L14 34L18 31L22 34L21 28" fill="var(--accent-fun)" />
    </svg>
  );
}

export default function NavBar({
  theme,
  onToggleTheme,
  lang,
  onSetLang,
  t,
}: NavBarProps) {
  const { isScrolled } = useScrollPosition();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === lang);

  const handleLangSelect = useCallback(
    (code: LanguageCode) => {
      onSetLang(code);
      setLangOpen(false);
      setMobileOpen(false);
    },
    [onSetLang]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLangOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      <a href="#main-content" className={styles.skipNav}>
        Skip to content
      </a>
      <nav
        className={`${styles.nav} ${isScrolled ? styles.navScrolled : ''}`}
        aria-label="Main navigation"
      >
        <div className={styles.navInner}>
          <a href="/" className={styles.logo}>
            <RocketLogo />
            <span className={styles.logoText}>KidsMind</span>
          </a>

          <div className={styles.desktopNav}>
            <div className={styles.langSelector} ref={langRef}>
              <button
                className={styles.langButton}
                onClick={() => setLangOpen(!langOpen)}
                aria-expanded={langOpen}
                aria-haspopup="listbox"
              >
                <span aria-hidden="true">{currentLang?.flag}</span>
                <span>{currentLang?.code.toUpperCase()}</span>
              </button>
              {langOpen && (
                <div className={styles.langDropdown} role="listbox" aria-label="Select language">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      className={`${styles.langOption} ${l.code === lang ? styles.langOptionActive : ''}`}
                      onClick={() => handleLangSelect(l.code)}
                      role="option"
                      aria-selected={l.code === lang}
                    >
                      <span aria-hidden="true">{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className={styles.themeToggle}
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={20} strokeWidth={2} /> : <Sun size={20} strokeWidth={2} />}
            </button>

            <button className={styles.loginButton}>{t.nav_login}</button>
            <button className={styles.startButton}>{t.nav_start}</button>
          </div>

          <button
            className={styles.mobileMenuButton}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
            <span className={styles.mobileMenuLabel}>Menu</span>
          </button>
        </div>
      </nav>

      <div
        className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : styles.mobileDrawerClosed}`}
        aria-hidden={!mobileOpen}
      >
        <div className={styles.mobileLangList}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`${styles.langOption} ${l.code === lang ? styles.langOptionActive : ''}`}
              onClick={() => handleLangSelect(l.code)}
            >
              <span aria-hidden="true">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
        <button
          className={styles.themeToggle}
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={20} strokeWidth={2} /> : <Sun size={20} strokeWidth={2} />}
        </button>
        <button className={styles.loginButton}>{t.nav_login}</button>
        <button className={styles.startButton}>{t.nav_start}</button>
      </div>
    </>
  );
}
