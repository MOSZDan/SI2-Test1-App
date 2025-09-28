// services/cobros.ts
import { http, API_PREFIX } from "./api";

export type Pago = {
  id: number;
  tipo: string;
  descripcion: string;
  monto: number;
  estado?: string;
};

export type PagoForm = {
  tipo: string;
  descripcion: string;
  monto: number;
  estado?: string;
};

export type Multa = {
  id: number;
  descripcion: string;
  monto: number;
  estado?: string;
};

export type MultaForm = {
  descripcion: string;
  monto: number;
  estado?: string;
};

// ========= API DE PAGOS =========

export const pagosAPI = {
  async list(token: string): Promise<Pago[]> {
    const data = await http<any>(`${API_PREFIX}/pagos/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number): Promise<Pago> {
    return http<Pago>(`${API_PREFIX}/pagos/${id}/`, { token });
  },

  async create(token: string, payload: PagoForm): Promise<Pago> {
    return http<Pago>(`${API_PREFIX}/pagos/`, { method: "POST", token, body: JSON.stringify(payload) });
  },

  async update(token: string, id: number, payload: Partial<PagoForm>): Promise<Pago> {
    return http<Pago>(`${API_PREFIX}/pagos/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/pagos/${id}/`, { method: "DELETE", token });
  }
};

// ========= API DE MULTAS =========

export const multasAPI = {
  async list(token: string): Promise<Multa[]> {
    const data = await http<any>(`${API_PREFIX}/multas/`, { token });
    return Array.isArray(data) ? data : data.results || [];
  },

  async get(token: string, id: number): Promise<Multa> {
    return http<Multa>(`${API_PREFIX}/multas/${id}/`, { token });
  },

  async create(token: string, payload: MultaForm): Promise<Multa> {
    return http<Multa>(`${API_PREFIX}/multas/`, { method: "POST", token, body: JSON.stringify(payload) });
  },

  async update(token: string, id: number, payload: Partial<MultaForm>): Promise<Multa> {
    return http<Multa>(`${API_PREFIX}/multas/${id}/`, { method: "PATCH", token, body: JSON.stringify(payload) });
  },

  async delete(token: string, id: number): Promise<void> {
    return http<void>(`${API_PREFIX}/multas/${id}/`, { method: "DELETE", token });
  }
};
