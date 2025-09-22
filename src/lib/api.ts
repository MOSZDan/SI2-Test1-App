import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE, // usa la .env del front
  headers: { "Content-Type": "application/json" },
});

// Guarda tokens en memoria (o localStorage si quieres persistir)
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pending: Array<(t: string) => void> = [];

function onRefreshed(newAccess: string) {
  pending.forEach((cb) => cb(newAccess));
  pending = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_BASE}/api/auth/refresh/`,
            { refresh: refreshToken }
          );
          accessToken = data.access;
          isRefreshing = false;
          onRefreshed(accessToken);
          return api(original);
        } catch (e) {
          isRefreshing = false;
          accessToken = null;
          refreshToken = null;
          throw e;
        }
      }

      return new Promise((resolve) => {
        pending.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }
    throw error;
  }
);

export default api;