"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useTemaLaboratorio } from "@/contextos";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { InsigniaEstado, TarjetaLaboratorio } from "@/componentes/ui";
import {
  COLORES_VECTORES,
  DOS_PI,
  PERMITIVIDAD_VACIO,
  clasificarRegimenConduccion,
  formatearUnidadSI,
  generarCurvaFrecuenciaRegimen,
} from "@/lib/fisica";
import { combinarClases } from "@/lib/utils";
import type { RegimenConduccion } from "@/tipos";

export interface PropiedadesGraficaRegimenBode {
  conductividad_s_m: number;
  permitividad_relativa: number;
  frecuencia_actual: number;
  amplitud_e0?: number;
  alCambiarFrecuencia?: (_nueva_frecuencia: number) => void;
  clase_extra?: string;
}

const ANCHO_SVG = 640;
const ALTO_SVG = 296;
const MARGEN_IZQ = 70;
const MARGEN_DER = 26;
const MARGEN_SUP = 28;
const MARGEN_INF = 48;
const ANCHO_AREA = ANCHO_SVG - MARGEN_IZQ - MARGEN_DER;
const ALTO_AREA = ALTO_SVG - MARGEN_SUP - MARGEN_INF;
const SUBMARCAS_LOG = [2, 3, 5] as const;

function etiquetaRegimen(_regimen: RegimenConduccion): {
  texto: string;
  variante: "ambar" | "morado" | "azul";
} {
  if (_regimen === "buen_conductor") {
    return { texto: "Zona Conductora", variante: "ambar" };
  }
  if (_regimen === "transicion") {
    return { texto: "Zona de Transición", variante: "morado" };
  }
  return { texto: "Zona Dieléctrica", variante: "azul" };
}

function formatearPotenciaDiez(_exp: number): string {
  const superindices: Record<string, string> = {
    "-": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  const texto_exp = Math.round(_exp)
    .toString()
    .split("")
    .map((_c) => superindices[_c] ?? _c)
    .join("");
  return `10${texto_exp}`;
}

export function GraficaRegimenBode(
  _propiedades: PropiedadesGraficaRegimenBode,
) {
  const {
    conductividad_s_m,
    permitividad_relativa,
    frecuencia_actual,
    amplitud_e0 = 1,
    alCambiarFrecuencia,
    clase_extra,
  } = _propiedades;

  const { es_claro } = useTemaLaboratorio();
  const prefijo_id = useId().replace(/:/g, "");
  const [log_f_sobre, setLogFSobre] = useState<number | null>(null);
  const svg_ref = useRef<SVGSVGElement | null>(null);
  const color_jc = es_claro ? "#d97706" : COLORES_VECTORES.jc;
  const color_jd = es_claro ? "#0284c7" : COLORES_VECTORES.jd;
  const color_cruce = es_claro ? "#047857" : "#34d399";
  const color_cursor_f = es_claro ? "#b45309" : "#facc15";

  const modelo = useMemo(() => {
    const sigma = Math.max(conductividad_s_m, 0);
    const eps_r = Math.max(permitividad_relativa, 1);
    const e0 = Math.max(Math.abs(amplitud_e0), 1e-6);
    const f_actual = Math.max(frecuencia_actual, 1e-3);
    const epsilon = PERMITIVIDAD_VACIO * eps_r;
    const frecuencia_cruce = sigma > 0 ? sigma / (DOS_PI * epsilon) : 0;

    const log_f_actual = Math.log10(f_actual);
    const tiene_cruce = frecuencia_cruce > 0 && Number.isFinite(frecuencia_cruce);
    const log_fc = tiene_cruce ? Math.log10(frecuencia_cruce) : log_f_actual;

    const centro = tiene_cruce ? 0.5 * (log_fc + log_f_actual) : log_f_actual;
    let log_f_min = Math.floor(Math.min(log_f_actual - 2.5, log_fc - 3.5, centro - 5));
    let log_f_max = Math.ceil(Math.max(log_f_actual + 2.5, log_fc + 3.5, centro + 5));
    if (log_f_max - log_f_min < 8) {
      log_f_min -= 2;
      log_f_max += 2;
    }
    if (log_f_max - log_f_min > 14) {
      log_f_min = Math.floor(log_fc - 6);
      log_f_max = Math.ceil(log_fc + 6);
      if (log_f_actual < log_f_min + 1) log_f_min = Math.floor(log_f_actual - 1);
      if (log_f_actual > log_f_max - 1) log_f_max = Math.ceil(log_f_actual + 1);
    }

    const curva = generarCurvaFrecuenciaRegimen(
      sigma,
      eps_r,
      log_f_min,
      log_f_max,
      110,
    );

    const jd_min_val = curva[0].modulo_omega_epsilon * e0;
    const jd_max_val = curva[curva.length - 1].modulo_omega_epsilon * e0;
    const jc_val = sigma * e0;

    const candidatos_y = [
      Math.log10(Math.max(jd_min_val, 1e-30)),
      Math.log10(Math.max(jd_max_val, 1e-30)),
    ];
    if (jc_val > 0) {
      candidatos_y.push(Math.log10(jc_val));
    }

    let log_y_min = Math.floor(Math.min(...candidatos_y)) - 1;
    let log_y_max = Math.ceil(Math.max(...candidatos_y)) + 1;
    if (log_y_max - log_y_min < 4) {
      log_y_min -= 1;
      log_y_max += 1;
    }

    const jd_actual = DOS_PI * f_actual * epsilon * e0;
    const tangente_actual = jd_actual > 0 ? jc_val / jd_actual : 0;
    const regimen_actual = clasificarRegimenConduccion(tangente_actual);

    return {
      sigma,
      e0,
      epsilon,
      f_actual,
      log_f_actual,
      frecuencia_cruce,
      tiene_cruce,
      log_fc,
      log_f_min,
      log_f_max,
      log_y_min,
      log_y_max,
      curva,
      jc_val,
      jd_actual,
      tangente_actual,
      regimen_actual,
    };
  }, [conductividad_s_m, permitividad_relativa, frecuencia_actual, amplitud_e0]);

  const logFDesdePuntero = useCallback(
    (_cliente_x: number): number | null => {
      if (!svg_ref.current) {
        return null;
      }
      const rect = svg_ref.current.getBoundingClientRect();
      if (rect.width <= 0) {
        return null;
      }
      const x_svg = ((_cliente_x - rect.left) / rect.width) * ANCHO_SVG;
      const frac = Math.min(1, Math.max(0, (x_svg - MARGEN_IZQ) / ANCHO_AREA));
      return modelo.log_f_min + frac * (modelo.log_f_max - modelo.log_f_min);
    },
    [modelo.log_f_min, modelo.log_f_max],
  );

  const xDeLogF = (_lf: number): number =>
    MARGEN_IZQ +
    ((_lf - modelo.log_f_min) / Math.max(1, modelo.log_f_max - modelo.log_f_min)) *
      ANCHO_AREA;

  const yDeLogJ = (_lj: number): number =>
    MARGEN_SUP +
    ALTO_AREA -
    ((_lj - modelo.log_y_min) / Math.max(1, modelo.log_y_max - modelo.log_y_min)) *
      ALTO_AREA;

  const y_base = MARGEN_SUP + ALTO_AREA;

  const decadas_x: number[] = [];
  const paso_decada_x = modelo.log_f_max - modelo.log_f_min > 10 ? 2 : 1;
  for (let e = Math.ceil(modelo.log_f_min); e <= Math.floor(modelo.log_f_max); e += 1) {
    decadas_x.push(e);
  }

  const decadas_y: number[] = [];
  const paso_decada_y = modelo.log_y_max - modelo.log_y_min > 8 ? 2 : 1;
  for (let e = Math.ceil(modelo.log_y_min); e <= Math.floor(modelo.log_y_max); e += 1) {
    decadas_y.push(e);
  }

  const ruta_jd = modelo.curva
    .map((_p, _i) => {
      const x = xDeLogF(_p.log10_frecuencia);
      const y = yDeLogJ(Math.log10(Math.max(_p.modulo_omega_epsilon * modelo.e0, 1e-30)));
      return `${_i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const y_jc = modelo.jc_val > 0 ? yDeLogJ(Math.log10(modelo.jc_val)) : null;

  const x_fc = modelo.tiene_cruce ? xDeLogF(modelo.log_fc) : null;
  const x_zona_cond_fin = modelo.tiene_cruce
    ? Math.max(MARGEN_IZQ, Math.min(MARGEN_IZQ + ANCHO_AREA, xDeLogF(modelo.log_fc - 1)))
    : MARGEN_IZQ;
  const x_zona_diel_ini = modelo.tiene_cruce
    ? Math.max(MARGEN_IZQ, Math.min(MARGEN_IZQ + ANCHO_AREA, xDeLogF(modelo.log_fc + 1)))
    : MARGEN_IZQ;

  const x_actual = xDeLogF(modelo.log_f_actual);
  const y_jd_actual = yDeLogJ(Math.log10(Math.max(modelo.jd_actual, 1e-30)));

  const datos_sobre = useMemo(() => {
    if (log_f_sobre === null) {
      return null;
    }
    const f_h = Math.pow(10, log_f_sobre);
    const jd_h = DOS_PI * f_h * modelo.epsilon * modelo.e0;
    const jc_h = modelo.jc_val;
    const tan_h = jd_h > 0 ? jc_h / jd_h : 0;
    return {
      frecuencia: f_h,
      log_f: log_f_sobre,
      jc: jc_h,
      jd: jd_h,
      tangente: tan_h,
      regimen: clasificarRegimenConduccion(tan_h),
    };
  }, [log_f_sobre, modelo.epsilon, modelo.e0, modelo.jc_val]);

  const x_sobre = datos_sobre ? xDeLogF(datos_sobre.log_f) : 0;
  const globo_izquierda = x_sobre > MARGEN_IZQ + ANCHO_AREA * 0.58;
  const insignia_regimen = etiquetaRegimen(modelo.regimen_actual);

  return (
    <TarjetaLaboratorio
      etiqueta_superior="Espectro de Régimen (Ej. 3-7 · Prob. 5.8)"
      titulo="Diagrama Log-Log: Conducción vs Desplazamiento"
      subtitulo={
        modelo.tiene_cruce
          ? `Frecuencia de cruce f_c = σ / (2πε) = ${formatearUnidadSI(modelo.frecuencia_cruce, "Hz").texto}`
          : "Dieléctrico sin pérdidas (σ = 0): domina J_d = ωεE en todo el espectro"
      }
      icono={<TrendingUp className="h-4 w-4" />}
      clase_extra={clase_extra}
      acciones_derecha={
        <InsigniaEstado variante={insignia_regimen.variante} con_punto>
          {insignia_regimen.texto}
        </InsigniaEstado>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-texto-principal">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: color_jc }}
            />
            <FormulaKatex expresion="|J_c| = \sigma E" />
            <span className="text-texto-secundario">
              = {formatearUnidadSI(modelo.jc_val, "A/m²").texto}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-texto-principal">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: color_jd }}
            />
            <FormulaKatex expresion="|J_d| = \omega\varepsilon E" />
            <span className="text-texto-secundario">
              = {formatearUnidadSI(modelo.jd_actual, "A/m²").texto}
            </span>
          </span>
        </div>

        <span className="font-mono text-[11px] text-texto-secundario">
          tan δ = {modelo.tangente_actual < 0.001 || modelo.tangente_actual > 1e4
            ? modelo.tangente_actual.toExponential(2)
            : modelo.tangente_actual.toFixed(3)}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-borde-panel bg-fondo-base">
        <svg
          ref={svg_ref}
          viewBox={`0 0 ${ANCHO_SVG} ${ALTO_SVG}`}
          role={alCambiarFrecuencia ? "slider" : "img"}
          tabIndex={alCambiarFrecuencia ? 0 : undefined}
          aria-label="Diagrama log-log comparando densidad de corriente de conducción y desplazamiento en función de la frecuencia"
          aria-valuemin={alCambiarFrecuencia ? modelo.log_f_min : undefined}
          aria-valuemax={alCambiarFrecuencia ? modelo.log_f_max : undefined}
          aria-valuenow={
            alCambiarFrecuencia
              ? Number(modelo.log_f_actual.toFixed(2))
              : undefined
          }
          onPointerMove={(_evento) => {
            const lf = logFDesdePuntero(_evento.clientX);
            setLogFSobre(lf);
          }}
          onPointerLeave={() => setLogFSobre(null)}
          onClick={(_evento) => {
            if (!alCambiarFrecuencia) {
              return;
            }
            const lf = logFDesdePuntero(_evento.clientX);
            if (lf !== null) {
              alCambiarFrecuencia(Math.pow(10, lf));
            }
          }}
          onKeyDown={(_evento) => {
            if (!alCambiarFrecuencia) {
              return;
            }
            if (_evento.key === "ArrowRight" || _evento.key === "ArrowUp") {
              _evento.preventDefault();
              const siguiente_log = Math.min(
                modelo.log_f_max,
                modelo.log_f_actual + 0.2,
              );
              alCambiarFrecuencia(Math.pow(10, siguiente_log));
            } else if (
              _evento.key === "ArrowLeft" ||
              _evento.key === "ArrowDown"
            ) {
              _evento.preventDefault();
              const siguiente_log = Math.max(
                modelo.log_f_min,
                modelo.log_f_actual - 0.2,
              );
              alCambiarFrecuencia(Math.pow(10, siguiente_log));
            }
          }}
          className={combinarClases(
            "block h-auto w-full select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
            alCambiarFrecuencia ? "cursor-pointer" : "cursor-crosshair",
          )}
        >
          <defs>
            <clipPath id={`${prefijo_id}-clip-bode`}>
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
            fill={es_claro ? "#ffffff" : "#091020"}
            stroke={es_claro ? "rgba(15,23,42,0.16)" : "rgba(148,163,184,0.22)"}
            strokeWidth={1}
          />

          {/* Zonas conductora, transición y dieléctrica */}
          {modelo.tiene_cruce ? (
            <g clipPath={`url(#${prefijo_id}-clip-bode)`}>
              <rect
                x={MARGEN_IZQ}
                y={MARGEN_SUP}
                width={Math.max(0, x_zona_cond_fin - MARGEN_IZQ)}
                height={ALTO_AREA}
                fill={
                  es_claro
                    ? "rgba(217, 119, 6, 0.08)"
                    : "rgba(251, 191, 36, 0.08)"
                }
              />
              <rect
                x={x_zona_cond_fin}
                y={MARGEN_SUP}
                width={Math.max(0, x_zona_diel_ini - x_zona_cond_fin)}
                height={ALTO_AREA}
                fill={
                  es_claro
                    ? "rgba(124, 58, 237, 0.08)"
                    : "rgba(168, 85, 247, 0.09)"
                }
              />
              <rect
                x={x_zona_diel_ini}
                y={MARGEN_SUP}
                width={Math.max(0, MARGEN_IZQ + ANCHO_AREA - x_zona_diel_ini)}
                height={ALTO_AREA}
                fill={
                  es_claro
                    ? "rgba(2, 132, 199, 0.07)"
                    : "rgba(56, 189, 248, 0.06)"
                }
              />
              {x_zona_cond_fin - MARGEN_IZQ > 68 && (
                <text
                  x={MARGEN_IZQ + (x_zona_cond_fin - MARGEN_IZQ) * 0.5}
                  y={MARGEN_SUP + 14}
                  textAnchor="middle"
                  fill={color_jc}
                  fontSize={9.5}
                  fontFamily="var(--font-mono), monospace"
                >
                  Conductor (σ ≫ ωε)
                </text>
              )}
              {MARGEN_IZQ + ANCHO_AREA - x_zona_diel_ini > 68 && (
                <text
                  x={
                    x_zona_diel_ini +
                    (MARGEN_IZQ + ANCHO_AREA - x_zona_diel_ini) * 0.5
                  }
                  y={MARGEN_SUP + 14}
                  textAnchor="middle"
                  fill={color_jd}
                  fontSize={9.5}
                  fontFamily="var(--font-mono), monospace"
                >
                  Dieléctrico (ωε ≫ σ)
                </text>
              )}
            </g>
          ) : (
            <g clipPath={`url(#${prefijo_id}-clip-bode)`}>
              <rect
                x={MARGEN_IZQ}
                y={MARGEN_SUP}
                width={ANCHO_AREA}
                height={ALTO_AREA}
                fill={
                  es_claro
                    ? "rgba(2, 132, 199, 0.07)"
                    : "rgba(56, 189, 248, 0.06)"
                }
              />
              <text
                x={MARGEN_IZQ + ANCHO_AREA * 0.5}
                y={MARGEN_SUP + 15}
                textAnchor="middle"
                fill={color_jd}
                fontSize={10}
                fontFamily="var(--font-mono), monospace"
              >
                Dieléctrico ideal (σ = 0 → solo corriente de desplazamiento J_d)
              </text>
            </g>
          )}

          {/* Rejilla logarítmica vertical (décadas mayores y subtics 2, 3, 5) */}
          {decadas_x.map((_exp) => {
            const x_dec = xDeLogF(_exp);
            const mostrar_etiqueta =
              (_exp - Math.ceil(modelo.log_f_min)) % paso_decada_x === 0;
            return (
              <g key={`dx-${_exp}`}>
                {SUBMARCAS_LOG.map((_m) => {
                  const lf_sub = _exp + Math.log10(_m);
                  if (lf_sub > modelo.log_f_max) {
                    return null;
                  }
                  const xs = xDeLogF(lf_sub);
                  return (
                    <line
                      key={`dx-sub-${_exp}-${_m}`}
                      x1={xs}
                      y1={MARGEN_SUP}
                      x2={xs}
                      y2={y_base}
                      stroke={
                        es_claro
                          ? "rgba(15,23,42,0.06)"
                          : "rgba(148,163,184,0.05)"
                      }
                      strokeWidth={0.7}
                    />
                  );
                })}
                <line
                  x1={x_dec}
                  y1={MARGEN_SUP}
                  x2={x_dec}
                  y2={y_base}
                  stroke={
                    es_claro
                      ? "rgba(15,23,42,0.14)"
                      : "rgba(148,163,184,0.14)"
                  }
                  strokeWidth={0.9}
                />
                {mostrar_etiqueta && (
                  <text
                    x={x_dec}
                    y={y_base + 16}
                    textAnchor="middle"
                    fill={es_claro ? "#475569" : "#94a3b8"}
                    fontSize={9.5}
                    fontFamily="var(--font-mono), monospace"
                  >
                    {formatearPotenciaDiez(_exp)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Rejilla logarítmica horizontal */}
          {decadas_y.map((_exp) => {
            const y_dec = yDeLogJ(_exp);
            const mostrar_etiqueta =
              (_exp - Math.ceil(modelo.log_y_min)) % paso_decada_y === 0;
            return (
              <g key={`dy-${_exp}`}>
                <line
                  x1={MARGEN_IZQ}
                  y1={y_dec}
                  x2={MARGEN_IZQ + ANCHO_AREA}
                  y2={y_dec}
                  stroke={
                    es_claro
                      ? "rgba(15,23,42,0.13)"
                      : "rgba(148,163,184,0.13)"
                  }
                  strokeWidth={0.9}
                />
                {mostrar_etiqueta && (
                  <text
                    x={MARGEN_IZQ - 8}
                    y={y_dec + 3.5}
                    textAnchor="end"
                    fill={es_claro ? "#475569" : "#94a3b8"}
                    fontSize={9.5}
                    fontFamily="var(--font-mono), monospace"
                  >
                    {formatearPotenciaDiez(_exp)}
                  </text>
                )}
              </g>
            );
          })}

          <text
            x={MARGEN_IZQ + ANCHO_AREA * 0.5}
            y={ALTO_SVG - 10}
            textAnchor="middle"
            fill={es_claro ? "#334155" : "#cbd5e1"}
            fontSize={10.5}
            fontFamily="var(--font-mono), monospace"
          >
            Frecuencia f [Hz] (escala log)
          </text>
          <text
            x={14}
            y={MARGEN_SUP + ALTO_AREA * 0.5}
            textAnchor="middle"
            fill={es_claro ? "#334155" : "#cbd5e1"}
            fontSize={10.5}
            fontFamily="var(--font-mono), monospace"
            transform={`rotate(-90 14 ${MARGEN_SUP + ALTO_AREA * 0.5})`}
          >
            |J| [A/m²] (log)
          </text>

          {/* Curvas |J_c| y |J_d| */}
          <g clipPath={`url(#${prefijo_id}-clip-bode)`}>
            {y_jc !== null && (
              <line
                x1={MARGEN_IZQ}
                y1={y_jc}
                x2={MARGEN_IZQ + ANCHO_AREA}
                y2={y_jc}
                stroke={color_jc}
                strokeWidth={2.3}
              />
            )}
            <path
              d={ruta_jd}
              fill="none"
              stroke={color_jd}
              strokeWidth={2.3}
              strokeLinecap="round"
            />
          </g>

          {/* Marcador de frecuencia de cruce f_c */}
          {x_fc !== null && y_jc !== null && x_fc >= MARGEN_IZQ && x_fc <= MARGEN_IZQ + ANCHO_AREA && (
            <g>
              <line
                x1={x_fc}
                y1={MARGEN_SUP}
                x2={x_fc}
                y2={y_base}
                stroke={color_cruce}
                strokeWidth={1.3}
                strokeDasharray="4 4"
              />
              <circle
                cx={x_fc}
                cy={y_jc}
                r={5.5}
                fill={es_claro ? "#ffffff" : "#060a13"}
                stroke={color_cruce}
                strokeWidth={2.2}
              />
              <rect
                x={Math.min(Math.max(x_fc - 42, MARGEN_IZQ + 4), MARGEN_IZQ + ANCHO_AREA - 88)}
                y={MARGEN_SUP - 19}
                width={84}
                height={16}
                rx={4}
                fill={es_claro ? "#ecfdf5" : "#0b1222"}
                stroke={
                  es_claro ? "rgba(4,120,87,0.45)" : "rgba(52,211,153,0.55)"
                }
                strokeWidth={0.9}
              />
              <text
                x={Math.min(Math.max(x_fc, MARGEN_IZQ + 46), MARGEN_IZQ + ANCHO_AREA - 46)}
                y={MARGEN_SUP - 8}
                textAnchor="middle"
                fill={color_cruce}
                fontSize={9}
                fontWeight={600}
                fontFamily="var(--font-mono), monospace"
              >
                f_c = {formatearUnidadSI(modelo.frecuencia_cruce, "Hz", { decimales: 1 }).texto}
              </text>
            </g>
          )}

          {/* Marcador de frecuencia actual de operación */}
          {x_actual >= MARGEN_IZQ && x_actual <= MARGEN_IZQ + ANCHO_AREA && (
            <g>
              <line
                x1={x_actual}
                y1={MARGEN_SUP}
                x2={x_actual}
                y2={y_base}
                stroke={color_cursor_f}
                strokeWidth={1.6}
              />
              {y_jc !== null && (
                <circle
                  cx={x_actual}
                  cy={y_jc}
                  r={4.2}
                  fill={color_jc}
                  stroke={es_claro ? "#ffffff" : "#060a13"}
                  strokeWidth={1.3}
                />
              )}
              <circle
                cx={x_actual}
                cy={Math.max(MARGEN_SUP, Math.min(y_base, y_jd_actual))}
                r={4.5}
                fill={color_jd}
                stroke={es_claro ? "#ffffff" : "#f8fafc"}
                strokeWidth={1.3}
              />
            </g>
          )}

          {/* Globo informativo al pasar el cursor */}
          {datos_sobre && (
            <g pointerEvents="none">
              <line
                x1={x_sobre}
                y1={MARGEN_SUP}
                x2={x_sobre}
                y2={y_base}
                stroke={
                  es_claro ? "rgba(15,23,42,0.35)" : "rgba(241,245,249,0.35)"
                }
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <g
                transform={`translate(${
                  globo_izquierda ? x_sobre - 190 : x_sobre + 12
                }, ${MARGEN_SUP + 20})`}
              >
                <rect
                  x={0}
                  y={0}
                  width={178}
                  height={76}
                  rx={8}
                  fill={
                    es_claro
                      ? "rgba(255, 255, 255, 0.97)"
                      : "rgba(11, 18, 34, 0.95)"
                  }
                  stroke={
                    es_claro
                      ? "rgba(2, 132, 199, 0.35)"
                      : "rgba(56, 189, 248, 0.4)"
                  }
                  strokeWidth={1}
                />
                <text
                  x={10}
                  y={16}
                  fill={es_claro ? "#0f172a" : "#f8fafc"}
                  fontSize={9.5}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  f = {formatearUnidadSI(datos_sobre.frecuencia, "Hz").texto}
                </text>
                <text
                  x={10}
                  y={32}
                  fill={color_jc}
                  fontSize={9.5}
                  fontFamily="var(--font-mono), monospace"
                >
                  |J_c| = {formatearUnidadSI(datos_sobre.jc, "A/m²").texto}
                </text>
                <text
                  x={10}
                  y={47}
                  fill={color_jd}
                  fontSize={9.5}
                  fontFamily="var(--font-mono), monospace"
                >
                  |J_d| = {formatearUnidadSI(datos_sobre.jd, "A/m²").texto}
                </text>
                <text
                  x={10}
                  y={63}
                  fill={es_claro ? "#475569" : "#94a3b8"}
                  fontSize={9}
                  fontFamily="var(--font-mono), monospace"
                >
                  tan δ ={" "}
                  {datos_sobre.tangente < 1e-2 || datos_sobre.tangente > 1e3
                    ? datos_sobre.tangente.toExponential(1)
                    : datos_sobre.tangente.toFixed(2)}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </TarjetaLaboratorio>
  );
}
