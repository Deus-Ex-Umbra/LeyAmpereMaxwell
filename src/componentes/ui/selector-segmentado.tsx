"use client";

import { combinarClases } from "@/lib/utils";

export interface OpcionSegmentada<T extends string> {
  valor: T;
  etiqueta: string;
  descripcion?: string;
  color_punto?: string;
}

export interface PropiedadesSelectorSegmentado<T extends string> {
  opciones: ReadonlyArray<OpcionSegmentada<T>>;
  valor_actual: T;
  alSeleccionar: (_valor: T) => void;
  tamano?: "sm" | "md";
  etiqueta_aria: string;
  ancho_completo?: boolean;
  clase_extra?: string;
}

export function SelectorSegmentado<T extends string>(
  _propiedades: PropiedadesSelectorSegmentado<T>,
) {
  const {
    opciones,
    valor_actual,
    alSeleccionar,
    tamano = "md",
    etiqueta_aria,
    ancho_completo = false,
    clase_extra,
  } = _propiedades;

  function manejarTecla(_indice: number, _tecla: string): void {
    if (opciones.length === 0) {
      return;
    }
    if (_tecla === "ArrowRight" || _tecla === "ArrowDown") {
      const siguiente_indice = (_indice + 1) % opciones.length;
      alSeleccionar(opciones[siguiente_indice].valor);
    } else if (_tecla === "ArrowLeft" || _tecla === "ArrowUp") {
      const anterior_indice = (_indice - 1 + opciones.length) % opciones.length;
      alSeleccionar(opciones[anterior_indice].valor);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={etiqueta_aria}
      className={combinarClases(
        "inline-flex flex-wrap items-center gap-1 rounded-xl border border-borde-panel bg-fondo-base/80 p-1",
        ancho_completo ? "flex w-full" : "",
        clase_extra,
      )}
    >
      {opciones.map((_opcion, _indice) => {
        const esta_activo = _opcion.valor === valor_actual;
        return (
          <button
            key={_opcion.valor}
            type="button"
            role="radio"
            aria-checked={esta_activo}
            title={_opcion.descripcion}
            onClick={() => alSeleccionar(_opcion.valor)}
            onKeyDown={(_evento) => {
              if (
                _evento.key === "ArrowRight" ||
                _evento.key === "ArrowLeft" ||
                _evento.key === "ArrowUp" ||
                _evento.key === "ArrowDown"
              ) {
                _evento.preventDefault();
                manejarTecla(_indice, _evento.key);
              }
            }}
            className={combinarClases(
              "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
              ancho_completo ? "flex-1" : "",
              tamano === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm",
              esta_activo
                ? "border border-azul-activo/40 bg-azul-activo/15 text-texto-principal shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] claro:shadow-none"
                : "border border-transparent text-texto-secundario hover:bg-panel/80 hover:text-texto-principal",
            )}
          >
            {_opcion.color_punto && (
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: _opcion.color_punto,
                  boxShadow: esta_activo
                    ? `0 0 8px ${_opcion.color_punto}`
                    : undefined,
                }}
              />
            )}
            <span className="truncate">{_opcion.etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}
