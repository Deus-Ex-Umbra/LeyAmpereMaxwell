"use client";

import {
  Atom,
  Award,
  BookOpen,
  Calculator,
  Orbit,
  type LucideIcon,
} from "lucide-react";
import type { PestanaAplicacion } from "@/tipos";
import { InsigniaEstado } from "@/componentes/ui";
import { combinarClases } from "@/lib/utils";

export interface PropiedadesEncabezadoLaboratorio {
  pestana_activa: PestanaAplicacion;
  alCambiarPestana: (_pestana: PestanaAplicacion) => void;
  misiones_completadas?: number;
  total_misiones?: number;
  maxwell_activo?: boolean;
}

interface ElementoNavegacion {
  id: PestanaAplicacion;
  etiqueta: string;
  etiqueta_corta: string;
  icono: LucideIcon;
}

const ELEMENTOS_NAVEGACION: readonly ElementoNavegacion[] = [
  {
    id: "simulador",
    etiqueta: "Simulador 3D",
    etiqueta_corta: "3D",
    icono: Orbit,
  },
  {
    id: "calculadora",
    etiqueta: "Calculadora",
    etiqueta_corta: "Cálculo",
    icono: Calculator,
  },
  {
    id: "teoria",
    etiqueta: "Teoría e Historia",
    etiqueta_corta: "Teoría",
    icono: BookOpen,
  },
  {
    id: "autoevaluacion",
    etiqueta: "Autoevaluación",
    etiqueta_corta: "Quiz",
    icono: Award,
  },
];

export function EncabezadoLaboratorio(
  _propiedades: PropiedadesEncabezadoLaboratorio,
) {
  const {
    pestana_activa,
    alCambiarPestana,
    misiones_completadas,
    total_misiones,
    maxwell_activo,
  } = _propiedades;

  const mostrar_misiones =
    typeof misiones_completadas === "number" &&
    typeof total_misiones === "number" &&
    total_misiones > 0;

  return (
    <header className="sticky top-0 z-30 border-b border-borde-panel bg-fondo-base/82 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-azul-activo/35 bg-gradient-to-br from-azul-activo/20 via-fondo-elevado to-morado-frontera/20 text-azul-activo shadow-[0_0_20px_-6px_rgba(56,189,248,0.55)]"
          >
            <Atom className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-semibold tracking-tight text-texto-principal sm:text-lg">
              Ley de Ampère-Maxwell
            </h1>
            <p className="font-mono text-[11px] tracking-wider text-texto-secundario">
              Electromagnetismo · FIUBA
            </p>
          </div>
        </div>

        <nav
          aria-label="Módulos del laboratorio virtual"
          role="tablist"
          className="order-3 flex w-full items-center gap-1 rounded-xl border border-borde-panel bg-fondo-elevado/85 p-1 lg:order-2 lg:w-auto"
        >
          {ELEMENTOS_NAVEGACION.map((_elemento) => {
            const IconoElemento = _elemento.icono;
            const esta_activo = _elemento.id === pestana_activa;

            return (
              <button
                key={_elemento.id}
                type="button"
                role="tab"
                aria-selected={esta_activo}
                onClick={() => alCambiarPestana(_elemento.id)}
                className={combinarClases(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60 lg:flex-initial sm:text-sm",
                  esta_activo
                    ? "border border-azul-activo/40 bg-azul-activo/15 text-texto-principal shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "border border-transparent text-texto-secundario hover:bg-panel/80 hover:text-texto-principal",
                )}
              >
                <IconoElemento
                  className={combinarClases(
                    "h-4 w-4 shrink-0",
                    esta_activo ? "text-azul-activo" : "text-texto-tenue",
                  )}
                />
                <span className="hidden sm:inline">{_elemento.etiqueta}</span>
                <span className="sm:hidden">{_elemento.etiqueta_corta}</span>
              </button>
            );
          })}
        </nav>

        <div className="order-2 flex items-center gap-2 lg:order-3">
          {typeof maxwell_activo === "boolean" && (
            <InsigniaEstado
              variante={maxwell_activo ? "morado" : "rojo"}
              con_punto
              pulso={!maxwell_activo}
            >
              {maxwell_activo ? "∂D/∂t ON" : "∂D/∂t OFF"}
            </InsigniaEstado>
          )}

          {mostrar_misiones && (
            <button
              type="button"
              onClick={() => alCambiarPestana("autoevaluacion")}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60"
              title="Ver misiones interactivas del laboratorio"
            >
              <InsigniaEstado
                variante={
                  misiones_completadas === total_misiones ? "verde" : "ambar"
                }
                con_punto
              >
                Misiones {misiones_completadas}/{total_misiones}
              </InsigniaEstado>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
