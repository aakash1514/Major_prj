// Environment-agnostic API config shared by web and mobile.
// Each app reads its own env var and falls back to DEFAULT_API_URL:
//   web:    frontend/src/config.ts  (VITE_API_URL)
//   mobile: mobile/utils/api.ts     (EXPO_PUBLIC_API_URL)
// Keep this file free of import.meta / bundler-specific code so Metro can load it.
export const DEFAULT_API_URL = 'http://localhost:5000/api';

export const normalizeApiUrl = (url: string | undefined): string =>
  (url && url.trim() ? url.trim() : DEFAULT_API_URL).replace(/\/+$/, '');

export const toBaseUrl = (apiUrl: string): string => apiUrl.replace(/\/api\/?$/, '');
