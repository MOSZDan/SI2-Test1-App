// services/propiedades.ts
import { http, API_PREFIX } from "./api";

export type Propiedad = {
  codigo: number;
  tamano_m2: number;
  nro_casa: number;
  piso: number;
  descripcion: string;
  propietario_actual?: {
    codigo: number;
    nombre: string;
    apellido: string;
    correo: string;
    tipo_rol: string;
    fecha_ini: string;
    fecha_fin?: string;
  };
};

export type PropiedadForm = {
  nro_casa: number;
  piso: number;
  tamano_m2: number;
  descripcion: string;
};

export type PertenecForm = {
  codigo_usuario: number;
  codigo_propiedad: number;
  fecha_ini: string;
  fecha_fin?: string;
};

export type ListPropiedadesResult = {
  results: Propiedad[];
  count: number;
  next?: string;
  previous?: string;
};

export const propiedadesAPI = {
  // Listar propiedades con opción de incluir residentes
  list(token: string, params?: {
    include_residents?: boolean;
    search?: string;
    piso?: number;
    page?: number
  }) {
    const query = new URLSearchParams();
    if (params?.include_residents) query.set("include_residents", "true");
    if (params?.search) query.set("search", params.search);
    if (params?.piso !== undefined) query.set("piso", String(params.piso));
    if (params?.page) query.set("page", String(params.page));

    const url = `${API_PREFIX}/propiedades/${query.toString() ? `?${query}` : ""}`;
    return http<ListPropiedadesResult>(url, { token });
  },

  // Crear nueva propiedad
  create(token: string, data: PropiedadForm) {
    return http<Propiedad>(`${API_PREFIX}/propiedades/`, {
      method: "POST",
      token,
      body: JSON.stringify(data)
    });
  },

  // Actualizar propiedad
  update(token: string, codigo: number, data: Partial<PropiedadForm>) {
    return http<Propiedad>(`${API_PREFIX}/propiedades/${codigo}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify(data)
    });
  },

  // Eliminar propiedad
  delete(token: string, codigo: number) {
    return http<void>(`${API_PREFIX}/propiedades/${codigo}/`, {
      method: "DELETE",
      token
    });
  },

  // Obtener propiedad individual
  get(token: string, codigo: number) {
    return http<Propiedad>(`${API_PREFIX}/propiedades/${codigo}/`, { token });
  }
};

export const perteneceAPI = {
  // Crear vinculación residente-propiedad
  create(token: string, data: PertenecForm) {
    return http<never>(`${API_PREFIX}/pertenece/`, {
      method: "POST",
      token,
      body: JSON.stringify(data)
    });
  },

  // Listar vinculaciones
  list(token: string, params?: {
    codigo_propiedad?: number;
    codigo_usuario?: number;
    activas?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.codigo_propiedad) query.set("codigo_propiedad", String(params.codigo_propiedad));
    if (params?.codigo_usuario) query.set("codigo_usuario", String(params.codigo_usuario));
    if (params?.activas) query.set("activas", "true");

    const url = `${API_PREFIX}/pertenece/${query.toString() ? `?${query}` : ""}`;
    return http<any>(url, { token });
  },

  // Finalizar vinculación (actualizar fecha_fin)
  end(token: string, id: number, fecha_fin: string) {
    return http<any>(`${API_PREFIX}/pertenece/${id}/`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ fecha_fin })
    });
  }
};