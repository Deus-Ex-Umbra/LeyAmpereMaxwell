"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

interface PropiedadesErrorPagina {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorLaboratorio(_propiedades: PropiedadesErrorPagina) {
  const { error, reset } = _propiedades;

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-6">
      <section className="panel-laboratorio-elevado max-w-lg rounded-2xl p-7 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rojo-anulado/30 bg-rojo-anulado/10 text-rojo-anulado">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold text-texto-principal">
          Error en la simulación del laboratorio
        </h1>
        <p className="mt-2 text-sm text-texto-secundario">
          {error.message || "Ocurrió un inconveniente inesperado al renderizar el módulo."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-azul-activo/40 bg-azul-activo/15 px-4 py-2 text-sm font-medium text-azul-activo transition-colors hover:bg-azul-activo/25"
        >
          <RotateCcw className="h-4 w-4" />
          Reintentar carga
        </button>
      </section>
    </main>
  );
}
