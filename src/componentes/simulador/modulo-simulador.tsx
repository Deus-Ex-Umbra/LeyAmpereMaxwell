"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  DiagramaFasorial,
  GraficaPerfilRadial,
  GraficaRegimenBode,
  OsciloscopioTemporal,
} from "@/componentes/graficas";
import {
  InsigniaEstado,
  SelectorSegmentado,
  TarjetaLaboratorio,
} from "@/componentes/ui";
import { useRelojSimulacion } from "@/hooks";
import {
  CAPAS_VISIBLES_INICIAL,
  DOS_PI,
  PARAMETROS_CAPACITOR_INICIAL,
  PARAMETROS_GEOMETRIA_INICIAL,
  PARAMETROS_ONDA_INICIAL,
  PRESETS_FIUBA,
  calcularCapacitor,
  calcularGeometriaAmpere,
  calcularOndaElectromagnetica,
  obtenerPresetPorId,
} from "@/lib/fisica";
import { combinarClases } from "@/lib/utils";
import type {
  CapasVisibles3D,
  EscenarioLaboratorio,
  InstantaneaCapacitor,
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ParametrosOndaEM,
  PresetExperimentoFIUBA,
  ResultadoGeometriaAmpere,
  ResultadoOndaEM,
} from "@/tipos";
import { PanelControlesSimulador } from "./panel-controles-simulador";
import { PanelParadojaSuperficies } from "./panel-paradoja-superficies";
import { PizarraVivaEcuaciones } from "./pizarra-viva-ecuaciones";

const FRECUENCIA_VISUAL_RELOJ = 1.2;
const VELOCIDAD_RC_VISUAL = 0.65;
const VELOCIDADES_DISPONIBLES = [0.25, 0.5, 1, 2] as const;

const OPCIONES_ESCENARIO: ReadonlyArray<{
  valor: EscenarioLaboratorio;
  etiqueta: string;
  color_punto: string;
}> = [
  {
    valor: "capacitor_paradoja",
    etiqueta: "Capacitor Ampère-Maxwell",
    color_punto: "#c084fc",
  },
  {
    valor: "geometrias_ampere",
    etiqueta: "Geometrías Clásicas de Ampère",
    color_punto: "#fbbf24",
  },
  {
    valor: "onda_electromagnetica",
    etiqueta: "Onda EM Acoplada",
    color_punto: "#38bdf8",
  },
];

export interface ControladorSimulador {
  escenario_activo: EscenarioLaboratorio;
  parametros_capacitor: ParametrosCapacitor;
  instantanea_capacitor: InstantaneaCapacitor;
  parametros_geometria: ParametrosGeometriaAmpere;
  resultado_geometria: ResultadoGeometriaAmpere;
  parametros_onda: ParametrosOndaEM;
  resultado_onda: ResultadoOndaEM;
  capas_visibles: CapasVisibles3D;
  en_reproduccion: boolean;
  velocidad_tiempo: number;
  tiempo_simulado: number;
  fase_animacion: number;
  termino_resaltado: string | null;
  preset_activo_id: string | null;
  alCambiarEscenario: (_escenario: EscenarioLaboratorio) => void;
  alCambiarCapacitor: (_parcial: Partial<ParametrosCapacitor>) => void;
  alCambiarGeometria: (_parcial: Partial<ParametrosGeometriaAmpere>) => void;
  alCambiarOnda: (_parcial: Partial<ParametrosOndaEM>) => void;
  alCambiarCapas: (_parcial: Partial<CapasVisibles3D>) => void;
  alAplicarPreset: (_preset_id: string) => PresetExperimentoFIUBA | undefined;
  alAlternarReproduccion: () => void;
  alEstablecerReproduccion: (_activo: boolean) => void;
  alCambiarVelocidad: (_velocidad: number) => void;
  alReiniciarTiempo: () => void;
  alCambiarFaseOTiempo: (_nuevo_valor: number) => void;
  alResaltarTermino: (_termino_id: string | null) => void;
}

export function useControladorSimulador(): ControladorSimulador {
  const [escenario_activo, setEscenarioActivo] =
    useState<EscenarioLaboratorio>("capacitor_paradoja");
  const [parametros_cap_base, setParametrosCapBase] =
    useState<ParametrosCapacitor>(PARAMETROS_CAPACITOR_INICIAL);
  const [parametros_geometria, setParametrosGeometria] =
    useState<ParametrosGeometriaAmpere>(PARAMETROS_GEOMETRIA_INICIAL);
  const [parametros_onda, setParametrosOnda] = useState<ParametrosOndaEM>(
    PARAMETROS_ONDA_INICIAL,
  );
  const [capas_visibles, setCapasVisibles] = useState<CapasVisibles3D>(
    CAPAS_VISIBLES_INICIAL,
  );
  const [termino_resaltado, setTerminoResaltado] = useState<string | null>(null);
  const [preset_activo_id, setPresetActivoId] = useState<string | null>(
    "fiuba-ej-5-9-paradoja",
  );

  const reloj = useRelojSimulacion({
    en_reproduccion_inicial: true,
    velocidad_inicial: 1,
    tiempo_inicial:
      PARAMETROS_CAPACITOR_INICIAL.fase_o_tiempo_norm / FRECUENCIA_VISUAL_RELOJ,
    frecuencia_angular_visual: FRECUENCIA_VISUAL_RELOJ,
  });

  const fase_o_tiempo_vivo = useMemo(() => {
    if (parametros_cap_base.modo === "transitorio_rc") {
      const avance = reloj.tiempo_simulado * VELOCIDAD_RC_VISUAL;
      const mod_rc = ((avance % 5) + 5) % 5;
      return mod_rc;
    }
    return ((reloj.fase_animacion % DOS_PI) + DOS_PI) % DOS_PI;
  }, [parametros_cap_base.modo, reloj.fase_animacion, reloj.tiempo_simulado]);

  const parametros_capacitor = useMemo<ParametrosCapacitor>(
    () => ({
      ...parametros_cap_base,
      fase_o_tiempo_norm: fase_o_tiempo_vivo,
    }),
    [parametros_cap_base, fase_o_tiempo_vivo],
  );

  const instantanea_capacitor = useMemo(
    () => calcularCapacitor(parametros_capacitor),
    [parametros_capacitor],
  );

  const resultado_geometria = useMemo(
    () => calcularGeometriaAmpere(parametros_geometria),
    [parametros_geometria],
  );

  const resultado_onda = useMemo(
    () => calcularOndaElectromagnetica(parametros_onda),
    [parametros_onda],
  );

  const alCambiarEscenario = useCallback((_escenario: EscenarioLaboratorio) => {
    setEscenarioActivo(_escenario);
    setTerminoResaltado(null);
  }, []);

  const alCambiarCapacitor = useCallback(
    (_parcial: Partial<ParametrosCapacitor>) => {
      const modo_destino = _parcial.modo ?? parametros_cap_base.modo;
      if (_parcial.fase_o_tiempo_norm !== undefined) {
        if (modo_destino === "transitorio_rc") {
          reloj.ajustarTiempo(_parcial.fase_o_tiempo_norm / VELOCIDAD_RC_VISUAL);
        } else {
          reloj.ajustarFase(_parcial.fase_o_tiempo_norm);
        }
      } else if (
        _parcial.modo !== undefined &&
        _parcial.modo !== parametros_cap_base.modo
      ) {
        if (_parcial.modo === "transitorio_rc") {
          reloj.ajustarTiempo(0.693 / VELOCIDAD_RC_VISUAL);
        } else {
          reloj.ajustarFase(Math.PI * 0.35);
        }
      }
      setParametrosCapBase((_anterior) => ({ ..._anterior, ..._parcial }));
    },
    [parametros_cap_base.modo, reloj],
  );

  const alCambiarGeometria = useCallback(
    (_parcial: Partial<ParametrosGeometriaAmpere>) => {
      setParametrosGeometria((_anterior) => ({ ..._anterior, ..._parcial }));
    },
    [],
  );

  const alCambiarOnda = useCallback((_parcial: Partial<ParametrosOndaEM>) => {
    setParametrosOnda((_anterior) => ({ ..._anterior, ..._parcial }));
  }, []);

  const alCambiarCapas = useCallback((_parcial: Partial<CapasVisibles3D>) => {
    setCapasVisibles((_anterior) => ({ ..._anterior, ..._parcial }));
  }, []);

  const alCambiarFaseOTiempo = useCallback(
    (_nuevo_valor: number) => {
      if (
        escenario_activo === "capacitor_paradoja" &&
        parametros_cap_base.modo === "transitorio_rc"
      ) {
        reloj.ajustarTiempo(
          Math.min(5, Math.max(0, _nuevo_valor)) / VELOCIDAD_RC_VISUAL,
        );
        return;
      }
      reloj.ajustarFase(_nuevo_valor);
    },
    [escenario_activo, parametros_cap_base.modo, reloj],
  );

  const alReiniciarTiempo = useCallback(() => {
    reloj.reiniciarTiempo(0);
  }, [reloj]);

  const alAplicarPreset = useCallback(
    (_preset_id: string): PresetExperimentoFIUBA | undefined => {
      const preset = obtenerPresetPorId(_preset_id);
      if (!preset) {
        return undefined;
      }

      setPresetActivoId(preset.id);
      setEscenarioActivo(preset.escenario);
      setTerminoResaltado(null);

      if (preset.parametros_capacitor) {
        const combinado: ParametrosCapacitor = {
          ...PARAMETROS_CAPACITOR_INICIAL,
          ...preset.parametros_capacitor,
        };
        setParametrosCapBase(combinado);
        if (combinado.modo === "transitorio_rc") {
          reloj.ajustarTiempo(combinado.fase_o_tiempo_norm / VELOCIDAD_RC_VISUAL);
        } else {
          reloj.ajustarFase(combinado.fase_o_tiempo_norm);
        }
      }

      if (preset.parametros_geometria) {
        setParametrosGeometria({
          ...PARAMETROS_GEOMETRIA_INICIAL,
          ...preset.parametros_geometria,
        });
      }

      if (preset.parametros_onda) {
        setParametrosOnda({
          ...PARAMETROS_ONDA_INICIAL,
          ...preset.parametros_onda,
        });
      }

      if (preset.capas_sugeridas) {
        setCapasVisibles({
          ...CAPAS_VISIBLES_INICIAL,
          ...preset.capas_sugeridas,
        });
      }

      return preset;
    },
    [reloj],
  );

  return {
    escenario_activo,
    parametros_capacitor,
    instantanea_capacitor,
    parametros_geometria,
    resultado_geometria,
    parametros_onda,
    resultado_onda,
    capas_visibles,
    en_reproduccion: reloj.en_reproduccion,
    velocidad_tiempo: reloj.velocidad_tiempo,
    tiempo_simulado: reloj.tiempo_simulado,
    fase_animacion: reloj.fase_animacion,
    termino_resaltado,
    preset_activo_id,
    alCambiarEscenario,
    alCambiarCapacitor,
    alCambiarGeometria,
    alCambiarOnda,
    alCambiarCapas,
    alAplicarPreset,
    alAlternarReproduccion: reloj.alternarReproduccion,
    alEstablecerReproduccion: reloj.establecerReproduccion,
    alCambiarVelocidad: reloj.establecerVelocidad,
    alReiniciarTiempo,
    alCambiarFaseOTiempo,
    alResaltarTermino: setTerminoResaltado,
  };
}

export interface PropiedadesModuloSimulador {
  escenario_activo: EscenarioLaboratorio;
  parametros_capacitor: ParametrosCapacitor;
  instantanea_capacitor: InstantaneaCapacitor;
  parametros_geometria: ParametrosGeometriaAmpere;
  resultado_geometria: ResultadoGeometriaAmpere;
  parametros_onda: ParametrosOndaEM;
  resultado_onda: ResultadoOndaEM;
  capas_visibles: CapasVisibles3D;
  en_reproduccion: boolean;
  velocidad_tiempo: number;
  fase_animacion: number;
  termino_resaltado?: string | null;
  preset_activo_id?: string | null;
  escena_3d: ReactNode;
  alCambiarEscenario: (_escenario: EscenarioLaboratorio) => void;
  alCambiarCapacitor: (_parcial: Partial<ParametrosCapacitor>) => void;
  alCambiarGeometria: (_parcial: Partial<ParametrosGeometriaAmpere>) => void;
  alCambiarOnda: (_parcial: Partial<ParametrosOndaEM>) => void;
  alCambiarCapas: (_parcial: Partial<CapasVisibles3D>) => void;
  alAplicarPreset: (_preset_id: string) => void;
  alAlternarReproduccion: () => void;
  alCambiarVelocidad: (_velocidad: number) => void;
  alReiniciarTiempo: () => void;
  alCambiarFaseOTiempo: (_nuevo_valor: number) => void;
  alResaltarTermino?: (_termino_id: string | null) => void;
  clase_extra?: string;
}

export function ModuloSimulador(_propiedades: PropiedadesModuloSimulador) {
  const {
    escenario_activo,
    parametros_capacitor,
    instantanea_capacitor,
    parametros_geometria,
    resultado_geometria,
    parametros_onda,
    resultado_onda,
    capas_visibles,
    en_reproduccion,
    velocidad_tiempo,
    fase_animacion,
    termino_resaltado = null,
    preset_activo_id = null,
    escena_3d,
    alCambiarEscenario,
    alCambiarCapacitor,
    alCambiarGeometria,
    alCambiarOnda,
    alCambiarCapas,
    alAplicarPreset,
    alAlternarReproduccion,
    alCambiarVelocidad,
    alReiniciarTiempo,
    alCambiarFaseOTiempo,
    alResaltarTermino,
    clase_extra,
  } = _propiedades;

  const [mostrar_respuesta_guia, setMostrarRespuestaGuia] =
    useState<boolean>(false);
  const [forzar_panel_perdidas, setForzarPanelPerdidas] =
    useState<boolean>(false);

  const presets_simulador = PRESETS_FIUBA;

  const preset_actual = useMemo(
    () => (preset_activo_id ? obtenerPresetPorId(preset_activo_id) ?? null : null),
    [preset_activo_id],
  );

  const tiene_perdidas_activas =
    (escenario_activo === "capacitor_paradoja" &&
      parametros_capacitor.conductividad_s_m > 0) ||
    (escenario_activo === "onda_electromagnetica" &&
      parametros_onda.conductividad_s_m > 0);

  const mostrar_bode_y_fasor =
    escenario_activo !== "geometrias_ampere" &&
    (tiene_perdidas_activas || forzar_panel_perdidas);

  const parametros_bode_fasor = useMemo(() => {
    if (escenario_activo === "onda_electromagnetica") {
      return {
        conductividad_s_m: parametros_onda.conductividad_s_m,
        permitividad_relativa: parametros_onda.permitividad_relativa,
        frecuencia: parametros_onda.frecuencia,
        amplitud_e0: parametros_onda.amplitud_e0,
        incluir_maxwell: parametros_onda.incluir_maxwell,
      };
    }
    return {
      conductividad_s_m: parametros_capacitor.conductividad_s_m,
      permitividad_relativa: parametros_capacitor.permitividad_relativa,
      frecuencia: parametros_capacitor.frecuencia,
      amplitud_e0:
        Math.abs(parametros_capacitor.tension_pico) /
        Math.max(parametros_capacitor.separacion_placas, 1e-6),
      incluir_maxwell: parametros_capacitor.incluir_maxwell,
    };
  }, [escenario_activo, parametros_capacitor, parametros_onda]);

  return (
    <div className={combinarClases("flex flex-col gap-5", clase_extra)}>
      {/* Barra superior: Selector de escenario + Control de reproducción temporal */}
      <div className="panel-laboratorio flex flex-col gap-3 rounded-2xl p-3.5 xl:flex-row xl:items-center xl:justify-between">
        <SelectorSegmentado
          opciones={OPCIONES_ESCENARIO}
          valor_actual={escenario_activo}
          alSeleccionar={alCambiarEscenario}
          etiqueta_aria="Seleccionar escenario del simulador 3D"
          clase_extra="w-full xl:w-auto"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-borde-panel bg-fondo-base/80 p-1">
            <button
              type="button"
              onClick={alAlternarReproduccion}
              aria-label={
                en_reproduccion ? "Pausar simulación" : "Reproducir simulación"
              }
              className={combinarClases(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                en_reproduccion
                  ? "bg-azul-activo/20 text-azul-activo hover:bg-azul-activo/30"
                  : "bg-verde-inducido/20 text-verde-inducido hover:bg-verde-inducido/30",
              )}
            >
              {en_reproduccion ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Reproducir
                </>
              )}
            </button>

            <button
              type="button"
              onClick={alReiniciarTiempo}
              title="Reiniciar tiempo de simulación"
              aria-label="Reiniciar tiempo de simulación"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-texto-secundario transition-colors hover:bg-panel hover:text-texto-principal"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          </div>

          <div
            role="group"
            aria-label="Velocidad temporal de simulación"
            className="inline-flex items-center gap-1 rounded-xl border border-borde-panel bg-fondo-base/80 p-1 font-mono text-[11px]"
          >
            {VELOCIDADES_DISPONIBLES.map((_vel) => (
              <button
                key={_vel}
                type="button"
                onClick={() => alCambiarVelocidad(_vel)}
                className={combinarClases(
                  "rounded-lg px-2 py-1 transition-colors",
                  Math.abs(velocidad_tiempo - _vel) < 0.05
                    ? "bg-morado-frontera/20 text-morado-frontera"
                    : "text-texto-secundario hover:text-texto-principal",
                )}
              >
                {_vel}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Presets Guiados FIUBA */}
      <TarjetaLaboratorio
        etiqueta_superior="Experimentos Guiados · Apuntes J. C. Fernández (FIUBA)"
        titulo="Presets de Laboratorio"
        icono={<FlaskConical className="h-4 w-4" />}
        clase_cuerpo="pt-3.5 pb-4 px-4 sm:px-5"
        acciones_derecha={
          escenario_activo !== "geometrias_ampere" && (
            <button
              type="button"
              onClick={() => setForzarPanelPerdidas((_v) => !_v)}
              className={combinarClases(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors",
                mostrar_bode_y_fasor
                  ? "border-morado-frontera/45 bg-morado-frontera/15 text-morado-frontera"
                  : "border-borde-panel bg-fondo-base/70 text-texto-secundario hover:text-texto-principal",
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              Bode y Fasor
            </button>
          )
        }
      >
        <div className="flex flex-wrap gap-2">
          {presets_simulador.map((_preset) => {
            const esta_activo = preset_activo_id === _preset.id;
            return (
              <button
                key={_preset.id}
                type="button"
                onClick={() => {
                  setMostrarRespuestaGuia(false);
                  alAplicarPreset(_preset.id);
                }}
                className={combinarClases(
                  "flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
                  esta_activo
                    ? "border-azul-activo/50 bg-azul-activo/12 text-texto-principal shadow-[0_0_20px_-8px_rgba(56,189,248,0.55)]"
                    : "border-borde-panel bg-fondo-base/65 text-texto-secundario hover:border-slate-500/60 hover:text-texto-principal",
                )}
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-azul-activo">
                  {_preset.codigo_fiuba}
                </span>
                <span className="mt-0.5 text-xs font-medium text-texto-principal">
                  {_preset.titulo}
                </span>
              </button>
            );
          })}
        </div>

        {preset_actual && (
          <div className="mt-3 rounded-xl border border-azul-activo/25 bg-azul-activo/[0.06] px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-azul-activo" />
                <div>
                  <p className="font-medium text-texto-principal">
                    <span className="font-mono text-[11px] uppercase text-azul-activo">
                      Pregunta guía:{" "}
                    </span>
                    {preset_actual.pregunta_guia}
                  </p>
                  {mostrar_respuesta_guia && (
                    <p className="mt-1.5 border-t border-azul-activo/20 pt-1.5 text-[11px] leading-relaxed text-texto-principal">
                      <span className="font-mono font-semibold uppercase text-verde-inducido">
                        Observación esperada:{" "}
                      </span>
                      {preset_actual.observacion_esperada}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarRespuestaGuia((_v) => !_v)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-azul-activo/30 bg-fondo-base/75 px-2 py-1 font-mono text-[10px] text-azul-activo transition-colors hover:bg-azul-activo/15"
              >
                {mostrar_respuesta_guia ? (
                  <>
                    Ocultar clave
                    <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Ver clave física
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </TarjetaLaboratorio>

      {/* Mesa de trabajo principal: Escena 3D + Análisis (izq) y Controles (der) */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          {/* Slot de Escena 3D interactiva */}
          <div className="panel-laboratorio-elevado relative overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde-panel px-4 py-2.5 text-xs">
              <span className="font-mono text-[11px] uppercase tracking-wider text-azul-activo">
                Visor Electromagnético 3D · Tiempo Real
              </span>
              <div className="flex items-center gap-2">
                {escenario_activo === "capacitor_paradoja" &&
                  !parametros_capacitor.incluir_maxwell && (
                    <InsigniaEstado variante="rojo" con_punto pulso>
                      Sin ∂D/∂t
                    </InsigniaEstado>
                  )}
                {escenario_activo === "onda_electromagnetica" &&
                  !parametros_onda.incluir_maxwell && (
                    <InsigniaEstado variante="rojo" con_punto pulso>
                      Onda colapsada
                    </InsigniaEstado>
                  )}
                <InsigniaEstado
                  variante={en_reproduccion ? "verde" : "neutro"}
                  con_punto
                >
                  {en_reproduccion ? `${velocidad_tiempo}× en vivo` : "Pausado"}
                </InsigniaEstado>
              </div>
            </div>
            <div className="min-h-[420px] w-full sm:min-h-[480px]">
              {escena_3d}
            </div>
          </div>

          {/* Tarjeta de la Paradoja S1 vs S2 (escenario capacitor) */}
          {escenario_activo === "capacitor_paradoja" && (
            <PanelParadojaSuperficies
              parametros={parametros_capacitor}
              instantanea={instantanea_capacitor}
              alCambiarSuperficie={(_sup) =>
                alCambiarCapacitor({ superficie_activa: _sup })
              }
              alAlternarMaxwell={(_incluir) =>
                alCambiarCapacitor({ incluir_maxwell: _incluir })
              }
            />
          )}

          {/* Pizarra viva de ecuaciones reactivas sincronizada con 3D */}
          <PizarraVivaEcuaciones
            escenario={escenario_activo}
            parametros_capacitor={parametros_capacitor}
            instantanea_capacitor={instantanea_capacitor}
            parametros_geometria={parametros_geometria}
            resultado_geometria={resultado_geometria}
            parametros_onda={parametros_onda}
            resultado_onda={resultado_onda}
            termino_resaltado={termino_resaltado}
            alResaltarTermino={alResaltarTermino}
          />

          {/* Gráfica científica del perfil radial |B(ρ)| y |H(ρ)| */}
          {escenario_activo !== "onda_electromagnetica" && (
            <GraficaPerfilRadial
              escenario={escenario_activo}
              parametros_capacitor={parametros_capacitor}
              instantanea_capacitor={instantanea_capacitor}
              parametros_geometria={parametros_geometria}
              resultado_geometria={resultado_geometria}
              alCambiarRadioLazo={(_nuevo_rho) => {
                if (escenario_activo === "capacitor_paradoja") {
                  alCambiarCapacitor({ radio_lazo: _nuevo_rho });
                } else {
                  alCambiarGeometria({ radio_lazo: _nuevo_rho });
                }
              }}
            />
          )}

          {/* Osciloscopio temporal multicanal sincronizado */}
          <OsciloscopioTemporal
            escenario={escenario_activo}
            parametros_capacitor={parametros_capacitor}
            instantanea_capacitor={instantanea_capacitor}
            parametros_geometria={parametros_geometria}
            resultado_geometria={resultado_geometria}
            parametros_onda={parametros_onda}
            resultado_onda={resultado_onda}
            fase_animacion={fase_animacion}
            alCambiarFaseOTiempo={alCambiarFaseOTiempo}
          />

          {/* Análisis de pérdidas / régimen de frecuencias (Bode + Fasor) */}
          {mostrar_bode_y_fasor && (
            <div className="grid grid-cols-1 gap-5">
              <GraficaRegimenBode
                conductividad_s_m={parametros_bode_fasor.conductividad_s_m}
                permitividad_relativa={
                  parametros_bode_fasor.permitividad_relativa
                }
                frecuencia_actual={parametros_bode_fasor.frecuencia}
                amplitud_e0={parametros_bode_fasor.amplitud_e0}
                alCambiarFrecuencia={(_nueva_f) => {
                  if (escenario_activo === "onda_electromagnetica") {
                    alCambiarOnda({
                      frecuencia: Math.min(1e11, Math.max(1e5, _nueva_f)),
                    });
                  } else {
                    alCambiarCapacitor({
                      frecuencia: Math.min(1e10, Math.max(1e3, _nueva_f)),
                    });
                  }
                }}
              />
              <DiagramaFasorial
                conductividad_s_m={parametros_bode_fasor.conductividad_s_m}
                permitividad_relativa={
                  parametros_bode_fasor.permitividad_relativa
                }
                frecuencia={parametros_bode_fasor.frecuencia}
                amplitud_e0={parametros_bode_fasor.amplitud_e0}
                fase_animacion={fase_animacion}
                incluir_maxwell={parametros_bode_fasor.incluir_maxwell}
              />
            </div>
          )}
        </div>

        {/* Columna derecha: Controles físicos */}
        <aside className="lg:sticky lg:top-20 lg:col-span-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1">
          <PanelControlesSimulador
            escenario={escenario_activo}
            parametros_capacitor={parametros_capacitor}
            instantanea_capacitor={instantanea_capacitor}
            alCambiarCapacitor={alCambiarCapacitor}
            parametros_geometria={parametros_geometria}
            resultado_geometria={resultado_geometria}
            alCambiarGeometria={alCambiarGeometria}
            parametros_onda={parametros_onda}
            resultado_onda={resultado_onda}
            alCambiarOnda={alCambiarOnda}
            capas_visibles={capas_visibles}
            alCambiarCapas={alCambiarCapas}
          />
        </aside>
      </div>
    </div>
  );
}
