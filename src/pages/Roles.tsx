// src/pages/Roles.tsx
import React, {useEffect, useMemo, useState} from "react";
import Navbar from "../components/Navbar";
import {useAuth} from "../context/AuthContext";
import {
    listUsers,
    patchUser,
    type Usuario,
    type UsersListResult,
} from "../services/users";
import {listRoles, type Rol} from "../services/roles";

/* ====== UI helpers ====== */
function TextInput(
    props: React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
    >
) {
    return (
        <input
            {...props}
            className={
                "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none " +
                "focus:ring-2 focus:ring-cyan-400 " +
                (props.className || "")
            }
        />
    );
}

function Select(
    props: React.DetailedHTMLProps<
        React.SelectHTMLAttributes<HTMLSelectElement>,
        HTMLSelectElement
    >
) {
    return (
        <select
            {...props}
            className={
                "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none " +
                "focus:ring-2 focus:ring-cyan-400 " +
                (props.className || "")
            }
        />
    );
}

/* ====== Página ====== */
type EditState = {
    open: boolean;
    user?: Usuario;
    saving: boolean;
    error?: string;
};

const ESTADOS = ["activo", "inactivo", "pendiente"];

export default function RolesPage() {
    const {token} = useAuth(); // debe proveer el token
    const [items, setItems] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | undefined>();

    // filtros
    const [search, setSearch] = useState("");
    const [estado] = useState("");
    const [idrol] = useState<string>("");
    const [ordering] = useState<string>("codigo"); // default
    const [page, setPage] = useState<number>(1);

    // roles
    const [roles, setRoles] = useState<Rol[]>([]); // 👈 siempre array
    const [rolesErr, setRolesErr] = useState<string | undefined>();

    // paginación (si backend devuelve paginado)
    const [next, setNext] = useState<string | null>(null);
    const [previous, setPrevious] = useState<string | null>(null);
    const [count, setCount] = useState<number | undefined>(undefined);

    // edición
    const [edit, setEdit] = useState<EditState>({
        open: false,
        user: undefined,
        saving: false,
        error: undefined,
    });

    /* ---- cargar roles ---- */
    useEffect(() => {
        if (!token) return;
        setRolesErr(undefined);
        listRoles(token)
            .then((data) => setRoles(Array.isArray(data) ? data : []))
            .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : String(e);
                setRolesErr(msg);
                setRoles([]); // 👈 evita map sobre no-array
            });
    }, [token]);

    /* ---- cargar usuarios ---- */
    async function fetchData() {
        if (!token) return;
        setLoading(true);
        setErr(undefined);
        try {
            const result: UsersListResult = await listUsers({
                token,
                search,
                estado,
                idrol: idrol || undefined,
                ordering,
                page,
            });
            setItems(result.items);
            setNext(result.next);
            setPrevious(result.previous);
            setCount(result.count);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setErr(msg || "Error al cargar usuarios");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }

    // cada vez que cambian filtros, reinicia a página 1
    useEffect(() => {
        setPage(1);
    }, [search, estado, idrol, ordering]);

    useEffect(() => {
        void fetchData(); // 👈 evita warning de promesa ignorada
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, search, estado, idrol, ordering, page]);

    const rolMap = useMemo(() => {
        const map = new Map<number, Rol>();
        (roles ?? []).forEach((r) => map.set(r.id, r));
        return map;
    }, [roles]);

    /* ---- handlers edición ---- */
    function openEdit(u: Usuario) {
        setEdit({open: true, user: {...u}, saving: false, error: undefined});
    }

    function closeEdit() {
        setEdit((s) => ({...s, open: false}));
    }

    async function saveEdit() {
        if (!token || !edit.user) return;
        try {
            setEdit((s) => ({...s, saving: true, error: undefined}));
            const payload: Partial<Usuario> = {
                estado: edit.user.estado,
                idrol: edit.user.idrol,
                telefono: edit.user.telefono ?? undefined,
            };
            const updated = await patchUser({
                token,
                codigo: edit.user.codigo,
                payload,
            });
            // refleja cambios en la tabla
            setItems((xs) =>
                xs.map((x) => (x.codigo === updated.codigo ? updated : x))
            );
            closeEdit();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setEdit((s) => ({...s, error: msg, saving: false}));
        }
    }

    /* ---- UI ---- */
    return (
        <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
            <Navbar/>

            <main className="mx-auto max-w-7xl px-4 py-6">
                <h1 className="text-xl sm:text-2xl font-semibold mb-4">Gestionar Roles</h1>

                {/* Filtros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                    <TextInput
                        placeholder="Buscar (nombre, apellido)…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Mensajes */}
                {rolesErr && (
                    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800">
                        Error cargando roles: {rolesErr}
                    </div>
                )}
                {err && (
                    <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-rose-800">
                        {err}
                    </div>
                )}

                {/* Tabla */}
                <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                        <tr>
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Estado</th>
                            <th className="px-3 py-2 text-left">Rol</th>
                            <th className="px-3 py-2"></th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td className="px-3 py-4" colSpan={5}>Cargando…</td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td className="px-3 py-4" colSpan={5}>Sin resultados</td>
                            </tr>
                        ) : (
                            items.map((u) => (
                                <tr key={u.codigo} className="border-t border-slate-100">
                                    <td className="px-3 py-2">{u.codigo}</td>
                                    <td className="px-3 py-2">{(u.nombre || "") + " " + (u.apellido || "")}</td>
                                    <td className="px-3 py-2">{u.estado ?? "-"}</td>
                                    <td className="px-3 py-2">{u.idrol ? rolMap.get(u.idrol)?.descripcion ?? u.idrol : "-"}</td>
                                    <td className="px-3 py-2 text-right">
                                        <button
                                            onClick={() => openEdit(u)}
                                            className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50"
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>

                    </table>
                </div>
                {/* Paginación */}
                <div className="mt-3 flex items-center gap-2">
                    <button
                        disabled={!previous}
                        onClick={() => previous && setPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
                    >
                        ◀ Anterior
                    </button>
                    <button
                        disabled={!next}
                        onClick={() => next && setPage((p) => p + 1)}
                        className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
                    >
                        Siguiente ▶
                    </button>
                    {typeof count === "number" && (
                        <span className="text-sm text-slate-500">Total: {count}</span>
                    )}
                </div>
            </main>

            {/* Modal de edición (todos los campos) */}
            {edit.open && edit.user && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg">
                        <div className="border-b px-5 py-3">
                            <h3 className="font-semibold">Editar usuario #{edit.user.codigo}</h3>
                        </div>

                        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {edit.error && (
                                <div
                                    className="sm:col-span-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-rose-800">
                                    {edit.error}
                                </div>
                            )}

                            {/* Nombre */}
                            <div>
                                <label className="block text-sm text-slate-600">Nombre</label>
                                <TextInput
                                    value={edit.user.nombre ?? ""}
                                    onChange={(e) =>
                                        setEdit((s) =>
                                            s.user ? {...s, user: {...s.user, nombre: e.target.value}} : s
                                        )
                                    }
                                />
                            </div>
                            {/* Apellido */}
                            <div>
                                <label className="block text-sm text-slate-600">Apellido</label>
                                <TextInput
                                    value={edit.user.apellido ?? ""}
                                    onChange={(e) =>
                                        setEdit((s) =>
                                            s.user ? {...s, user: {...s.user, apellido: e.target.value}} : s
                                        )
                                    }
                                />
                            </div>
                            {/* Estado */}
                            <div>
                                <label className="block text-sm text-slate-600">Estado</label>
                                <Select
                                    value={edit.user.estado ?? ""}
                                    onChange={(e) =>
                                        setEdit((s) =>
                                            s.user ? {...s, user: {...s.user, estado: e.target.value}} : s
                                        )
                                    }
                                >
                                    <option value="">(sin estado)</option>
                                    {ESTADOS.map((e) => (
                                        <option key={e} value={e}>
                                            {e}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Rol */}
                            <div>
                                <label className="block text-sm text-slate-600">Rol</label>
                                <Select
                                    value={edit.user.idrol ?? ""}
                                    onChange={(e) =>
                                        setEdit((s) =>
                                            s.user
                                                ? {
                                                    ...s,
                                                    user: {
                                                        ...s.user,
                                                        idrol: e.target.value ? Number(e.target.value) : null,
                                                    },
                                                }
                                                : s
                                        )
                                    }
                                >
                                    <option value="">(sin rol)</option>
                                    {(roles ?? []).map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.descripcion ?? `Rol ${r.id}`}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
                            <button
                                onClick={closeEdit}
                                className="rounded-lg border border-slate-300 px-4 py-2"
                                disabled={edit.saving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => void saveEdit()}
                                className="rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:opacity-50"
                                disabled={edit.saving}
                            >
                                {edit.saving ? "Guardando…" : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}