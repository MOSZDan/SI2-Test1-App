// src/services/data/paquetes.ts
export type Caso = { name: string; to?: string };
export type Paquete = {
  key: string;
  title: string;
  color: string;
  casos: Caso[];
};

export const PAQUETES: Paquete[] = [
  {
    key: "usuarios",
    title: "Usuarios",
    color: "from-fuchsia-500 to-rose-500",
    casos: [
      { name: "Gestionar usuarios", to: "/usuarios" },
      { name: "Roles y permisos", to: "/roles" },
    ],
  },
  {
    key: "finanzas",
    title: "Finanzas",
    color: "from-sky-500 to-cyan-500",
    casos: [
      { name: "Unidades/Propiedades", to: "/propiedades" },
      { name: "Cuotas y multas", to: "/cobros/cuotas-multas/" },
      { name: "Estado de cuenta", to: "/finanzas/estado" },
    ],
  },
  {
    key: "seguridad",
    title: "Seguridad",
    color: "from-emerald-500 to-teal-500",
    casos: [
      { name: "Detecciones IA", to: "/ai-detection" },
      // próximos: visitante, lista, rostro, LPR, reportes
    ],
  },
  {
    key: "comunicacion",
    title: "Comunicación y Reservas",
    color: "from-indigo-500 to-blue-500",
    casos: [
      { name: "Publicar avisos", to: "/comunicados/publicar" },
      { name: "Consultar avisos", to: "/comunicados" },
      { name: "Configurar áreas comunes", to: "/areas-comunes/config" },
      { name: "Gestionar reservas", to: "/reservas" },
      { name: "Pagar reserva" },
      { name: "Notificaciones" },
      { name: "Reporte uso de áreas" },
    ],
  },
  {
    key: "mantenimiento",
    title: "Mantenimiento y Auditoría",
    color: "from-orange-500 to-amber-500",
    casos: [
      { name: "Reportar incidencia" },
      { name: "Tareas de mantenimiento" },
      { name: "Reportes de mantenimiento" },
      { name: "Bitácora" },
    ],
  },
];
