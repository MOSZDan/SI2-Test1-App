import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function Card({
  title,
  description,
  onClick,
}: {
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-white border border-slate-200 p-5 text-left
                 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <h3 className="text-slate-800 font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </button>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  return (
    <div className="min-h-dvh bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 text-slate-800">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Smart Condominium</h1>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Gestionar Usuarios"
            description="Alta, edición y listado de usuarios"
            onClick={() => nav("/Usuarios")}
          />
          <Card
            title="Gestionar Roles"
            description="Modifiacion de Roles y Permisos a usuarios"
            onClick={() => nav("/Roles")}
          />
          <Card
            title="Estado de Cuenta"
            description="Cargos, pagos, vencidos y mora"
            onClick={() => nav("/estado-cuenta")}
          />
        </div>
      </main>
    </div>
  );
}
