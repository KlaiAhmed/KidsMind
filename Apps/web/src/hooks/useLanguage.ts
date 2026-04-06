/**
 * Hook for accessing the app's active language, translations, and text direction.
 *
 * Now uses global LanguageContext for reactive updates across the entire app.
 */

import { useLanguageContext } from '../contexts/LanguageContext';

const useLanguage = () => {
  return useLanguageContext();
};

export { useLanguage };
