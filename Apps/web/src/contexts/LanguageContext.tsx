/**
 * LanguageContext — Global language state provider for reactive translations
 *
 * Provides a single source of truth for active language and translations
 * across the entire component tree. Components using useLanguage() will
 * automatically re-render when the language changes.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import allTranslations, { type LanguageCode, type TranslationMap } from '../locales';
import { LANGUAGES } from '../config/constants';

const LANGUAGE_STORAGE_KEY = 'kidsmind_lang';
const SUPPORTED_LANGUAGE_CODES: LanguageCode[] = ['en', 'fr', 'es', 'it', 'ar', 'zh'];

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  translations: TranslationMap;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const normalizeLanguageCode = (rawLanguageCode: string | null): LanguageCode | null => {
  if (!rawLanguageCode) return null;

  const normalizedCode = rawLanguageCode.trim().toLowerCase();

  if (normalizedCode.startsWith('ar')) return 'ar';
  if (normalizedCode.startsWith('zh') || normalizedCode.startsWith('ch')) return 'zh';
  if (normalizedCode.startsWith('fr')) return 'fr';
  if (normalizedCode.startsWith('es')) return 'es';
  if (normalizedCode.startsWith('it')) return 'it';
  if (normalizedCode.startsWith('en')) return 'en';

  return null;
};

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === 'undefined') return 'en';

  const storedLanguageCode = normalizeLanguageCode(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  if (storedLanguageCode && SUPPORTED_LANGUAGE_CODES.includes(storedLanguageCode)) {
    return storedLanguageCode;
  }

  const browserLanguageCandidates = navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const candidate of browserLanguageCandidates) {
    const normalizedCandidate = normalizeLanguageCode(candidate);
    if (normalizedCandidate && SUPPORTED_LANGUAGE_CODES.includes(normalizedCandidate)) {
      return normalizedCandidate;
    }
  }

  return 'en';
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageCode] = useState<LanguageCode>(getInitialLanguage);

  const translations = allTranslations[language];
  const languageConfig = LANGUAGES.find((languageOption) => languageOption.code === language);
  const isRTL = languageConfig?.dir === 'rtl';

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language, isRTL]);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageCode(code);
  }, []);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    translations,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = (): LanguageContextValue => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }

  return context;
};
