import { useState, useEffect, useCallback } from 'react';
import type { LanguageCode, TranslationMap } from '../types';
import translations from '../utils/translations';
import { LANGUAGES } from '../utils/constants';

const STORAGE_KEY = 'km_lang';

function getInitialLang(): LanguageCode {
  if (typeof window === 'undefined') return 'en';

  const stored = localStorage.getItem(STORAGE_KEY);
  const validCodes: LanguageCode[] = ['en', 'fr', 'es', 'it', 'ar', 'zh'];
  if (stored && validCodes.includes(stored as LanguageCode)) {
    return stored as LanguageCode;
  }

  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (validCodes.includes(browserLang as LanguageCode)) {
    return browserLang as LanguageCode;
  }

  return 'en';
}

export function useLanguage(): {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: TranslationMap;
  isRTL: boolean;
} {
  const [lang, setLangState] = useState<LanguageCode>(getInitialLang);

  const t = translations[lang];
  const languageConfig = LANGUAGES.find((l) => l.code === lang);
  const isRTL = languageConfig?.dir === 'rtl';

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, isRTL]);

  const setLang = useCallback((code: LanguageCode) => {
    setLangState(code);
  }, []);

  return { lang, setLang, t, isRTL };
}
