"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { BookOpen, Compass, Info, Sparkles } from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import {
  InsigniaEstado,
  SelectorSegmentado,
  TarjetaLaboratorio,
  type OpcionSegmentada,
} from "@/componentes/ui";
import {
  FORMULACIONES_AMPERE_MAXWELL,
  TERMINOS_ECUACION_MAXWELL,
  type ClaveTerminoEcuacion,
  type IdentificadorFormulacion,
} from "@/lib/datos/teoria-maxwell";
import { combinarClases } from "@/lib/utils";

export interface PropiedadesDesgloseEcuacion {
  termino_externo_id?: ClaveTerminoEcuacion | null;
  alCambiarTermino?: (_termino_id: ClaveTerminoEcuacion | null) => void;
  alAbrirPreset?: (_preset_id: string) => void;
  clase_extra?: string;
}

const OPCIONES_FORMULACION: ReadonlyArray<
  OpcionSegmentada<IdentificadorFormulacion>
> = FORMULACIONES_AMPERE_MAXWELL.map((_item) => ({
  valor: _item.id,
  etiqueta: _item.etiqueta_corta,
  descripcion: _item.titulo,
}));

const CLAVES_VALIDAS = new Set<string>(Object.keys(TERMINOS_ECUACION_MAXWELL));

function esClaveTerminoValida(
  _valor: string | null,
): _valor is ClaveTerminoEcuacion {
  return _valor !== null && CLAVES_VALIDAS.has(_valor);
}

export function DesgloseEcuacionInteractivo(
  _propiedades: PropiedadesDesgloseEcuacion,
) {
  const {
    termino_externo_id = null,
    alCambiarTermino,
    alAbrirPreset,
    clase_extra,
  } = _propiedades;

  const [formulacion_id, establecerFormulacionId] =
    useState<IdentificadorFormulacion>("integral_medios");
  const [termino_seleccionado, establecerTerminoSeleccionado] =
    useState<ClaveTerminoEcuacion>("corriente_desplazamiento");
  const [termino_sobre, establecerTerminoSobre] =
    useState<ClaveTerminoEcuacion | null>(null);

  const formulacion_actual =
    FORMULACIONES_AMPERE_MAXWELL.find((_f) => _f.id === formulacion_id) ??
    FORMULACIONES_AMPERE_MAXWELL[0];

  const clave_activa: ClaveTerminoEcuacion =
    termino_sobre ?? termino_externo_id ?? termino_seleccionado;
  const detalle_activo = TERMINOS_ECUACION_MAXWELL[clave_activa];

  function seleccionarTermino(_clave: ClaveTerminoEcuacion): void {
    establecerTerminoSeleccionado(_clave);
    alCambiarTermino?.(_clave);
  }

  function extraerClaveDesdeEvento(
    _evento: MouseEvent<HTMLDivElement>,
  ): ClaveTerminoEcuacion | null {
    const objetivo = _evento.target as HTMLElement | null;
    const nodo_termino = objetivo?.closest<HTMLElement>("[data-termino]");
    const clave = nodo_termino?.getAttribute("data-termino") ?? null;
    return esClaveTerminoValida(clave) ? clave : null;
  }

  function manejarClicEcuacion(_evento: MouseEvent<HTMLDivElement>): void {
    const clave = extraerClaveDesdeEvento(_evento);
    if (clave) {
      seleccionarTermino(clave);
    }
  }

  function manejarSobreEcuacion(_evento: MouseEvent<HTMLDivElement>): void {
    const clave = extraerClaveDesdeEvento(_evento);
    if (clave !== termino_sobre) {
      establecerTerminoSobre(clave);
      if (clave) {
        alCambiarTermino?.(clave);
      }
    }
  }

  function manejarSalidaEcuacion(): void {
    establecerTerminoSobre(null);
    alCambiarTermino?.(termino_seleccionado);
  }

  function manejarTeclaEcuacion(_evento: KeyboardEvent<HTMLDivElement>): void {
    const lista = formulacion_actual.terminos_incluidos;
    if (lista.length === 0) {
      return;
    }
    const indice_actual = Math.max(0, lista.indexOf(termino_seleccionado));
    if (_evento.key === "ArrowRight" || _evento.key === "ArrowDown") {
      _evento.preventDefault();
      seleccionarTermino(lista[(indice_actual + 1) % lista.length]);
    } else if (_evento.key === "ArrowLeft" || _evento.key === "ArrowUp") {
      _evento.preventDefault();
      seleccionarTermino(
        lista[(indice_actual - 1 + lista.length) % lista.length],
      );
    }
  }

  return (
    <TarjetaLaboratorio
      variante="elevada"
      etiqueta_superior="Comparador interactivo · Integral · Diferencial · Fasorial"
      titulo="Desglose Término a Término de la Ley de Ampère-Maxwell"
      subtitulo="Hacé clic o pasá el cursor sobre cualquier término de la ecuación para inspeccionar su significado físico, dimensiones SI y rol en la escena 3D."
      icono={<Sparkles className="h-4 w-4" />}
      acciones_derecha={
        <InsigniaEstado variante="azul" con_punto>
          {formulacion_actual.referencia_fiuba}
        </InsigniaEstado>
      }
      clase_extra={clase_extra}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelectorSegmentado
            opciones={OPCIONES_FORMULACION}
            valor_actual={formulacion_id}
            alSeleccionar={(_nueva_id) => {
              establecerFormulacionId(_nueva_id);
              const nueva_form = FORMULACIONES_AMPERE_MAXWELL.find(
                (_f) => _f.id === _nueva_id,
              );
              if (
                nueva_form &&
                !nueva_form.terminos_incluidos.includes(termino_seleccionado)
              ) {
                seleccionarTermino(nueva_form.terminos_incluidos[0]);
              }
            }}
            etiqueta_aria="Seleccionar formulación de la Ley de Ampère-Maxwell"
            tamano="sm"
          />
          <span className="font-mono text-[11px] text-texto-secundario">
            {formulacion_actual.dominio}
          </span>
        </div>

        <div
          role="toolbar"
          aria-label="Ecuación interactiva de Ampère-Maxwell"
          tabIndex={0}
          onClick={manejarClicEcuacion}
          onKeyDown={manejarTeclaEcuacion}
          onMouseOver={manejarSobreEcuacion}
          onMouseLeave={manejarSalidaEcuacion}
          onFocus={() => alCambiarTermino?.(termino_seleccionado)}
          onBlur={manejarSalidaEcuacion}
          className="rounded-xl border border-azul-activo/25 bg-fondo-base/85 px-4 py-6 text-center shadow-[inset_0_1px_0_rgba(56,189,248,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60"
        >
          <p className="mb-2 text-xs font-medium text-texto-secundario">
            {formulacion_actual.titulo}
          </p>
          <div className="overflow-x-auto py-1 text-lg sm:text-2xl">
            <FormulaKatex
              expresion={formulacion_actual.latex_interactivo}
              en_bloque
              confiar_html
              etiqueta_aria={formulacion_actual.titulo}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-texto-secundario">
            {formulacion_actual.resumen_aplicacion}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-texto-tenue">
            Términos:
          </span>
          {formulacion_actual.terminos_incluidos.map((_clave) => {
            const info = TERMINOS_ECUACION_MAXWELL[_clave];
            const esta_activo = _clave === clave_activa;
            return (
              <button
                key={_clave}
                type="button"
                onClick={() => seleccionarTermino(_clave)}
                onMouseEnter={() => establecerTerminoSobre(_clave)}
                onMouseLeave={() => establecerTerminoSobre(null)}
                className={combinarClases(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
                  esta_activo
                    ? "border-azul-activo/50 bg-azul-activo/15 text-texto-principal"
                    : "border-borde-panel bg-panel/70 text-texto-secundario hover:border-azul-activo/30 hover:text-texto-principal",
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: info.color_hex }}
                />
                <span className="text-texto-principal">
                  <FormulaKatex expresion={info.simbolo_corto_latex} />
                </span>
                <span className="text-texto-tenue">·</span>
                <span>{info.etiqueta_corta}</span>
              </button>
            );
          })}
        </div>

        <div
          className="rounded-xl border bg-fondo-elevado/90 p-4 sm:p-5"
          style={{ borderColor: `${detalle_activo.color_hex}55` }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borde-panel pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: detalle_activo.color_hex,
                    boxShadow: `0 0 10px ${detalle_activo.color_hex}`,
                  }}
                />
                <h3 className="font-display text-sm font-semibold text-texto-principal sm:text-base">
                  {detalle_activo.nombre}
                </h3>
              </div>
              <div className="text-sm text-texto-principal">
                <FormulaKatex expresion={detalle_activo.simbolo_latex} />
              </div>
            </div>
            <InsigniaEstado variante="neutro">
              SI: {detalle_activo.unidades_si}
            </InsigniaEstado>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-borde-panel bg-fondo-base/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-azul-activo">
                <BookOpen className="h-3.5 w-3.5" />
                Significado físico
              </p>
              <p className="text-xs leading-relaxed text-texto-principal/90 sm:text-sm">
                {detalle_activo.significado_fisico}
              </p>
            </div>

            <div className="rounded-lg border border-borde-panel bg-fondo-base/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-verde-inducido">
                <Compass className="h-3.5 w-3.5" />
                Rol en el simulador 3D
              </p>
              <p className="text-xs leading-relaxed text-texto-principal/90 sm:text-sm">
                {detalle_activo.rol_en_simulador}
              </p>
            </div>

            <div className="rounded-lg border border-borde-panel bg-fondo-base/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ambar-destacar">
                <Info className="h-3.5 w-3.5" />
                Interpretación intuitiva
              </p>
              <p className="text-xs leading-relaxed text-texto-secundario sm:text-sm">
                {detalle_activo.analogia_intuitiva}
              </p>
            </div>

            <div className="rounded-lg border border-borde-panel bg-fondo-base/60 p-3">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-morado-frontera">
                Contexto histórico
              </p>
              <p className="text-xs leading-relaxed text-texto-secundario sm:text-sm">
                {detalle_activo.nota_historica}
              </p>
            </div>
          </div>

          {alAbrirPreset && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  alAbrirPreset(
                    clave_activa === "poynting"
                      ? "fiuba-ej-5-9-poynting"
                      : clave_activa === "constantes_vacio"
                        ? "fiuba-cap-5-onda-em"
                        : "fiuba-ej-5-9-paradoja",
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-azul-activo/40 bg-azul-activo/15 px-3 py-1.5 text-xs font-medium text-azul-activo transition hover:bg-azul-activo/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60"
              >
                Observar este término en el Simulador 3D
              </button>
            </div>
          )}
        </div>
      </div>
    </TarjetaLaboratorio>
  );
}
