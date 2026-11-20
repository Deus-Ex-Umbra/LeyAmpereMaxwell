"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Award, BookOpen, X } from "lucide-react";
import { ModuloCalculadora } from "@/componentes/calculadora";
import { ContenedorEscena3D } from "@/componentes/escenas";
import { ModuloEvaluacion } from "@/componentes/evaluacion";
import { EncabezadoLaboratorio } from "@/componentes/navegacion";
import {
  ModuloSimulador,
  useControladorSimulador,
} from "@/componentes/simulador";
import { ModuloTeoria } from "@/componentes/teoria";
import { MISIONES_INTERACTIVAS } from "@/lib/datos";
import {
  CEROS_BESSEL_J0,
  DOS_PI,
  PARAMETROS_CAPACITOR_INICIAL,
  PARAMETROS_GEOMETRIA_INICIAL,
  PERMITIVIDAD_VACIO,
  calcularCapacitor,
  calcularGeometriaAmpere,
} from "@/lib/fisica";
import type {
  EscenarioLaboratorio,
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  PestanaAplicacion,
} from "@/tipos";

const DURACION_NOTIFICACION_MS = 5500;
const TOLERANCIA_BESSEL_J0 = 0.15;
const LIMITE_INFERIOR_EQUILIBRIO = 0.85;
const LIMITE_SUPERIOR_EQUILIBRIO = 1.15;

function evaluarMisionesCumplidas(
  _escenario: EscenarioLaboratorio,
  _parametros_cap: ParametrosCapacitor,
  _parametros_geo: ParametrosGeometriaAmpere,
  _vio_paradoja_off: boolean,
): string[] {
  const cumplidas: string[] = [];

  if (_escenario === "capacitor_paradoja") {
    const instantanea = calcularCapacitor(_parametros_cap);

    if (
      _vio_paradoja_off &&
      _parametros_cap.superficie_activa === "ambas" &&
      _parametros_cap.incluir_maxwell
    ) {
      cumplidas.push("mision-paradoja-s1-s2");
    }

    if (
      _parametros_cap.modo === "alta_frecuencia_bessel" &&
      Math.abs(instantanea.argumento_bessel_borde - CEROS_BESSEL_J0[0]) <=
        TOLERANCIA_BESSEL_J0
    ) {
      cumplidas.push("mision-cero-bessel-j0");
    }

    if (
      _parametros_cap.modo === "ac_cuasiestatico" &&
      _parametros_cap.conductividad_s_m > 0
    ) {
      const omega = DOS_PI * Math.max(_parametros_cap.frecuencia, 1e-6);
      const epsilon =
        PERMITIVIDAD_VACIO * Math.max(_parametros_cap.permitividad_relativa, 1);
      const razon_sigma_omega_eps =
        _parametros_cap.conductividad_s_m / (omega * epsilon);
      if (
        razon_sigma_omega_eps >= LIMITE_INFERIOR_EQUILIBRIO &&
        razon_sigma_omega_eps <= LIMITE_SUPERIOR_EQUILIBRIO
      ) {
        cumplidas.push("mision-equilibrio-perdidas");
      }
    }

    if (instantanea.hay_ruptura_dielectrica) {
      cumplidas.push("mision-ruptura-dielectrica");
    }
  } else if (_escenario === "geometrias_ampere") {
    const resultado_geo = calcularGeometriaAmpere(_parametros_geo);
    if (
      _parametros_geo.tipo === "cable_coaxial" &&
      _parametros_geo.radio_lazo > _parametros_geo.radio_exterior &&
      Math.abs(_parametros_geo.factor_retorno_coaxial - 1) <= 1e-3 &&
      resultado_geo.esta_apantallado
    ) {
      cumplidas.push("mision-apantallamiento-coaxial");
    }
  }

  return cumplidas;
}

export function LaboratorioMaxwellApp() {
  const controlador = useControladorSimulador();
  const [pestana_activa, setPestanaActiva] =
    useState<PestanaAplicacion>("simulador");
  const [misiones_completadas, setMisionesCompletadas] = useState<string[]>([]);
  const [mision_notificada_id, setMisionNotificadaId] = useState<string | null>(
    null,
  );

  const misiones_ref = useRef<Set<string>>(new Set());
  const vio_paradoja_off_ref = useRef<boolean>(false);
  const temporizador_aviso_ref = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador_aviso_ref.current !== null) {
        window.clearTimeout(temporizador_aviso_ref.current);
      }
    };
  }, []);

  const verificarYRegistrarMisiones = useCallback(
    (
      _escenario: EscenarioLaboratorio,
      _parametros_cap: ParametrosCapacitor,
      _parametros_geo: ParametrosGeometriaAmpere,
    ) => {
      if (
        _escenario === "capacitor_paradoja" &&
        _parametros_cap.superficie_activa === "ambas" &&
        !_parametros_cap.incluir_maxwell
      ) {
        vio_paradoja_off_ref.current = true;
      }

      const ids_evaluados = evaluarMisionesCumplidas(
        _escenario,
        _parametros_cap,
        _parametros_geo,
        vio_paradoja_off_ref.current,
      );

      const nuevos_ids = ids_evaluados.filter(
        (_id) => !misiones_ref.current.has(_id),
      );

      if (nuevos_ids.length === 0) {
        return;
      }

      for (const id_nuevo of nuevos_ids) {
        misiones_ref.current.add(id_nuevo);
      }

      const lista_actualizada = Array.from(misiones_ref.current);
      setMisionesCompletadas(lista_actualizada);
      setMisionNotificadaId(nuevos_ids[nuevos_ids.length - 1]);

      if (temporizador_aviso_ref.current !== null) {
        window.clearTimeout(temporizador_aviso_ref.current);
      }
      temporizador_aviso_ref.current = window.setTimeout(() => {
        setMisionNotificadaId(null);
        temporizador_aviso_ref.current = null;
      }, DURACION_NOTIFICACION_MS);
    },
    [],
  );

  const manejarCambiarEscenario = useCallback(
    (_escenario: EscenarioLaboratorio) => {
      controlador.alCambiarEscenario(_escenario);
      verificarYRegistrarMisiones(
        _escenario,
        controlador.parametros_capacitor,
        controlador.parametros_geometria,
      );
    },
    [controlador, verificarYRegistrarMisiones],
  );

  const manejarCambiarCapacitor = useCallback(
    (_parcial: Partial<ParametrosCapacitor>) => {
      controlador.alCambiarCapacitor(_parcial);
      const siguiente_cap: ParametrosCapacitor = {
        ...controlador.parametros_capacitor,
        ..._parcial,
      };
      verificarYRegistrarMisiones(
        controlador.escenario_activo,
        siguiente_cap,
        controlador.parametros_geometria,
      );
    },
    [controlador, verificarYRegistrarMisiones],
  );

  const manejarCambiarGeometria = useCallback(
    (_parcial: Partial<ParametrosGeometriaAmpere>) => {
      controlador.alCambiarGeometria(_parcial);
      const siguiente_geo: ParametrosGeometriaAmpere = {
        ...controlador.parametros_geometria,
        ..._parcial,
      };
      verificarYRegistrarMisiones(
        controlador.escenario_activo,
        controlador.parametros_capacitor,
        siguiente_geo,
      );
    },
    [controlador, verificarYRegistrarMisiones],
  );

  const manejarAplicarPresetEnSimulador = useCallback(
    (_preset_id: string) => {
      const preset = controlador.alAplicarPreset(_preset_id);
      if (!preset) {
        return;
      }

      const siguiente_cap: ParametrosCapacitor = preset.parametros_capacitor
        ? { ...PARAMETROS_CAPACITOR_INICIAL, ...preset.parametros_capacitor }
        : controlador.parametros_capacitor;
      const siguiente_geo: ParametrosGeometriaAmpere =
        preset.parametros_geometria
          ? { ...PARAMETROS_GEOMETRIA_INICIAL, ...preset.parametros_geometria }
          : controlador.parametros_geometria;

      verificarYRegistrarMisiones(preset.escenario, siguiente_cap, siguiente_geo);
    },
    [controlador, verificarYRegistrarMisiones],
  );

  const desplazarAlInicio = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }, []);

  const manejarAbrirPreset = useCallback(
    (_preset_id: string) => {
      manejarAplicarPresetEnSimulador(_preset_id);
      setPestanaActiva("simulador");
      desplazarAlInicio();
    },
    [manejarAplicarPresetEnSimulador, desplazarAlInicio],
  );

  const manejarCambiarPestana = useCallback(
    (_pestana: PestanaAplicacion) => {
      setPestanaActiva(_pestana);
      desplazarAlInicio();
    },
    [desplazarAlInicio],
  );

  const maxwell_activo_indicador =
    controlador.escenario_activo === "capacitor_paradoja"
      ? controlador.parametros_capacitor.incluir_maxwell
      : controlador.escenario_activo === "onda_electromagnetica"
        ? controlador.parametros_onda.incluir_maxwell
        : undefined;

  const mision_notificada = mision_notificada_id
    ? MISIONES_INTERACTIVAS.find((_m) => _m.id === mision_notificada_id) ?? null
    : null;

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <EncabezadoLaboratorio
        pestana_activa={pestana_activa}
        alCambiarPestana={manejarCambiarPestana}
        misiones_completadas={misiones_completadas.length}
        total_misiones={MISIONES_INTERACTIVAS.length}
        maxwell_activo={maxwell_activo_indicador}
      />

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 sm:px-6">
        {pestana_activa === "simulador" && (
          <ModuloSimulador
            escenario_activo={controlador.escenario_activo}
            parametros_capacitor={controlador.parametros_capacitor}
            instantanea_capacitor={controlador.instantanea_capacitor}
            parametros_geometria={controlador.parametros_geometria}
            resultado_geometria={controlador.resultado_geometria}
            parametros_onda={controlador.parametros_onda}
            resultado_onda={controlador.resultado_onda}
            capas_visibles={controlador.capas_visibles}
            en_reproduccion={controlador.en_reproduccion}
            velocidad_tiempo={controlador.velocidad_tiempo}
            fase_animacion={controlador.fase_animacion}
            termino_resaltado={controlador.termino_resaltado}
            preset_activo_id={controlador.preset_activo_id}
            alCambiarEscenario={manejarCambiarEscenario}
            alCambiarCapacitor={manejarCambiarCapacitor}
            alCambiarGeometria={manejarCambiarGeometria}
            alCambiarOnda={controlador.alCambiarOnda}
            alCambiarCapas={controlador.alCambiarCapas}
            alAplicarPreset={manejarAplicarPresetEnSimulador}
            alAlternarReproduccion={controlador.alAlternarReproduccion}
            alCambiarVelocidad={controlador.alCambiarVelocidad}
            alReiniciarTiempo={controlador.alReiniciarTiempo}
            alCambiarFaseOTiempo={controlador.alCambiarFaseOTiempo}
            alResaltarTermino={controlador.alResaltarTermino}
            escena_3d={
              <ContenedorEscena3D
                escenario={controlador.escenario_activo}
                parametros_capacitor={controlador.parametros_capacitor}
                instantanea_capacitor={controlador.instantanea_capacitor}
                parametros_geometria={controlador.parametros_geometria}
                resultado_geometria={controlador.resultado_geometria}
                parametros_onda={controlador.parametros_onda}
                resultado_onda={controlador.resultado_onda}
                capas_visibles={controlador.capas_visibles}
                fase_animacion={controlador.fase_animacion}
                en_reproduccion={controlador.en_reproduccion}
                termino_resaltado={controlador.termino_resaltado}
              />
            }
          />
        )}

        {pestana_activa === "calculadora" && (
          <ModuloCalculadora alAbrirPreset={manejarAbrirPreset} />
        )}

        {pestana_activa === "teoria" && (
          <ModuloTeoria
            alAbrirPreset={manejarAbrirPreset}
            alCambiarTermino={controlador.alResaltarTermino}
          />
        )}

        {pestana_activa === "autoevaluacion" && (
          <ModuloEvaluacion
            misiones_completadas={misiones_completadas}
            alAbrirPreset={manejarAbrirPreset}
          />
        )}
      </main>

      {mision_notificada && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-40 flex max-w-sm items-start gap-3 rounded-2xl border border-verde-inducido/45 bg-fondo-elevado/95 p-4 shadow-[0_20px_48px_-12px_rgba(2,6,23,0.92)] claro:shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)] backdrop-blur-xl"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-verde-inducido/40 bg-verde-inducido/15 text-verde-inducido">
            <Award className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-verde-inducido">
              Misión completada ({misiones_completadas.length}/
              {MISIONES_INTERACTIVAS.length})
            </p>
            <p className="mt-0.5 font-display text-sm font-semibold text-texto-principal">
              {mision_notificada.titulo}
            </p>
            <button
              type="button"
              onClick={() => {
                setMisionNotificadaId(null);
                manejarCambiarPestana("autoevaluacion");
              }}
              className="mt-2 font-mono text-[11px] font-medium text-azul-activo underline-offset-2 hover:underline"
            >
              Ver progreso en Autoevaluación
            </button>
          </div>
          <button
            type="button"
            aria-label="Cerrar notificación de misión"
            onClick={() => setMisionNotificadaId(null)}
            className="rounded-lg p-1 text-texto-tenue transition-colors hover:bg-panel hover:text-texto-principal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </aside>
      )}

      <footer className="mt-8 border-t border-borde-panel bg-fondo-base/75 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-4 py-4 text-xs text-texto-secundario sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen
              className="h-3.5 w-3.5 shrink-0 text-azul-activo"
              aria-hidden="true"
            />
            <span>
              Base bibliográfica: Juan C. Fernández,{" "}
              <em className="text-texto-principal">Electromagnetismo</em>{" "}
              (FIUBA, 2004 — Caps. 1, 2, 3 y 5).
            </span>
          </div>
          <p className="font-mono text-[11px] text-texto-tenue">
            3D: arrastrar para rotar · rueda para zoom · Next.js + Three.js +
            KaTeX
          </p>
        </div>
      </footer>
    </div>
  );
}
