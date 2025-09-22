// services/cobros.ts
import { http, API_PREFIX } from "./api";

export type Pago = {
  id: number;
  tipo: string;
  descripcion: string;
  monto: number;
  estado?: string; // opcional
};

export type Multa = {
  id: number;
  descripcion: string;
  monto: number;
  estado?: string; // opcional
};

export type PagoForm = {
  tipo: string;
  descripcion: string;
  monto: number;
  estado?: string;
};

export type MultaForm = {
  descripcion: string;
  monto: number;
  estado?: string;
};

export const pagosAPI = {
  list(token: string, search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return http<{ results?: Pago[] } | Pago[]>(`${API_PREFIX}/pagos/${q}`, { token });
  },
  create(token: string, data: PagoForm) {
    return http<Pago>(`${API_PREFIX}/pagos/`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  update(token: string, id: number, data: Partial<PagoForm>) {
    return http<Pago>(`${API_PREFIX}/pagos/${id}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    });
  },
  remove(token: string, id: number) {
    return http<void>(`${API_PREFIX}/pagos/${id}/`, { method: "DELETE", token });
  },
};

export const multasAPI = {
  list(token: string, search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return http<{ results?: Multa[] } | Multa[]>(`${API_PREFIX}/multas/${q}`, { token });
  },
  create(token: string, data: MultaForm) {
    return http<Multa>(`${API_PREFIX}/multas/`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  update(token: string, id: number, data: Partial<MultaForm>) {
    return http<Multa>(`${API_PREFIX}/multas/${id}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    });
  },
  remove(token: string, id: number) {
    return http<void>(`${API_PREFIX}/multas/${id}/`, { method: "DELETE", token });
  },
};
