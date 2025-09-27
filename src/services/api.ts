// src/services/api.ts
export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
export const API_PREFIX = `${API_BASE}/api`;

// Tipos para las respuestas de la API
export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// Función HTTP central con mejor manejo de errores
export async function http<T>(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = "GET", token, body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Token ${token}`,
    };
  }

  if (body && method !== "GET") {
    config.body = body;
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          // Manejo de errores de validación del backend Django
          const firstError = Object.values(errorData.errors)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          }
        }
      } catch {
        // Si no se puede parsear el JSON de error, usar el mensaje por defecto
      }

      throw new Error(errorMessage);
    }

    // Manejar respuestas vacías (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Error de conexión con el servidor");
  }
}

// API para autenticación
export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await http<{ token: string; user: any }>(`${API_BASE}/api-token-auth/`, {
      method: "POST",
      body: JSON.stringify({ username: email, password }),
    });
    return response;
  },

  async register(userData: {
    nombre: string;
    apellido: string;
    correo: string;
    contrasena: string;
    sexo: "M" | "F";
    telefono?: string;
  }): Promise<{ message: string }> {
    const response = await http<{ message: string }>(`${API_PREFIX}/register/`, {
      method: "POST",
      body: JSON.stringify(userData),
    });
    return response;
  },

  async getProfile(token: string): Promise<any> {
    return http<any>(`${API_PREFIX}/profile/`, { token });
  },
};

export default api;

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

export type Paged<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/* ========= Auth ========= */
export type LoginResponse = { token: string; user: UserDTO };
export type RegisterPayload = {
  nombre: string; apellido: string; correo: string; contrasena: string; sexo: "M" | "F"; telefono?: string;
};
export type RegisterResponse =
  | { ok: true; user?: UserDTO; id?: number; detail?: string }
  | { ok: false; detail?: string; fields?: Record<string, string | string[]> };
