// src/services/api.ts
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
// ❗ quita barras del final: "http://127.0.0.1:8000/"
export const API_BASE = RAW_BASE.replace(/\/+$/, "");
// Prefijo común para todos los endpoints DRF
export const API_PREFIX = `${API_BASE}/api`;

const AUTH_SCHEME = "Token"; // DRF TokenAuthentication
type HttpOpts = RequestInit & { token?: string };

export async function http<T>(url: string, opts: HttpOpts = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (opts.token) headers.Authorization = `${AUTH_SCHEME} ${opts.token}`;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { ...opts, headers });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.detail ||
          (data && typeof data === "object" ? JSON.stringify(data) : "Error");
    throw new Error(msg);
  }
  return data as T;
}

/* ========= Tipos comunes ========= */
export type UserDTO = {
  codigo: number;
  nombre: string;
  apellido: string;
  correo: string;
  sexo: string | null;
  telefono: string | null;
  estado: any;
  idrol: number | null;
  rol?: { id: number; descripcion: string; tipo?: string; estado?: any } | null;
};

/* ========= Auth ========= */
export type LoginResponse = { token: string; user: UserDTO };
export type RegisterPayload = {
  nombre: string; apellido: string; correo: string; contrasena: string; sexo: "M" | "F"; telefono?: string;
};
export type RegisterResponse =
  | { ok: true; user?: UserDTO; id?: number; detail?: string }
  | { ok: false; detail?: string; fields?: Record<string, string | string[]> };

export const api = {
  login(email: string, password: string) {
    return http<LoginResponse>(`${API_PREFIX}/auth/login/`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register(payload: RegisterPayload) {
    return http<RegisterResponse>(`${API_PREFIX}/auth/register/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  logout(token: string) {
    return http<{ detail?: string }>(`${API_PREFIX}/auth/logout/`, {
      method: "POST",
      token,
    });
  },

  // ejemplo
  usuarios(token: string, params?: { search?: string; page?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    const url = `${API_PREFIX}/usuarios/${q.toString() ? `?${q}` : ""}`;
    return http<{ results: UserDTO[]; count: number } | UserDTO[]>(url, { token });
  },
};
