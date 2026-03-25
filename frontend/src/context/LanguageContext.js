import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  translateDomToLanguage,
  startTranslationObserver,
  stopTranslationObserver,
} from '../utils/domTranslator';
import translations from '../i18n/translations';

const STORAGE_KEY = 'rentflow_lang';
const LanguageContext = createContext(null);

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'sw' ? 'sw' : 'en';
      translateDomToLanguage(document.body, language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    startTranslationObserver(language);
    return () => stopTranslationObserver();
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isSwahili: language === 'sw',
      toggleLanguage: () => setLanguage((prev) => (prev === 'sw' ? 'en' : 'sw')),
      t: (key, fallback = key, vars = {}) => {
        const langPack = translations[language] || translations.en;
        const enPack = translations.en || {};
        let template = getByPath(langPack, key);
        if (template == null) template = getByPath(enPack, key);
        if (template == null) template = fallback;
        return String(template).replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? vars[name] : ''));
      },
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
