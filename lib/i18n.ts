import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importiamo i file JSON (Next.js permette di farlo direttamente)
import itRes from '../public/locales/it/common.json';
import enRes from '../public/locales/en/common.json';

i18n
  .use(initReactI18next)
  .init({
    // The server and the first browser render must use the same language.
    lng: 'en',
    supportedLngs: ['en', 'it'],
    resources: {
      it: { translation: itRes },
      en: { translation: enRes }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React protegge già da XSS
    }
  });

let browserLanguageRestored = false;

export function restoreBrowserLanguage() {
  if (typeof window === 'undefined' || browserLanguageRestored) return;
  browserLanguageRestored = true;

  // Detect only after hydration, so initialization never overwrites the
  // saved language with the server's English fallback.
  const detector = new LanguageDetector();
  detector.init(i18n.services);
  const detected = detector.detect();
  const candidates = Array.isArray(detected) ? detected : [detected];
  const language = candidates
    .map(value => value?.toLowerCase().split('-')[0])
    .find(value => value === 'en' || value === 'it') || 'en';

  i18n.on('languageChanged', value => detector.cacheUserLanguage(value));
  void i18n.changeLanguage(language);
}

export default i18n;
