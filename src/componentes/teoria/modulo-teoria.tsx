"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Clock,
  Cpu,
  Flame,
  GitBranch,
  Layers,
  Radio,
} from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import {
  InsigniaEstado,
  SelectorSegmentado,
  TarjetaLaboratorio,
  type OpcionSegmentada,
} from "@/componentes/ui";
import {
  CASOS_POYNTING_FIUBA,
  DEDUCCION_ONDA_C_PASOS,
  DERIVACION_CONTINUIDAD_PASOS,
  ENTORNOS_MODELACION_CAP1,
  LINEA_HISTORICA_MAXWELL,
  TEOREMA_POYNTING_PASOS,
  type ClaveTerminoEcuacion,
} from "@/lib/datos/teoria-maxwell";
import {
  CATALOGO_DIELECTRICOS,
  CATALOGO_MEDIOS_CONDUCTORES,
  DOS_PI,
  PERMITIVIDAD_VACIO,
  formatearUnidadSI,
} from "@/lib/fisica";
import type { PasoAnalitico } from "@/tipos/calculadora";
import { combinarClases } from "@/lib/utils";
import { DesgloseEcuacionInteractivo } from "./desglose-ecuacion-interactivo";

export interface PropiedadesModuloTeoria {
  alAbrirPreset?: (_preset_id: string) => void;
  alCambiarTermino?: (_termino_id: ClaveTerminoEcuacion | null) => void;
  clase_extra?: string;
}

type TipoTablaMaterial = "dielectricos" | "conductores";

const OPCIONES_TABLA_MATERIALES: ReadonlyArray<
  OpcionSegmentada<TipoTablaMaterial>
> = [
  {
    valor: "dielectricos",
    etiqueta: "Dieléctricos (Cap. 2 · ε_r y E_r)",
    descripcion: "Tabla de permitividad relativa y rigidez dieléctrica",
  },
  {
    valor: "conductores",
    etiqueta: "Medios con pérdidas (Cap. 3 · σ, τ_r y f_c)",
    descripcion: "Transición entre conducción y desplazamiento",
  },
];

function ListaPasosTeoricos(_propiedades: {
  pasos: ReadonlyArray<PasoAnalitico>;
}) {
  const { pasos } = _propiedades;

  return (
    <ol className="space-y-3">
      {pasos.map((_paso) => (
        <li
          key={_paso.numero}
          className="rounded-xl border border-borde-panel bg-fondo-base/75 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-azul-activo/35 bg-azul-activo/12 font-mono text-xs font-semibold text-azul-activo">
                {_paso.numero}
              </span>
              <h3 className="text-xs font-semibold text-texto-principal sm:text-sm">
                {_paso.titulo}
              </h3>
            </div>
            {_paso.nota_conceptual && (
              <span className="rounded-md border border-morado-frontera/30 bg-morado-frontera/10 px-2.5 py-0.5 font-mono text-[11px] text-morado-frontera">
                {_paso.nota_conceptual}
              </span>
            )}
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg bg-fondo-elevado/70 px-3 py-2.5">
            <FormulaKatex expresion={_paso.expresion_latex} en_bloque />
          </div>

          {_paso.verificacion_dimensional && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-texto-secundario">
              <span className="font-mono uppercase tracking-wider text-naranja-constante">
                Consistencia SI:
              </span>
              <FormulaKatex expresion={_paso.verificacion_dimensional} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function ModuloTeoria(_propiedades: PropiedadesModuloTeoria) {
  const { alAbrirPreset, alCambiarTermino, clase_extra } = _propiedades;

  const [tabla_material, establecerTablaMaterial] =
    useState<TipoTablaMaterial>("dielectricos");
  const [hito_activo_id, establecerHitoActivoId] = useState<string>(
    "maxwell-1855-1873",
  );

  const hito_activo =
    LINEA_HISTORICA_MAXWELL.find((_h) => _h.id === hito_activo_id) ??
    LINEA_HISTORICA_MAXWELL[4];

  return (
    <div className={combinarClases("space-y-6", clase_extra)}>
      <DesgloseEcuacionInteractivo
        alAbrirPreset={alAbrirPreset}
        alCambiarTermino={alCambiarTermino}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <TarjetaLaboratorio
          etiqueta_superior="FIUBA · Cap. 5 (p. 5-18)"
          titulo="Derivación desde la Ecuación de Continuidad"
          subtitulo="Cómo la conservación de la carga impone de manera única el término ∂D/∂t."
          icono={<GitBranch className="h-4 w-4" />}
          acciones_derecha={
            alAbrirPreset && (
              <button
                type="button"
                onClick={() => alAbrirPreset("fiuba-ej-5-9-paradoja")}
                className="inline-flex items-center gap-1 rounded-lg border border-azul-activo/35 bg-azul-activo/12 px-2.5 py-1 text-xs font-medium text-azul-activo transition hover:bg-azul-activo/20"
              >
                Ver paradoja 3D
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )
          }
        >
          <ListaPasosTeoricos pasos={DERIVACION_CONTINUIDAD_PASOS} />
        </TarjetaLaboratorio>

        <TarjetaLaboratorio
          etiqueta_superior="FIUBA · Cap. 5 (pp. 5-19–5-22)"
          titulo="Teorema de Poynting y Transferencia de Energía"
          subtitulo="El vector N = E × H describe la densidad de potencia electromagnética en W/m²."
          icono={<Flame className="h-4 w-4" />}
          acciones_derecha={
            alAbrirPreset && (
              <button
                type="button"
                onClick={() => alAbrirPreset("fiuba-ej-5-9-poynting")}
                className="inline-flex items-center gap-1 rounded-lg border border-verde-inducido/35 bg-verde-inducido/12 px-2.5 py-1 text-xs font-medium text-verde-inducido transition hover:bg-verde-inducido/20"
              >
                Ver vector N en 3D
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )
          }
        >
          <div className="space-y-4">
            <ListaPasosTeoricos pasos={TEOREMA_POYNTING_PASOS} />

            <div className="grid gap-3 sm:grid-cols-2">
              {CASOS_POYNTING_FIUBA.map((_caso) => (
                <div
                  key={_caso.id}
                  className="flex flex-col justify-between rounded-xl border border-verde-inducido/25 bg-fondo-base/80 p-3.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-texto-principal">
                        {_caso.titulo}
                      </h3>
                      <InsigniaEstado variante="verde">
                        {_caso.referencia_fiuba}
                      </InsigniaEstado>
                    </div>
                    <div className="my-2.5 overflow-x-auto rounded-lg bg-fondo-elevado/70 px-2.5 py-2 text-xs">
                      <FormulaKatex expresion={_caso.ecuacion_latex} en_bloque />
                    </div>
                    <p className="text-xs leading-relaxed text-texto-secundario">
                      {_caso.interpretacion}
                    </p>
                  </div>

                  {alAbrirPreset && _caso.preset_relacionado_id && (
                    <button
                      type="button"
                      onClick={() =>
                        alAbrirPreset(_caso.preset_relacionado_id!)
                      }
                      className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-verde-inducido transition hover:underline"
                    >
                      Abrir experimento guiado
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TarjetaLaboratorio>
      </div>

      <TarjetaLaboratorio
        etiqueta_superior="FIUBA · Cap. 1 y Cap. 5"
        titulo="Deducción de la Ecuación de Onda (c = 1/√(μ₀ε₀)) y Entornos de Modelación"
        subtitulo="El acoplamiento entre Faraday y Ampère-Maxwell predice la propagación electromagnética y delimita los regímenes de ingeniería."
        icono={<Radio className="h-4 w-4" />}
        acciones_derecha={
          alAbrirPreset && (
            <button
              type="button"
              onClick={() => alAbrirPreset("fiuba-cap-5-onda-em")}
              className="inline-flex items-center gap-1 rounded-lg border border-azul-activo/35 bg-azul-activo/12 px-2.5 py-1 text-xs font-medium text-azul-activo transition hover:bg-azul-activo/20"
            >
              Simular onda EM
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )
        }
      >
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ListaPasosTeoricos pasos={DEDUCCION_ONDA_C_PASOS} />
          </div>

          <div className="space-y-3 lg:col-span-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-ambar-destacar" />
              <h3 className="font-display text-sm font-semibold text-texto-principal">
                Los 3 Entornos de Modelación (Cap. 1)
              </h3>
            </div>
            {ENTORNOS_MODELACION_CAP1.map((_entorno) => (
              <div
                key={_entorno.id}
                className="rounded-xl border border-borde-panel bg-fondo-base/75 p-4"
              >
                <p className="text-xs font-semibold text-texto-principal sm:text-sm">
                  {_entorno.nombre}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <InsigniaEstado variante="ambar">
                    <FormulaKatex expresion={_entorno.criterio_latex} />
                  </InsigniaEstado>
                </div>
                <div className="mt-2.5 overflow-x-auto rounded-lg bg-fondo-elevado/70 px-2.5 py-1.5 text-xs">
                  <FormulaKatex expresion={_entorno.ecuaciones_clave_latex} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-texto-secundario">
                  {_entorno.aplicaciones}
                </p>
                {alAbrirPreset && _entorno.preset_relacionado_id && (
                  <button
                    type="button"
                    onClick={() =>
                      alAbrirPreset(_entorno.preset_relacionado_id!)
                    }
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-azul-activo transition hover:underline"
                  >
                    Cargar caso en el laboratorio
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </TarjetaLaboratorio>

      <TarjetaLaboratorio
        etiqueta_superior="FIUBA · Cap. 2 y Cap. 3"
        titulo="Tabla Interactiva de Materiales Electromagnéticos"
        subtitulo="Propiedades constitutivas reales empleadas en los simuladores y la calculadora analítica."
        icono={<Layers className="h-4 w-4" />}
        acciones_derecha={
          <SelectorSegmentado
            opciones={OPCIONES_TABLA_MATERIALES}
            valor_actual={tabla_material}
            alSeleccionar={establecerTablaMaterial}
            etiqueta_aria="Seleccionar tabla de materiales"
            tamano="sm"
          />
        }
      >
        {tabla_material === "dielectricos" ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-borde-panel text-xs font-semibold text-texto-secundario">
                  <th className="py-2.5 pr-4">Material</th>
                  <th className="py-2.5 pr-4">
                    <FormulaKatex expresion={"\\varepsilon_r"} />
                  </th>
                  <th className="py-2.5 pr-4">
                    Campo ruptura <FormulaKatex expresion={"E_r"} />
                  </th>
                  <th className="py-2.5 pr-4">
                    Velocidad <FormulaKatex expresion={"v / c"} />
                  </th>
                  <th className="py-2.5">Nota física (FIUBA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde-panel/60">
                {CATALOGO_DIELECTRICOS.map((_mat) => {
                  const razon_v = 1 / Math.sqrt(_mat.permitividad_relativa);
                  return (
                    <tr
                      key={_mat.id}
                      className="transition-colors hover:bg-panel/50"
                    >
                      <td className="py-2.5 pr-4 font-medium text-texto-principal">
                        {_mat.nombre}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-azul-activo">
                        {_mat.permitividad_relativa}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-rojo-anulado">
                        {Number.isFinite(_mat.campo_ruptura_v_m)
                          ? formatearUnidadSI(_mat.campo_ruptura_v_m, "V/m", {
                              decimales: 0,
                            }).texto
                          : "∞ (ideal)"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-verde-inducido">
                        {razon_v.toFixed(3)} c
                      </td>
                      <td className="py-2.5 text-xs text-texto-secundario">
                        {_mat.nota_fisica}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-borde-panel text-xs font-semibold text-texto-secundario">
                  <th className="py-2.5 pr-4">Medio</th>
                  <th className="py-2.5 pr-4">
                    <FormulaKatex expresion={"\\sigma\\;(\\text{S/m})"} />
                  </th>
                  <th className="py-2.5 pr-4">
                    <FormulaKatex expresion={"\\varepsilon_r"} />
                  </th>
                  <th className="py-2.5 pr-4">
                    Relajación <FormulaKatex expresion={"\\tau_r = \\varepsilon/\\sigma"} />
                  </th>
                  <th className="py-2.5 pr-4">
                    Cruce <FormulaKatex expresion={"f_c = \\sigma/(2\\pi\\varepsilon)"} />
                  </th>
                  <th className="py-2.5">Comportamiento (FIUBA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde-panel/60">
                {CATALOGO_MEDIOS_CONDUCTORES.map((_medio) => {
                  const epsilon =
                    PERMITIVIDAD_VACIO * _medio.permitividad_relativa;
                  const tau_r = epsilon / _medio.conductividad_s_m;
                  const f_c = _medio.conductividad_s_m / (DOS_PI * epsilon);
                  return (
                    <tr
                      key={_medio.id}
                      className="transition-colors hover:bg-panel/50"
                    >
                      <td className="py-2.5 pr-4 font-medium text-texto-principal">
                        {_medio.nombre}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-ambar-destacar">
                        {formatearUnidadSI(_medio.conductividad_s_m, "S/m").texto}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-azul-activo">
                        {_medio.permitividad_relativa}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-naranja-constante">
                        {formatearUnidadSI(tau_r, "s").texto}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-morado-frontera">
                        {formatearUnidadSI(f_c, "Hz").texto}
                      </td>
                      <td className="py-2.5 text-xs text-texto-secundario">
                        {_medio.nota_fisica}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TarjetaLaboratorio>

      <TarjetaLaboratorio
        variante="elevada"
        etiqueta_superior="Cronología científica · 1820–1888"
        titulo="Línea Histórica: de Oersted y Ampère hasta Maxwell y Hertz"
        subtitulo="Evolución de las ecuaciones fundamentales del electromagnetismo clásico según FIUBA Cap. 5."
        icono={<Clock className="h-4 w-4" />}
      >
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {LINEA_HISTORICA_MAXWELL.map((_hito) => {
              const seleccionado = _hito.id === hito_activo.id;
              return (
                <button
                  key={_hito.id}
                  type="button"
                  onClick={() => establecerHitoActivoId(_hito.id)}
                  className={combinarClases(
                    "flex flex-col items-start rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
                    seleccionado
                      ? "border-azul-activo/50 bg-azul-activo/15 text-texto-principal shadow-[0_0_20px_-8px_rgba(56,189,248,0.55)]"
                      : "border-borde-panel bg-fondo-base/70 text-texto-secundario hover:border-azul-activo/30 hover:text-texto-principal",
                  )}
                >
                  <span className="font-mono text-[11px] font-semibold text-azul-activo">
                    {_hito.anio}
                  </span>
                  <span className="mt-1 text-xs font-semibold leading-snug">
                    {_hito.cientifico}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-azul-activo/30 bg-fondo-base/85 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <InsigniaEstado variante="azul" con_punto>
                  {hito_activo.anio}
                </InsigniaEstado>
                <h3 className="mt-2 font-display text-base font-semibold text-texto-principal sm:text-lg">
                  {hito_activo.cientifico} — {hito_activo.titulo}
                </h3>
              </div>
              {alAbrirPreset && (
                <button
                  type="button"
                  onClick={() =>
                    alAbrirPreset(hito_activo.preset_relacionado_id)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-azul-activo/40 bg-azul-activo/15 px-3 py-1.5 text-xs font-medium text-azul-activo transition hover:bg-azul-activo/25"
                >
                  Explorar en el Simulador 3D
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="my-4 overflow-x-auto rounded-lg border border-borde-panel bg-fondo-elevado/85 px-4 py-3 text-center">
              <FormulaKatex expresion={hito_activo.ecuacion_latex} en_bloque />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-borde-panel bg-panel/50 p-3.5">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-verde-inducido">
                  Aporte fundamental
                </p>
                <p className="text-xs leading-relaxed text-texto-principal/90 sm:text-sm">
                  {hito_activo.aporte_clave}
                </p>
              </div>
              <div className="rounded-lg border border-borde-panel bg-panel/50 p-3.5">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-ambar-destacar">
                  Alcance o limitación histórica
                </p>
                <p className="text-xs leading-relaxed text-texto-secundario sm:text-sm">
                  {hito_activo.brecha_o_sintesis}
                </p>
              </div>
            </div>
          </div>
        </div>
      </TarjetaLaboratorio>
    </div>
  );
}
