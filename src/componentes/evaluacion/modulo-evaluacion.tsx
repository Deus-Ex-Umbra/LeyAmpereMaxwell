"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Award,
  CheckCircle2,
  Compass,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Target,
  XCircle,
} from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import {
  InsigniaEstado,
  SelectorSegmentado,
  TarjetaLaboratorio,
  type OpcionSegmentada,
  type VarianteInsigniaEstado,
} from "@/componentes/ui";
import {
  BANCO_PREGUNTAS_FIUBA,
  MISIONES_INTERACTIVAS,
  type NivelDificultadPregunta,
} from "@/lib/datos/banco-evaluacion";
import { combinarClases } from "@/lib/utils";

export interface PropiedadesModuloEvaluacion {
  misiones_completadas?: ReadonlyArray<string>;
  alAbrirPreset?: (_preset_id: string) => void;
  clase_extra?: string;
}

type FiltroTipo = "todas" | "conceptual" | "numerica";
type FiltroDificultad = "todas" | NivelDificultadPregunta;

const OPCIONES_FILTRO_TIPO: ReadonlyArray<OpcionSegmentada<FiltroTipo>> = [
  { valor: "todas", etiqueta: "Todas (10)" },
  { valor: "conceptual", etiqueta: "Conceptuales (6)" },
  { valor: "numerica", etiqueta: "Numéricas (4)" },
];

const OPCIONES_FILTRO_DIFICULTAD: ReadonlyArray<
  OpcionSegmentada<FiltroDificultad>
> = [
  { valor: "todas", etiqueta: "Todo nivel" },
  { valor: "basica", etiqueta: "Básica" },
  { valor: "intermedia", etiqueta: "Intermedia" },
  { valor: "avanzada", etiqueta: "Avanzada" },
];

const VARIANTE_DIFICULTAD: Record<
  NivelDificultadPregunta,
  VarianteInsigniaEstado
> = {
  basica: "verde",
  intermedia: "ambar",
  avanzada: "morado",
};

const ETIQUETA_DIFICULTAD: Record<NivelDificultadPregunta, string> = {
  basica: "Básica",
  intermedia: "Intermedia",
  avanzada: "Avanzada",
};

const MISIONES_VACIAS: ReadonlyArray<string> = [];

export function ModuloEvaluacion(_propiedades: PropiedadesModuloEvaluacion) {
  const {
    misiones_completadas = MISIONES_VACIAS,
    alAbrirPreset,
    clase_extra,
  } = _propiedades;

  const [filtro_tipo, establecerFiltroTipo] = useState<FiltroTipo>("todas");
  const [filtro_dificultad, establecerFiltroDificultad] =
    useState<FiltroDificultad>("todas");
  const [respuestas, establecerRespuestas] = useState<Record<string, string>>(
    {},
  );
  const [pistas_abiertas, establecerPistasAbiertas] = useState<
    Record<string, boolean>
  >({});

  const preguntas_filtradas = useMemo(() => {
    return BANCO_PREGUNTAS_FIUBA.filter((_pregunta) => {
      const pasa_tipo =
        filtro_tipo === "todas" || _pregunta.tipo === filtro_tipo;
      const pasa_dificultad =
        filtro_dificultad === "todas" ||
        _pregunta.dificultad === filtro_dificultad;
      return pasa_tipo && pasa_dificultad;
    });
  }, [filtro_tipo, filtro_dificultad]);

  const estadisticas = useMemo(() => {
    let respondidas = 0;
    let correctas = 0;
    for (const pregunta of BANCO_PREGUNTAS_FIUBA) {
      const elegida = respuestas[pregunta.id];
      if (elegida) {
        respondidas += 1;
        if (elegida === pregunta.id_opcion_correcta) {
          correctas += 1;
        }
      }
    }
    const porcentaje =
      respondidas > 0 ? Math.round((correctas / respondidas) * 100) : 0;
    const progreso_pct = Math.round(
      (respondidas / BANCO_PREGUNTAS_FIUBA.length) * 100,
    );
    return {
      respondidas,
      correctas,
      incorrectas: respondidas - correctas,
      porcentaje,
      progreso_pct,
    };
  }, [respuestas]);

  const conjunto_misiones = useMemo(
    () => new Set<string>(misiones_completadas),
    [misiones_completadas],
  );

  function seleccionarOpcion(
    _pregunta_id: string,
    _opcion_id: string,
  ): void {
    establecerRespuestas((_previo) => ({
      ..._previo,
      [_pregunta_id]: _opcion_id,
    }));
  }

  function alternarPista(_pregunta_id: string): void {
    establecerPistasAbiertas((_previo) => ({
      ..._previo,
      [_pregunta_id]: !_previo[_pregunta_id],
    }));
  }

  function reiniciarEvaluacion(): void {
    establecerRespuestas({});
    establecerPistasAbiertas({});
  }

  return (
    <div className={combinarClases("space-y-6", clase_extra)}>
      <TarjetaLaboratorio
        variante="elevada"
        etiqueta_superior="Autoevaluación FIUBA · Verificación instantánea"
        titulo="Laboratorio de Autoevaluación y Misiones de Campo"
        subtitulo="10 reactivos conceptuales y numéricos verificados con demostración paso a paso en KaTeX, más 5 misiones interactivas en el simulador 3D."
        icono={<Award className="h-4 w-4" />}
        acciones_derecha={
          <button
            type="button"
            onClick={reiniciarEvaluacion}
            className="inline-flex items-center gap-1.5 rounded-lg border border-borde-panel bg-panel px-3 py-1.5 text-xs font-medium text-texto-secundario transition hover:border-azul-activo/40 hover:text-texto-principal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar intento
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-borde-panel bg-fondo-base/75 p-3.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
                Progreso del banco
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-texto-principal">
                {estadisticas.respondidas} / {BANCO_PREGUNTAS_FIUBA.length}
              </p>
            </div>

            <div className="rounded-xl border border-verde-inducido/30 bg-verde-inducido/[0.06] p-3.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-verde-inducido">
                Respuestas correctas
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-verde-inducido">
                {estadisticas.correctas}{" "}
                <span className="font-mono text-xs text-texto-secundario">
                  ({estadisticas.porcentaje}%)
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-rojo-anulado/30 bg-rojo-anulado/[0.06] p-3.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-rojo-anulado">
                Por revisar
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-rojo-anulado">
                {estadisticas.incorrectas}
              </p>
            </div>

            <div className="rounded-xl border border-ambar-destacar/30 bg-ambar-destacar/[0.06] p-3.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ambar-destacar">
                Misiones 3D logradas
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-ambar-destacar">
                {conjunto_misiones.size} / {MISIONES_INTERACTIVAS.length}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[11px] text-texto-secundario">
              <span>Avance general de autoevaluación</span>
              <span>{estadisticas.progreso_pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-fondo-base">
              <div
                className="h-full rounded-full bg-gradient-to-r from-azul-activo to-verde-inducido transition-[width] duration-300"
                style={{ width: `${estadisticas.progreso_pct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <SelectorSegmentado
              opciones={OPCIONES_FILTRO_TIPO}
              valor_actual={filtro_tipo}
              alSeleccionar={establecerFiltroTipo}
              etiqueta_aria="Filtrar preguntas por tipo"
              tamano="sm"
            />
            <SelectorSegmentado
              opciones={OPCIONES_FILTRO_DIFICULTAD}
              valor_actual={filtro_dificultad}
              alSeleccionar={establecerFiltroDificultad}
              etiqueta_aria="Filtrar preguntas por dificultad"
              tamano="sm"
            />
          </div>
        </div>
      </TarjetaLaboratorio>

      <div className="space-y-4">
        {preguntas_filtradas.length === 0 ? (
          <TarjetaLaboratorio variante="base">
            <p className="text-center text-sm text-texto-secundario">
              No hay reactivos que coincidan con la combinación de filtros actual.
            </p>
          </TarjetaLaboratorio>
        ) : (
          preguntas_filtradas.map((_pregunta) => {
            const elegida = respuestas[_pregunta.id];
            const respondida = Boolean(elegida);
            const acerto = elegida === _pregunta.id_opcion_correcta;
            const pista_visible = Boolean(pistas_abiertas[_pregunta.id]);

            return (
              <TarjetaLaboratorio
                key={_pregunta.id}
                variante={
                  !respondida ? "base" : acerto ? "exito" : "alerta"
                }
                etiqueta_superior={`Reactivo #${_pregunta.numero} · ${_pregunta.referencia_fiuba}`}
                titulo={_pregunta.etiqueta_tema}
                icono={<HelpCircle className="h-4 w-4" />}
                acciones_derecha={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <InsigniaEstado
                      variante={
                        _pregunta.tipo === "numerica" ? "azul" : "neutro"
                      }
                    >
                      {_pregunta.tipo === "numerica"
                        ? "Numérica"
                        : "Conceptual"}
                    </InsigniaEstado>
                    <InsigniaEstado
                      variante={VARIANTE_DIFICULTAD[_pregunta.dificultad]}
                    >
                      {ETIQUETA_DIFICULTAD[_pregunta.dificultad]}
                    </InsigniaEstado>
                  </div>
                }
              >
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-texto-principal">
                    {_pregunta.enunciado}
                  </p>

                  {_pregunta.enunciado_latex && (
                    <div className="overflow-x-auto rounded-lg border border-borde-panel bg-fondo-base/80 px-4 py-2.5 text-center">
                      <FormulaKatex
                        expresion={_pregunta.enunciado_latex}
                        en_bloque
                      />
                    </div>
                  )}

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {_pregunta.opciones.map((_opcion) => {
                      const es_elegida = elegida === _opcion.id;
                      const es_correcta =
                        _opcion.id === _pregunta.id_opcion_correcta;

                      let clases_estado =
                        "border-borde-panel bg-fondo-base/65 text-texto-principal/90 hover:border-azul-activo/40 hover:bg-panel/80";
                      if (respondida) {
                        if (es_correcta) {
                          clases_estado =
                            "border-verde-inducido/60 bg-verde-inducido/12 text-texto-principal";
                        } else if (es_elegida) {
                          clases_estado =
                            "border-rojo-anulado/60 bg-rojo-anulado/12 text-texto-principal";
                        } else {
                          clases_estado =
                            "border-borde-panel/60 bg-fondo-base/40 text-texto-secundario opacity-75";
                        }
                      }

                      return (
                        <button
                          key={_opcion.id}
                          type="button"
                          onClick={() =>
                            seleccionarOpcion(_pregunta.id, _opcion.id)
                          }
                          aria-pressed={es_elegida}
                          className={combinarClases(
                            "flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60 sm:text-sm",
                            clases_estado,
                          )}
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current/30 font-mono text-xs font-semibold uppercase">
                            {_opcion.id}
                          </span>
                          <span className="flex-1 leading-relaxed">
                            {_opcion.texto}
                          </span>
                          {respondida && es_correcta && (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verde-inducido" />
                          )}
                          {respondida && es_elegida && !es_correcta && (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rojo-anulado" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => alternarPista(_pregunta.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ambar-destacar/35 bg-ambar-destacar/10 px-3 py-1.5 text-xs font-medium text-ambar-destacar transition hover:bg-ambar-destacar/20"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      {pista_visible ? "Ocultar pista" : "Ver pista"}
                    </button>

                    {alAbrirPreset && (
                      <button
                        type="button"
                        onClick={() =>
                          alAbrirPreset(_pregunta.preset_relacionado_id)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-azul-activo/35 bg-azul-activo/12 px-3 py-1.5 text-xs font-medium text-azul-activo transition hover:bg-azul-activo/20"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        Explorar en Simulador 3D
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {pista_visible && (
                    <div className="rounded-xl border border-ambar-destacar/30 bg-ambar-destacar/[0.08] px-4 py-3 text-xs leading-relaxed text-texto-principal/90 sm:text-sm">
                      <span className="mr-1.5 font-mono font-semibold text-ambar-destacar">
                        Pista:
                      </span>
                      {_pregunta.pista}
                    </div>
                  )}

                  {respondida && (
                    <div className="space-y-3 rounded-xl border border-borde-panel bg-fondo-base/85 p-4">
                      <div className="flex items-center gap-2">
                        {acerto ? (
                          <CheckCircle2 className="h-4 w-4 text-verde-inducido" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rojo-anulado" />
                        )}
                        <p
                          className={combinarClases(
                            "text-xs font-semibold sm:text-sm",
                            acerto ? "text-verde-inducido" : "text-rojo-anulado",
                          )}
                        >
                          {acerto
                            ? "Correcto — demostración analítica verificada:"
                            : `Respuesta incorrecta (opción correcta: ${_pregunta.id_opcion_correcta.toUpperCase()}):`}
                        </p>
                      </div>

                      <p className="text-xs leading-relaxed text-texto-secundario sm:text-sm">
                        {_pregunta.explicacion_resumen}
                      </p>

                      <ol className="space-y-2.5 pt-1">
                        {_pregunta.demostracion_pasos.map((_paso) => (
                          <li
                            key={_paso.numero}
                            className="rounded-lg border border-borde-panel/80 bg-fondo-elevado/70 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono text-[11px] font-semibold text-azul-activo">
                                Paso {_paso.numero} · {_paso.titulo}
                              </span>
                              {_paso.nota_conceptual && (
                                <span className="rounded border border-morado-frontera/30 bg-morado-frontera/10 px-2 py-0.5 font-mono text-[10px] text-morado-frontera">
                                  {_paso.nota_conceptual}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 overflow-x-auto">
                              <FormulaKatex
                                expresion={_paso.expresion_latex}
                                en_bloque
                              />
                            </div>
                            {_paso.verificacion_dimensional && (
                              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-texto-secundario">
                                <span className="font-mono text-naranja-constante">
                                  SI:
                                </span>
                                <FormulaKatex
                                  expresion={_paso.verificacion_dimensional}
                                />
                              </div>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </TarjetaLaboratorio>
            );
          })
        )}
      </div>

      <TarjetaLaboratorio
        variante="elevada"
        etiqueta_superior="Verificación experimental en tiempo real"
        titulo="Misiones Interactivas en el Simulador 3D"
        subtitulo="Cada misión se valida automáticamente al reproducir el fenómeno físico en la escena tridimensional."
        icono={<Target className="h-4 w-4" />}
        acciones_derecha={
          <InsigniaEstado
            variante={
              conjunto_misiones.size === MISIONES_INTERACTIVAS.length
                ? "verde"
                : "ambar"
            }
            con_punto
          >
            {conjunto_misiones.size} / {MISIONES_INTERACTIVAS.length} logradas
          </InsigniaEstado>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MISIONES_INTERACTIVAS.map((_mision) => {
            const completada = conjunto_misiones.has(_mision.id);
            return (
              <div
                key={_mision.id}
                className={combinarClases(
                  "flex flex-col justify-between rounded-xl border p-4 transition-colors",
                  completada
                    ? "border-verde-inducido/45 bg-verde-inducido/[0.08]"
                    : "border-borde-panel bg-fondo-base/75",
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <InsigniaEstado variante="neutro">
                      {_mision.referencia_fiuba}
                    </InsigniaEstado>
                    <InsigniaEstado
                      variante={completada ? "verde" : "ambar"}
                      con_punto
                    >
                      {completada ? "Completada" : "Pendiente"}
                    </InsigniaEstado>
                  </div>

                  <h3 className="font-display text-sm font-semibold text-texto-principal">
                    {_mision.titulo}
                  </h3>
                  <p className="text-xs leading-relaxed text-texto-secundario">
                    {_mision.descripcion}
                  </p>
                  <p className="rounded-lg border border-borde-panel bg-fondo-elevado/70 px-2.5 py-1.5 font-mono text-[11px] text-azul-activo">
                    Criterio: {_mision.criterio_texto}
                  </p>
                </div>

                {alAbrirPreset && (
                  <button
                    type="button"
                    onClick={() => alAbrirPreset(_mision.preset_relacionado_id)}
                    className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-azul-activo transition hover:underline"
                  >
                    Ir al Simulador 3D
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </TarjetaLaboratorio>
    </div>
  );
}
