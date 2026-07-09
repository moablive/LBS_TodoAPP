// A configuração do client (baseUrl, token, refresh) vive em main.ts via
// setupApi — única fonte de verdade. Este módulo só re-exporta.
export { api, ApiError } from '@todoapp/api-client';
