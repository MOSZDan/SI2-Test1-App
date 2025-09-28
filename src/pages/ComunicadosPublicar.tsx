// src/pages/ComunicadosPublicar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  Destinatarios,
  Prioridad,
  ComunicadoPayload,
  Paged,
  http,
} from "../services/api";
import { Usuario } from "../services/users";

type UsuarioLite = { codigo: number; nombre: string; apellido: string };
type RolDTO = { id: number; descripcion: string; tipo?: string; estado?: string };

type OpcionDestino =
  | { kind: "todos"; label: string; value: "todos" }
  | { kind: "usuarios"; label: string; value: "usuarios" }
  | { kind: "tipo"; label: string; value: string }
  | { kind: "rol"; label: string; value: number };

const PRIORIDADES: Prioridad[] = ["normal", "importante", "urgente"];

// Trae todas las páginas de un listado paginado de DRF
async function fetchAllPaged<T>(firstPage: Paged<T> | T[], token: string): Promise<T[]> {
  if (Array.isArray(firstPage)) return firstPage;
  const acc: T[] = [...(firstPage.results || [])];
  let next = firstPage.next;
  while (next) {
    const page = await http<Paged<T>>(next, { token });
    acc.push(...(page.results || []));
    next = page.next;
  }
  return acc;
}

export default function ComunicadosPublicar() {
  const nav = useNavigate();
  const token = localStorage.getItem("token") || "";

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("normal");

  const [opciones, setOpciones] = useState<OpcionDestino[]>([
    { kind: "todos", label: "todos", value: "todos" },
    { kind: "usuarios", label: "usuarios (selección manual)", value: "usuarios" },
  ]);
  const [selected, setSelected] = useState<OpcionDestino>({ kind: "todos", label: "todos", value: "todos" });

  const [fechaPublicacion, setFechaPublicacion] = useState("");
  const [horaPublicacion, setHoraPublicacion] = useState("");

  // estado interno para selección (incluso cuando no se muestre la lista)
  const [usuarios, setUsuarios] = useState<UsuarioLite[]>([]);
  const [selUsuarioIds, setSelUsuarioIds] = useState<number[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // cargar opciones de rol y tipo
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingRoles(true);
        const roles = await api.listRolesActivos(token);
        const tipos = Array.from(new Set(roles.map((r: RolDTO) => (r.tipo || "").trim()).filter(Boolean)));

        const opts: OpcionDestino[] = [
          { kind: "todos", label: "todos", value: "todos" },
          ...tipos.map<OpcionDestino>((t) => ({ kind: "tipo", label: `tipo: ${t}`, value: t })),
          ...roles.map<OpcionDestino>((r) => ({ kind: "rol", label: `rol: ${r.descripcion}`, value: r.id })),
          { kind: "usuarios", label: "usuarios (selección manual)", value: "usuarios" },
        ];
        if (!cancel) setOpciones(opts);
      } finally {
        if (!cancel) setLoadingRoles(false);
      }
    })();
    return () => { cancel = true; };
  }, [token]);

  // necesitamos cargar usuarios para 3 casos:
  // - usuarios (manual): mostrar lista
  // - rol / tipo: NO mostrar lista, pero preseleccionar IDs internamente
  useEffect(() => {
    let cancel = false;

    const load = async () => {
      setErrorMsg(null);

      if (selected.kind === "todos") {
        setUsuarios([]);
        setSelUsuarioIds([]);
        return;
      }

      setLoadingUsuarios(true);
      try {
        if (selected.kind === "usuarios") {
          const first = await api.usuariosActivos(token);
          const all = await fetchAllPaged<Usuario>(first, token);
          if (cancel) return;
          const mapped: UsuarioLite[] = all.map((u) => ({
            codigo: u.codigo,
            nombre: u.nombre || "",
            apellido: u.apellido || "",
          }));
          setUsuarios(mapped);
          setSelUsuarioIds([]); // manual inicia vacío
          return;
        }

        if (selected.kind === "rol") {
          const first = await api.usuariosPorRol(token, selected.value);
          const all = await fetchAllPaged<Usuario>(first, token);
          if (cancel) return;
          const mapped: UsuarioLite[] = all.map((u) => ({
            codigo: u.codigo,
            nombre: u.nombre || "",
            apellido: u.apellido || "",
          }));
          setUsuarios(mapped);
          setSelUsuarioIds(mapped.map((u) => u.codigo)); // preselecciona TODOS internamente
          return;
        }

        if (selected.kind === "tipo") {
          const roles = await api.listRolesActivos(token);
          const ids = roles.filter((r) => (r.tipo || "") === selected.value).map((r) => r.id);
          const all = await api.usuariosPorRoles(token, ids);
          if (cancel) return;
          const mapped: UsuarioLite[] = all.map((u) => ({
            codigo: u.codigo,
            nombre: u.nombre || "",
            apellido: u.apellido || "",
          }));
          setUsuarios(mapped);
          setSelUsuarioIds(mapped.map((u) => u.codigo)); // preselección interna
          return;
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "No se pudieron cargar los destinatarios.";
        if (!cancel) setErrorMsg(errorMessage);
      } finally {
        if (!cancel) setLoadingUsuarios(false);
      }
    };

    load();
    return () => { cancel = true; };
  }, [selected, token]);

  // solo exigimos selección cuando es manual
  const requiereSeleccionManual = selected.kind === "usuarios";

  const canSubmit = useMemo(() => {
    if (!titulo.trim() || !contenido.trim()) return false;
    if (requiereSeleccionManual && selUsuarioIds.length === 0) return false;
    return true;
  }, [titulo, contenido, requiereSeleccionManual, selUsuarioIds]);

  const toggleUser = (id: number) => {
    setSelUsuarioIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!canSubmit) {
      setErrorMsg("Completa los campos obligatorios.");
      return;
    }

    // backend entiende 'usuarios' cuando se envía lista explícita
    const destinatarios: Destinatarios = selected.kind === "todos" ? "todos" : "usuarios";

    // Agregar campos obligatorios que faltaban
    const now = new Date();
    const payload: ComunicadoPayload = {
      tipo: prioridad, // El tipo se mapea de la prioridad
      fecha: fechaPublicacion || now.toISOString().split('T')[0], // Fecha actual si no se especifica
      hora: horaPublicacion || now.toTimeString().split(' ')[0], // Hora actual si no se especifica
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      destinatarios,
      prioridad,
    };

    if (destinatarios === "usuarios") {
      payload.usuario_ids = selUsuarioIds;
    }
    if (fechaPublicacion) payload.fecha_publicacion = fechaPublicacion;
    if (horaPublicacion) payload.hora_publicacion = `${horaPublicacion}:00`;

    try {
      setEnviando(true);
      const resp = await api.publicarComunicado(token, payload);
      nav("/casos?pkg=comunicacion", {
        replace: true,
        state: { flash: resp.mensaje || "Comunicado publicado correctamente." },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al publicar el comunicado.";
      setErrorMsg(errorMessage);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Publicar aviso / comunicado</h1>

      <form onSubmit={submit} className="space-y-4 bg-white rounded-2xl p-4 shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Título *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Corte programado de agua"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contenido *</label>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[120px]"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Detalle del aviso..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Prioridad</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as Prioridad)}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Destinatarios</label>
            <select
              className="w-full border rounded px-3 py-2"
              disabled={loadingRoles}
              value={`${selected.kind}:${String((selected as any).value ?? "")}`}
              onChange={(e) => {
                const [kind, raw] = e.target.value.split(":");
                if (kind === "todos") setSelected({ kind: "todos", label: "todos", value: "todos" });
                else if (kind === "usuarios") setSelected({ kind: "usuarios", label: "usuarios (selección manual)", value: "usuarios" });
                else if (kind === "tipo") setSelected({ kind: "tipo", label: `tipo: ${raw}`, value: raw });
                else if (kind === "rol") setSelected({ kind: "rol", label: `rol`, value: Number(raw) });
              }}
            >
              {opciones.map((o) => (
                <option key={`${o.kind}:${String(o.value ?? "")}`} value={`${o.kind}:${String(o.value ?? "")}`}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* En rol/tipo mostramos solo un resumen, no la lista */}
            {selected.kind !== "usuarios" && selected.kind !== "todos" && (
              <div className="text-xs text-gray-600 mt-1">
                {loadingUsuarios ? "Cargando destinatarios…" : `${selUsuarioIds.length} usuario(s) serán notificados.`}
              </div>
            )}
          </div>
        </div>

        {/* Programación opcional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de publicación (opcional)</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={fechaPublicacion}
              onChange={(e) => setFechaPublicacion(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hora de publicación (opcional)</label>
            <input
              type="time"
              className="w-full border rounded px-3 py-2"
              value={horaPublicacion}
              onChange={(e) => setHoraPublicacion(e.target.value)}
            />
          </div>
        </div>

        {/* Lista visible SOLO en selección manual */}
        {selected.kind === "usuarios" && (
          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Selecciona usuarios (activos)</p>
            {loadingUsuarios ? (
              <p className="text-sm text-gray-500">Cargando usuarios…</p>
            ) : usuarios.length === 0 ? (
              <p className="text-sm text-gray-500">No hay usuarios activos.</p>
            ) : (
              <div className="max-h-56 overflow-auto space-y-1">
                {usuarios.map((u) => {
                  const checked = selUsuarioIds.includes(u.codigo);
                  return (
                    <label key={u.codigo} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggleUser(u.codigo)} />
                      <span>{u.nombre} {u.apellido}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-gray-600 mt-2">{selUsuarioIds.length} seleccionado(s)</div>
          </div>
        )}

        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit || enviando}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          >
            {enviando ? "Publicando…" : "Publicar"}
          </button>

          <button
            type="button"
            onClick={() => nav("/casos?pkg=comunicacion")}
            className="px-4 py-2 rounded border"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
