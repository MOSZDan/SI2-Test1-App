// Configuración central de la API para el archivo principal
export const API_BASE = import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD
    ? "https://si2-test1-appbackend.onrender.com"
    : "http://127.0.0.1:8000");

// Re-exportar desde services/api.ts
export { api, http, API_PREFIX } from "./services/api";
