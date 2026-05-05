import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importiamo i file JSON (Next.js permette di farlo direttamente)
import itRes from '../public/locales/it/common.json';
import enRes from '../public/locales/en/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: itRes },
      en: { translation: enRes }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React protegge già da XSS
    }
  });

export default i18n;