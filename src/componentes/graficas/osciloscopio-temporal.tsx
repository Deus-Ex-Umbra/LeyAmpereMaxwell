"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { InsigniaEstado, TarjetaLaboratorio } from "@/componentes/ui";
import {
  COLORES_VECTORES,
  DOS_PI,
  calcularCapacitor,
  calcularGeometriaAmpere,
  calcularOndaElectromagnetica,
  formatearUnidadSI,
  generarSerieTemporalCapacitor,
} from "@/lib/fisica";
import { combinarClases } from "@/lib/utils";
import type {
  EscenarioLaboratorio,
  InstantaneaCapacitor,
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ParametrosOndaEM,
  ResultadoGeometriaAmpere,
  ResultadoOndaEM,
} from "@/tipos";

export interface PropiedadesOsciloscopioTemporal {
  escenario: EscenarioLaboratorio;
  parametros_capacitor?: ParametrosCapacitor;
  instantanea_capacitor?: InstantaneaCapacitor;
  parametros_geometria?: ParametrosGeometriaAmpere;
  resultado_geometria?: ResultadoGeometriaAmpere;
  parametros_onda?: ParametrosOndaEM;
  resultado_onda?: ResultadoOndaEM;
  fase_animacion: number;
  alCambiarFaseOTiempo?: (_nuevo_valor: number) => void;
  clase_extra?: string;
}

type IdCanalOsciloscopio = "ch1" | "ch2" | "ch3" | "ch4";

interface DefinicionCanal {
  id: IdCanalOsciloscopio;
  etiqueta: string;
  unidad: string;
  color: string;
  valor_actual: number;
  pico: number;
  punteado?: boolean;
  desactivado_fisico?: boolean;
}

interface PuntoOsciloscopio {
  u: number;
  tiempo_s: number;
  ch1: number;
  ch2: number;
  ch3: number;
  ch4: number;
}

const ANCHO_SVG = 680;
const ALTO_SVG = 286;
const MARGEN_IZQ = 58;
const MARGEN_DER = 26;
const MARGEN_SUP = 24;
const MARGEN_INF = 44;
const ANCHO_AREA = ANCHO_SVG - MARGEN_IZQ - MARGEN_DER;
const ALTO_AREA = ALTO_SVG - MARGEN_SUP - MARGEN_INF;
const NUM_MUESTRAS_OSCILOSCOPIO = 128;

function construirRuta(_puntos: ReadonlyArray<{ x: number; y: number }>): string {
  if (_puntos.length === 0) {
    return "";
  }
  return _puntos
    .map(
      (_p, _i) =>
        `${_i === 0 ? "M" : "L"}${_p.x.toFixed(2)},${_p.y.toFixed(2)}`,
    )
    .join(" ");
}

function normalizarAnguloPositivo(_angulo: number): number {
  const mod = _angulo % DOS_PI;
  return mod < 0 ? mod + DOS_PI : mod;
}

export function OsciloscopioTemporal(
  _propiedades: PropiedadesOsciloscopioTemporal,
) {
  const {
    escenario,
    parametros_capacitor,
    instantanea_capacitor,
    parametros_geometria,
    resultado_geometria,
    parametros_onda,
    resultado_onda,
    fase_animacion,
    alCambiarFaseOTiempo,
    clase_extra,
  } = _propiedades;

  const prefijo_id = useId().replace(/:/g, "");
  const [canales_visibles, setCanalesVisibles] = useState<
    Record<IdCanalOsciloscopio, boolean>
  >({
    ch1: true,
    ch2: true,
    ch3: true,
    ch4: true,
  });
  const [indice_sobre, setIndiceSobre] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const svg_ref = useRef<SVGSVGElement | null>(null);

  const alternarCanal = useCallback((_id: IdCanalOsciloscopio) => {
    setCanalesVisibles((_anterior) => ({ ..._anterior, [_id]: !_anterior[_id] }));
  }, []);

  const cap_modo = parametros_capacitor?.modo;
  const cap_radio_placa = parametros_capacitor?.radio_placa;
  const cap_separacion = parametros_capacitor?.separacion_placas;
  const cap_tension = parametros_capacitor?.tension_pico;
  const cap_frecuencia = parametros_capacitor?.frecuencia;
  const cap_eps_r = parametros_capacitor?.permitividad_relativa;
  const cap_mu_r = parametros_capacitor?.permeabilidad_relativa;
  const cap_sigma = parametros_capacitor?.conductividad_s_m;
  const cap_ruptura = parametros_capacitor?.campo_ruptura_v_m;
  const cap_resistencia = parametros_capacitor?.resistencia_ohm;
  const cap_dir_rc = parametros_capacitor?.direccion_rc;
  const cap_radio_lazo = parametros_capacitor?.radio_lazo;
  const cap_superficie = parametros_capacitor?.superficie_activa;
  const cap_maxwell = parametros_capacitor?.incluir_maxwell;

  // Memoiza la forma de onda del capacitor sin depender de fase_o_tiempo_norm para 60fps estables.
  const serie_capacitor = useMemo(() => {
    if (
      escenario !== "capacitor_paradoja" ||
      cap_modo === undefined ||
      cap_radio_placa === undefined ||
      cap_separacion === undefined ||
      cap_tension === undefined ||
      cap_frecuencia === undefined ||
      cap_eps_r === undefined ||
      cap_mu_r === undefined ||
      cap_sigma === undefined ||
      cap_ruptura === undefined ||
      cap_resistencia === undefined ||
      cap_dir_rc === undefined ||
      cap_radio_lazo === undefined ||
      cap_superficie === undefined ||
      cap_maxwell === undefined
    ) {
      return null;
    }
    const base_sin_fase: ParametrosCapacitor = {
      modo: cap_modo,
      radio_placa: cap_radio_placa,
      separacion_placas: cap_separacion,
      tension_pico: cap_tension,
      frecuencia: cap_frecuencia,
      permitividad_relativa: cap_eps_r,
      permeabilidad_relativa: cap_mu_r,
      conductividad_s_m: cap_sigma,
      campo_ruptura_v_m: cap_ruptura,
      resistencia_ohm: cap_resistencia,
      direccion_rc: cap_dir_rc,
      radio_lazo: cap_radio_lazo,
      superficie_activa: cap_superficie,
      incluir_maxwell: cap_maxwell,
      fase_o_tiempo_norm: 0,
    };
    return generarSerieTemporalCapacitor(base_sin_fase, NUM_MUESTRAS_OSCILOSCOPIO);
  }, [
    escenario,
    cap_modo,
    cap_radio_placa,
    cap_separacion,
    cap_tension,
    cap_frecuencia,
    cap_eps_r,
    cap_mu_r,
    cap_sigma,
    cap_ruptura,
    cap_resistencia,
    cap_dir_rc,
    cap_radio_lazo,
    cap_superficie,
    cap_maxwell,
  ]);

  const datos_osciloscopio = useMemo(() => {
    if (
      escenario === "capacitor_paradoja" &&
      parametros_capacitor &&
      serie_capacitor
    ) {
      const instantanea =
        instantanea_capacitor ?? calcularCapacitor(parametros_capacitor);
      const es_rc = parametros_capacitor.modo === "transitorio_rc";
      const tiene_perdidas =
        parametros_capacitor.modo === "ac_cuasiestatico" &&
        parametros_capacitor.conductividad_s_m > 0;
      const u_max = es_rc ? 5 : DOS_PI;
      const u_actual = es_rc
        ? Math.min(5, Math.max(0, parametros_capacitor.fase_o_tiempo_norm))
        : normalizarAnguloPositivo(parametros_capacitor.fase_o_tiempo_norm);

      const muestras: PuntoOsciloscopio[] = serie_capacitor.map((_m) => ({
        u: _m.etiqueta_eje,
        tiempo_s: _m.tiempo_s,
        ch1: _m.tension_v,
        ch2: tiene_perdidas ? _m.corriente_conduccion : _m.corriente_total,
        ch3: parametros_capacitor.incluir_maxwell ? _m.corriente_desplazamiento : 0,
        ch4: _m.campo_b_lazo,
      }));

      let pico_1 = 0;
      let pico_2 = 0;
      let pico_3 = 0;
      let pico_4 = 0;
      for (const m of muestras) {
        pico_1 = Math.max(pico_1, Math.abs(m.ch1));
        pico_2 = Math.max(pico_2, Math.abs(m.ch2));
        pico_3 = Math.max(pico_3, Math.abs(m.ch3));
        pico_4 = Math.max(pico_4, Math.abs(m.ch4));
      }
      // Comparte escala entre I_c e I_d para preservar proporciones físicas reales.
      const pico_corriente = Math.max(pico_2, pico_3, 1e-24);

      const canales: DefinicionCanal[] = [
        {
          id: "ch1",
          etiqueta: "V(t)",
          unidad: "V",
          color: COLORES_VECTORES.e,
          valor_actual: instantanea.tension_instantanea,
          pico: Math.max(pico_1, 1e-24),
        },
        {
          id: "ch2",
          etiqueta: tiene_perdidas ? "I_c(S₂)" : "I_c(S₁)",
          unidad: "A",
          color: COLORES_VECTORES.jc,
          valor_actual: tiene_perdidas
            ? instantanea.corriente_conduccion_entrehierro
            : instantanea.corriente_cable,
          pico: pico_corriente,
        },
        {
          id: "ch3",
          etiqueta: "I_d(S₂)",
          unidad: "A",
          color: COLORES_VECTORES.jd,
          valor_actual: parametros_capacitor.incluir_maxwell
            ? instantanea.corriente_desplazamiento_entrehierro
            : 0,
          pico: pico_corriente,
          punteado: true,
          desactivado_fisico: !parametros_capacitor.incluir_maxwell,
        },
        {
          id: "ch4",
          etiqueta: "B(ρ,t)",
          unidad: "T",
          color: COLORES_VECTORES.b,
          valor_actual: instantanea.campo_b_lazo,
          pico: Math.max(pico_4, 1e-24),
        },
      ];

      const etiquetas_eje_x = es_rc
        ? [
            { u: 0, texto: "0" },
            { u: 1, texto: "1τ" },
            { u: 2, texto: "2τ" },
            { u: 3, texto: "3τ" },
            { u: 4, texto: "4τ" },
            { u: 5, texto: "5τ" },
          ]
        : [
            { u: 0, texto: "0" },
            { u: Math.PI * 0.5, texto: "π/2" },
            { u: Math.PI, texto: "π" },
            { u: Math.PI * 1.5, texto: "3π/2" },
            { u: DOS_PI, texto: "2π" },
          ];

      return {
        muestras,
        canales,
        u_max,
        u_actual,
        etiquetas_eje_x,
        titulo_eje_x: es_rc
          ? `Tiempo normalizado t / τ  (τ = RC = ${formatearUnidadSI(instantanea.constante_tiempo_rc, "s").texto})`
          : `Fase temporal ωt  (T = ${formatearUnidadSI(1 / Math.max(parametros_capacitor.frecuencia, 1e-3), "s").texto})`,
        subtitulo: es_rc
          ? "Evolución transitoria RC · I_d(t) decae exponencialmente hasta el límite electrostático"
          : tiene_perdidas
            ? "Cuadratura de 90° entre I_c = GV(t) en fase e I_d = C dV/dt"
            : "Sincronización instantánea entre V(t), I_c, I_d y B(ρ,t)",
        insignia_modo: es_rc ? "RC 0 → 5τ" : "AC 0 → 2π",
      };
    }

    if (escenario === "onda_electromagnetica" && parametros_onda) {
      const resultado =
        resultado_onda ?? calcularOndaElectromagnetica(parametros_onda);
      const u_max = DOS_PI;
      const u_actual = normalizarAnguloPositivo(fase_animacion);
      const periodo = 1 / Math.max(parametros_onda.frecuencia, 1e-3);

      const muestras: PuntoOsciloscopio[] = [];
      for (let i = 0; i <= NUM_MUESTRAS_OSCILOSCOPIO; i += 1) {
        const u = (i / NUM_MUESTRAS_OSCILOSCOPIO) * DOS_PI;
        const ev = resultado.evaluarEnPosicion(0, u);
        muestras.push({
          u,
          tiempo_s: (i / NUM_MUESTRAS_OSCILOSCOPIO) * periodo,
          ch1: ev.campo_e.y,
          ch2: ev.campo_h.z,
          ch3: ev.campo_b.z,
          ch4: ev.poynting_n.x,
        });
      }

      const actual = resultado.evaluarEnPosicion(0, u_actual);
      let pico_1 = 0;
      let pico_2 = 0;
      let pico_3 = 0;
      let pico_4 = 0;
      for (const m of muestras) {
        pico_1 = Math.max(pico_1, Math.abs(m.ch1));
        pico_2 = Math.max(pico_2, Math.abs(m.ch2));
        pico_3 = Math.max(pico_3, Math.abs(m.ch3));
        pico_4 = Math.max(pico_4, Math.abs(m.ch4));
      }

      const canales: DefinicionCanal[] = [
        {
          id: "ch1",
          etiqueta: "E_y(0,t)",
          unidad: "V/m",
          color: COLORES_VECTORES.e,
          valor_actual: actual.campo_e.y,
          pico: Math.max(pico_1, 1e-24),
        },
        {
          id: "ch2",
          etiqueta: "H_z(0,t)",
          unidad: "A/m",
          color: "#fb923c",
          valor_actual: actual.campo_h.z,
          pico: Math.max(pico_2, 1e-24),
          desactivado_fisico: !resultado.propagacion_activa,
        },
        {
          id: "ch3",
          etiqueta: "B_z(0,t)",
          unidad: "T",
          color: COLORES_VECTORES.b,
          valor_actual: actual.campo_b.z,
          pico: Math.max(pico_3, 1e-24),
          punteado: true,
          desactivado_fisico: !resultado.propagacion_activa,
        },
        {
          id: "ch4",
          etiqueta: "N_x(0,t)",
          unidad: "W/m²",
          color: COLORES_VECTORES.n,
          valor_actual: actual.poynting_n.x,
          pico: Math.max(pico_4, 1e-24),
          desactivado_fisico: !resultado.propagacion_activa,
        },
      ];

      return {
        muestras,
        canales,
        u_max,
        u_actual,
        etiquetas_eje_x: [
          { u: 0, texto: "0" },
          { u: Math.PI * 0.5, texto: "π/2" },
          { u: Math.PI, texto: "π" },
          { u: Math.PI * 1.5, texto: "3π/2" },
          { u: DOS_PI, texto: "2π" },
        ],
        titulo_eje_x: `Fase temporal ωt en x = 0  (T = ${formatearUnidadSI(periodo, "s").texto})`,
        subtitulo: resultado.propagacion_activa
          ? `Acoplamiento E_y–H_z · desfasaje θ_η = ${resultado.desfasaje_h_atraso_grados.toFixed(1)}°`
          : "Sin ∂D/∂t: H_z = 0 y N_x = 0 (no existe onda electromagnética)",
        insignia_modo: resultado.propagacion_activa ? "Onda activa" : "Colapsada",
      };
    }

    if (escenario === "geometrias_ampere" && parametros_geometria) {
      const resultado =
        resultado_geometria ?? calcularGeometriaAmpere(parametros_geometria);
      const u_max = DOS_PI;
      const u_actual = normalizarAnguloPositivo(fase_animacion);
      const muestras: PuntoOsciloscopio[] = [];
      for (let i = 0; i <= 64; i += 1) {
        const u = (i / 64) * DOS_PI;
        muestras.push({
          u,
          tiempo_s: u,
          ch1: resultado.corriente_encerrada,
          ch2: 0,
          ch3: resultado.campo_h,
          ch4: resultado.campo_b,
        });
      }

      const canales: DefinicionCanal[] = [
        {
          id: "ch1",
          etiqueta: "I_enc",
          unidad: "A",
          color: COLORES_VECTORES.jc,
          valor_actual: resultado.corriente_encerrada,
          pico: Math.max(Math.abs(resultado.corriente_encerrada), 1),
        },
        {
          id: "ch2",
          etiqueta: "I_d = ∂Φ_D/∂t",
          unidad: "A",
          color: COLORES_VECTORES.jd,
          valor_actual: 0,
          pico: 1,
          punteado: true,
        },
        {
          id: "ch3",
          etiqueta: "H(ρ)",
          unidad: "A/m",
          color: "#fb923c",
          valor_actual: resultado.campo_h,
          pico: Math.max(Math.abs(resultado.campo_h), 1e-12),
        },
        {
          id: "ch4",
          etiqueta: "B(ρ)",
          unidad: "T",
          color: COLORES_VECTORES.b,
          valor_actual: resultado.campo_b,
          pico: Math.max(Math.abs(resultado.campo_b), 1e-12),
        },
      ];

      return {
        muestras,
        canales,
        u_max,
        u_actual,
        etiquetas_eje_x: [
          { u: 0, texto: "0" },
          { u: Math.PI, texto: "t₁" },
          { u: DOS_PI, texto: "t₂" },
        ],
        titulo_eje_x: "Régimen magnetostático estacionario (∂/∂t = 0)",
        subtitulo: "Corrientes estacionarias DC: I_d = 0 y campos constantes en el tiempo",
        insignia_modo: "Magnetostática DC",
      };
    }

    return null;
  }, [
    escenario,
    parametros_capacitor,
    instantanea_capacitor,
    serie_capacitor,
    parametros_geometria,
    resultado_geometria,
    parametros_onda,
    resultado_onda,
    fase_animacion,
  ]);

  const uDesdePuntero = useCallback(
    (_cliente_x: number): number | null => {
      if (!svg_ref.current || !datos_osciloscopio) {
        return null;
      }
      const rect = svg_ref.current.getBoundingClientRect();
      if (rect.width <= 0) {
        return null;
      }
      const x_svg = ((_cliente_x - rect.left) / rect.width) * ANCHO_SVG;
      const fraccion = Math.min(1, Math.max(0, (x_svg - MARGEN_IZQ) / ANCHO_AREA));
      return fraccion * datos_osciloscopio.u_max;
    },
    [datos_osciloscopio],
  );

  const manejarPointerDown = useCallback(
    (_evento: React.PointerEvent<SVGSVGElement>) => {
      if (!alCambiarFaseOTiempo || !datos_osciloscopio || escenario === "geometrias_ampere") {
        return;
      }
      const u_clic = uDesdePuntero(_evento.clientX);
      if (u_clic === null) {
        return;
      }
      _evento.currentTarget.setPointerCapture(_evento.pointerId);
      setArrastrando(true);
      alCambiarFaseOTiempo(u_clic);
    },
    [alCambiarFaseOTiempo, datos_osciloscopio, escenario, uDesdePuntero],
  );

  const manejarPointerMove = useCallback(
    (_evento: React.PointerEvent<SVGSVGElement>) => {
      if (!datos_osciloscopio) {
        return;
      }
      const u_actual = uDesdePuntero(_evento.clientX);
      if (u_actual === null) {
        return;
      }
      const idx = Math.round(
        (u_actual / datos_osciloscopio.u_max) * (datos_osciloscopio.muestras.length - 1),
      );
      setIndiceSobre(Math.min(datos_osciloscopio.muestras.length - 1, Math.max(0, idx)));
      if (arrastrando && alCambiarFaseOTiempo && escenario !== "geometrias_ampere") {
        alCambiarFaseOTiempo(u_actual);
      }
    },
    [arrastrando, alCambiarFaseOTiempo, datos_osciloscopio, escenario, uDesdePuntero],
  );

  const manejarPointerUp = useCallback(
    (_evento: React.PointerEvent<SVGSVGElement>) => {
      if (arrastrando) {
        setArrastrando(false);
        if (_evento.currentTarget.hasPointerCapture(_evento.pointerId)) {
          _evento.currentTarget.releasePointerCapture(_evento.pointerId);
        }
      }
    },
    [arrastrando],
  );

  if (!datos_osciloscopio) {
    return null;
  }

  const y_cero = MARGEN_SUP + ALTO_AREA * 0.5;
  const semialtura = ALTO_AREA * 0.44;
  const xDeU = (_u: number): number =>
    MARGEN_IZQ + Math.min(1, Math.max(0, _u / datos_osciloscopio.u_max)) * ANCHO_AREA;
  const yNormalizado = (_valor: number, _pico: number): number => {
    const norm = _pico > 1e-30 ? Math.max(-1, Math.min(1, _valor / _pico)) : 0;
    return y_cero - norm * semialtura;
  };

  const x_cursor = xDeU(datos_osciloscopio.u_actual);
  const muestra_sobre =
    indice_sobre !== null ? datos_osciloscopio.muestras[indice_sobre] : null;
  const x_sobre = muestra_sobre ? xDeU(muestra_sobre.u) : 0;
  const globo_izquierda = x_sobre > MARGEN_IZQ + ANCHO_AREA * 0.6;

  return (
    <TarjetaLaboratorio
      etiqueta_superior="Osciloscopio Multicanal"
      titulo="Evolución Temporal Sincronizada"
      subtitulo={datos_osciloscopio.subtitulo}
      icono={<Radio className="h-4 w-4" />}
      clase_extra={clase_extra}
      acciones_derecha={
        <InsigniaEstado variante="azul" con_punto>
          {datos_osciloscopio.insignia_modo}
        </InsigniaEstado>
      }
    >
      {/* Barra de lectura instantánea y conmutación de canales */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {datos_osciloscopio.canales.map((_canal) => {
          const activo = canales_visibles[_canal.id];
          return (
            <button
              key={_canal.id}
              type="button"
              onClick={() => alternarCanal(_canal.id)}
              aria-pressed={activo}
              className={combinarClases(
                "flex flex-col rounded-xl border px-2.5 py-1.5 text-left transition-colors",
                activo
                  ? "border-slate-600/60 bg-fondo-base/85"
                  : "border-borde-panel bg-fondo-base/40 opacity-45 hover:opacity-75",
              )}
            >
              <span className="flex items-center justify-between gap-1 text-[10px] font-medium text-texto-secundario">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: _canal.color }}
                  />
                  <span className="font-mono">{_canal.etiqueta}</span>
                </span>
                {_canal.desactivado_fisico && (
                  <span className="rounded bg-rojo-anulado/15 px-1 text-[9px] text-rojo-anulado">
                    OFF
                  </span>
                )}
              </span>
              <span
                className="mt-0.5 truncate font-mono text-xs font-semibold tabular-nums"
                style={{ color: activo ? _canal.color : "#94a3b8" }}
              >
                {
                  formatearUnidadSI(_canal.valor_actual, _canal.unidad, {
                    decimales: 2,
                    mostrar_signo: true,
                  }).texto
                }
              </span>
            </button>
          );
        })}
      </div>

      {/* Pantalla SVG del osciloscopio */}
      <div className="relative overflow-hidden rounded-xl border border-borde-panel bg-[#060a13]">
        <svg
          ref={svg_ref}
          viewBox={`0 0 ${ANCHO_SVG} ${ALTO_SVG}`}
          role="img"
          aria-label="Osciloscopio temporal sincronizado de tensión, corrientes y campos"
          onPointerDown={manejarPointerDown}
          onPointerMove={manejarPointerMove}
          onPointerUp={manejarPointerUp}
          onPointerCancel={manejarPointerUp}
          onPointerLeave={() => {
            if (!arrastrando) {
              setIndiceSobre(null);
            }
          }}
          className={combinarClases(
            "block h-auto w-full select-none touch-none",
            alCambiarFaseOTiempo && escenario !== "geometrias_ampere"
              ? arrastrando
                ? "cursor-grabbing"
                : "cursor-ew-resize"
              : "cursor-crosshair",
          )}
        >
          <defs>
            <clipPath id={`${prefijo_id}-clip-scope`}>
              <rect
                x={MARGEN_IZQ}
                y={MARGEN_SUP}
                width={ANCHO_AREA}
                height={ALTO_AREA}
              />
            </clipPath>
          </defs>

          <rect
            x={MARGEN_IZQ}
            y={MARGEN_SUP}
            width={ANCHO_AREA}
            height={ALTO_AREA}
            fill="#070e1c"
            stroke="rgba(148,163,184,0.22)"
            strokeWidth={1}
          />

          {/* Rejilla horizontal normalizada (-1, -0.5, 0, +0.5, +1) */}
          {[-1, -0.5, 0, 0.5, 1].map((_nivel) => {
            const y = y_cero - _nivel * semialtura;
            const es_cero = _nivel === 0;
            return (
              <g key={`h-${_nivel}`}>
                <line
                  x1={MARGEN_IZQ}
                  y1={y}
                  x2={MARGEN_IZQ + ANCHO_AREA}
                  y2={y}
                  stroke={es_cero ? "rgba(148,163,184,0.34)" : "rgba(148,163,184,0.11)"}
                  strokeWidth={es_cero ? 1.1 : 0.8}
                  strokeDasharray={es_cero ? undefined : "3 3"}
                />
                <text
                  x={MARGEN_IZQ - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize={9.5}
                  fontFamily="var(--font-mono), monospace"
                >
                  {_nivel > 0 ? `+${_nivel.toFixed(1)}` : _nivel.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Rejilla vertical y marcas de fase/tiempo */}
          {datos_osciloscopio.etiquetas_eje_x.map((_marca) => {
            const x = xDeU(_marca.u);
            return (
              <g key={`x-${_marca.texto}`}>
                <line
                  x1={x}
                  y1={MARGEN_SUP}
                  x2={x}
                  y2={MARGEN_SUP + ALTO_AREA}
                  stroke="rgba(148,163,184,0.12)"
                  strokeWidth={0.9}
                />
                <text
                  x={x}
                  y={MARGEN_SUP + ALTO_AREA + 16}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={9.5}
                  fontFamily="var(--font-mono), monospace"
                >
                  {_marca.texto}
                </text>
              </g>
            );
          })}

          <text
            x={MARGEN_IZQ + ANCHO_AREA * 0.5}
            y={ALTO_SVG - 8}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize={10.5}
            fontFamily="var(--font-mono), monospace"
          >
            {datos_osciloscopio.titulo_eje_x}
          </text>
          <text
            x={14}
            y={MARGEN_SUP + ALTO_AREA * 0.5}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            fontFamily="var(--font-mono), monospace"
            transform={`rotate(-90 14 ${MARGEN_SUP + ALTO_AREA * 0.5})`}
          >
            Amplitud norm.
          </text>

          {/* Trazas multicanal */}
          <g clipPath={`url(#${prefijo_id}-clip-scope)`}>
            {datos_osciloscopio.canales.map((_canal) => {
              if (!canales_visibles[_canal.id]) {
                return null;
              }
              const pts = datos_osciloscopio.muestras.map((_m) => ({
                x: xDeU(_m.u),
                y: yNormalizado(_m[_canal.id], _canal.pico),
              }));
              return (
                <path
                  key={_canal.id}
                  d={construirRuta(pts)}
                  fill="none"
                  stroke={_canal.color}
                  strokeWidth={_canal.desactivado_fisico ? 1.4 : 2.1}
                  strokeOpacity={_canal.desactivado_fisico ? 0.45 : 0.95}
                  strokeDasharray={
                    _canal.desactivado_fisico
                      ? "3 5"
                      : _canal.punteado
                        ? "6 3.5"
                        : undefined
                  }
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Línea vertical móvil en el instante actual t */}
          <g>
            <line
              x1={x_cursor}
              y1={MARGEN_SUP}
              x2={x_cursor}
              y2={MARGEN_SUP + ALTO_AREA}
              stroke="#facc15"
              strokeWidth={1.6}
            />
            {datos_osciloscopio.canales.map((_canal) => {
              if (!canales_visibles[_canal.id]) {
                return null;
              }
              const y_pt = yNormalizado(_canal.valor_actual, _canal.pico);
              return (
                <circle
                  key={`dot-${_canal.id}`}
                  cx={x_cursor}
                  cy={y_pt}
                  r={4}
                  fill={_canal.color}
                  stroke="#060a13"
                  strokeWidth={1.4}
                />
              );
            })}
          </g>

          {/* Tooltip interactivo al pasar el mouse */}
          {muestra_sobre && (
            <g pointerEvents="none">
              <line
                x1={x_sobre}
                y1={MARGEN_SUP}
                x2={x_sobre}
                y2={MARGEN_SUP + ALTO_AREA}
                stroke="rgba(241,245,249,0.35)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <g
                transform={`translate(${
                  globo_izquierda ? x_sobre - 196 : x_sobre + 12
                }, ${MARGEN_SUP + 10})`}
              >
                <rect
                  x={0}
                  y={0}
                  width={184}
                  height={86}
                  rx={8}
                  fill="rgba(11, 18, 34, 0.95)"
                  stroke="rgba(56, 189, 248, 0.4)"
                  strokeWidth={1}
                />
                <text
                  x={10}
                  y={16}
                  fill="#f8fafc"
                  fontSize={9.5}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  t = {formatearUnidadSI(muestra_sobre.tiempo_s, "s").texto}
                </text>
                {datos_osciloscopio.canales.map((_canal, _idx) => (
                  <text
                    key={`tt-${_canal.id}`}
                    x={10}
                    y={32 + _idx * 14}
                    fill={_canal.color}
                    fontSize={9.5}
                    fontFamily="var(--font-mono), monospace"
                  >
                    {_canal.etiqueta}:{" "}
                    {
                      formatearUnidadSI(muestra_sobre[_canal.id], _canal.unidad, {
                        decimales: 2,
                        mostrar_signo: true,
                      }).texto
                    }
                  </text>
                ))}
              </g>
            </g>
          )}
        </svg>
      </div>
    </TarjetaLaboratorio>
  );
}
