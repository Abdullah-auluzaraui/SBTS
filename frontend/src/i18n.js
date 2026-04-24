import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en'],
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
      // Cache-bust so newly added keys are picked up without a manual hard-refresh.
      // In dev we use a per-session timestamp; in prod this becomes a build-time constant.
      queryStringParams: { v: import.meta.env.DEV ? String(Date.now()) : (import.meta.env.VITE_APP_VERSION || '1') },
      requestOptions: { cache: 'no-store' },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
