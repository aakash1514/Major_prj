import { normalizeApiUrl, toBaseUrl } from '../../shared/apiConfig';

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const API_BASE_URL = toBaseUrl(API_URL);
