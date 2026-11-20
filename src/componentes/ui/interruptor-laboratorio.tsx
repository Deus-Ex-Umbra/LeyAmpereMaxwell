"use client";

import { useId } from "react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { combinarClases } from "@/lib/utils";

export interface PropiedadesInterruptorLaboratorio {
  etiqueta: string;
  simbolo_latex?: string;
  activo: boolean;
  color_indicador?: string;
  descripcion?: string;
  deshabilitado?: boolean;
  compacto?: boolean;
  clase_extra?: string;
  alAlternar: (_activo: boolean) => void;
}

export function InterruptorLaboratorio(
  _propiedades: PropiedadesInterruptorLaboratorio,
) {
  const {
    etiqueta,
    simbolo_latex,
    activo,
    color_indicador = "#38bdf8",
    descripcion,
    deshabilitado = false,
    compacto = false,
    clase_extra,
    alAlternar,
  } = _propiedades;

  const id_descripcion = useId();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-describedby={descripcion ? id_descripcion : undefined}
      disabled={deshabilitado}
      onClick={() => alAlternar(!activo)}
      className={combinarClases(
        "group flex w-full items-center justify-between gap-3 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60 disabled:cursor-not-allowed disabled:opacity-50",
        compacto ? "px-3 py-2" : "px-3.5 py-2.5",
        activo
          ? "border-borde-activo bg-fondo-elevado/90 text-texto-principal"
          : "border-borde-panel bg-fondo-base/55 text-texto-secundario hover:border-slate-500/45 hover:text-texto-principal",
        clase_extra,
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full transition-[background-color,box-shadow]"
          style={{
            backgroundColor: activo ? color_indicador : "#475569",
            boxShadow: activo ? `0 0 10px ${color_indicador}` : "none",
          }}
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-medium sm:text-[13px]">
            <span className="truncate">{etiqueta}</span>
            {simbolo_latex && (
              <span
                className="shrink-0 text-xs"
                style={{ color: activo ? color_indicador : undefined }}
              >
                <FormulaKatex expresion={simbolo_latex} />
              </span>
            )}
          </span>
          {descripcion && (
            <span
              id={id_descripcion}
              className="mt-0.5 block text-[11px] leading-snug text-texto-tenue"
            >
              {descripcion}
            </span>
          )}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={combinarClases(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
          activo
            ? "border-borde-activo"
            : "border-borde-panel bg-panel-suave",
        )}
        style={
          activo
            ? { backgroundColor: `color-mix(in srgb, ${color_indicador} 55%, var(--panel))` }
            : undefined
        }
      >
        <span
          className={combinarClases(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
            activo ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
