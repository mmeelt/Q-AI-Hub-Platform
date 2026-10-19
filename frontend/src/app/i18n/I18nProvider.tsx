import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translations, type Language, type TranslationKey } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  /** t('nav.login') or t('phases.count', { count: 2 }) — falls back to English, then to the key itself. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'language';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch (_) { /* storage blocked: use the browser language */ }
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function getCurrentLanguage(): Language {
  return document.documentElement.lang === 'fr' ? 'fr' : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) { /* not persisted */ }
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    const text = translations[language][key] ?? translations.en[key] ?? key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }, [language]);

  const toggleLanguage = () => setLanguage(prev => (prev === 'en' ? 'fr' : 'en'));

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
