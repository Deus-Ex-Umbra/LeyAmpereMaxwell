"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { combinarClases } from "@/lib/utils";

export interface OpcionSelector<T extends string> {
  valor: T;
  etiqueta: string;
  detalle?: string;
}

export interface PropiedadesSelectorOpciones<T extends string> {
  etiqueta: string;
  valor_actual: T;
  opciones: ReadonlyArray<OpcionSelector<T>>;
  alSeleccionar: (_valor: T) => void;
  descripcion?: string;
  deshabilitado?: boolean;
  clase_extra?: string;
}

export function SelectorOpciones<T extends string>(
  _propiedades: PropiedadesSelectorOpciones<T>,
) {
  const {
    etiqueta,
    valor_actual,
    opciones,
    alSeleccionar,
    descripcion,
    deshabilitado = false,
    clase_extra,
  } = _propiedades;

  const id_select = useId();
  const id_descripcion = useId();
  const opcion_activa = opciones.find((_opcion) => _opcion.valor === valor_actual);

  return (
    <div className={combinarClases("flex flex-col gap-1.5", clase_extra)}>
      <label
        htmlFor={id_select}
        className="text-xs font-medium text-texto-principal"
      >
        {etiqueta}
      </label>

      <div className="relative">
        <select
          id={id_select}
          value={valor_actual}
          disabled={deshabilitado}
          aria-describedby={descripcion ? id_descripcion : undefined}
          onChange={(_evento) => alSeleccionar(_evento.target.value as T)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            backgroundImage: "none",
          }}
          className="w-full appearance-none bg-none rounded-xl border border-borde-panel bg-fondo-elevado px-3.5 py-2.5 pr-9 text-xs font-medium text-texto-principal transition-colors hover:border-slate-500/60 focus-visible:border-azul-activo/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        >
          {opciones.map((_opcion) => (
            <option
              key={_opcion.valor}
              value={_opcion.valor}
              className="bg-fondo-elevado text-texto-principal"
            >
              {_opcion.detalle
                ? `${_opcion.etiqueta} — ${_opcion.detalle}`
                : _opcion.etiqueta}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-secundario"
        />
      </div>

      {opcion_activa?.detalle && (
        <p className="font-mono text-[11px] text-azul-activo/90">
          {opcion_activa.detalle}
        </p>
      )}
      {descripcion && (
        <p
          id={id_descripcion}
          className="text-[11px] leading-snug text-texto-secundario"
        >
          {descripcion}
        </p>
      )}
    </div>
  );
}
