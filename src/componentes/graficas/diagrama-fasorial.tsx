"use client";

import { useId, useMemo, useState } from "react";
import { Compass } from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { InsigniaEstado, TarjetaLaboratorio } from "@/componentes/ui";
import {
  COLORES_VECTORES,
  calcularRegimenConduccion,
  formatearGrados,
  formatearUnidadSI,
} from "@/lib/fisica";
import { combinarClases } from "@/lib/utils";

export interface PropiedadesDiagramaFasorial {
  conductividad_s_m: number;
  permitividad_relativa: number;
  frecuencia: number;
  amplitud_e0: number;
  fase_animacion?: number;
  incluir_maxwell?: boolean;
  clase_extra?: string;
}

type IdFasor = "e" | "jc" | "jd" | "jtot";

const TAMANO_SVG = 340;
const CENTRO_X = 165;
const CENTRO_Y = 180;
const RADIO_MAX = 112;

function rotarPunto(
  _x: number,
  _y: number,
  _angulo_rad: number,
): { x: number; y: number } {
  const c = Math.cos(_angulo_rad);
  const s = Math.sin(_angulo_rad);
  return {
    x: _x * c - _y * s,
    y: _x * s + _y * c,
  };
}

export function DiagramaFasorial(_propiedades: PropiedadesDiagramaFasorial) {
  const {
    conductividad_s_m,
    permitividad_relativa,
    frecuencia,
    amplitud_e0,
    fase_animacion = 0,
    incluir_maxwell = true,
    clase_extra,
  } = _propiedades;

  const prefijo_id = useId().replace(/:/g, "");
  const [rotar_en_vivo, setRotarEnVivo] = useState<boolean>(false);
  const [fasor_sobre, setFasorSobre] = useState<IdFasor | null>(null);

  const calculo = useMemo(() => {
    const res = calcularRegimenConduccion({
      amplitud_e0: Math.max(Math.abs(amplitud_e0), 1e-6),
      frecuencia: Math.max(frecuencia, 1e-3),
      conductividad_s_m: Math.max(conductividad_s_m, 0),
      permitividad_relativa: Math.max(permitividad_relativa, 1),
      permeabilidad_relativa: 1,
      radio_evaluacion: 0.02,
      dimension_caracteristica: 0.1,
      fase_omega_t: fase_animacion,
    });

    const jc = res.fasor.jc_real;
    const jd = incluir_maxwell ? res.fasor.jd_imaginario : 0;
    const j_tot = Math.hypot(jc, jd);
    // Ángulo de pérdidas δ medido desde el eje +Im (J_d): tan(δ) = σ / (ωε).
    const angulo_perdidas_rad =
      jd > 1e-30 ? Math.atan2(jc, jd) : jc > 0 ? Math.PI * 0.5 : 0;
    const angulo_jtot_rad = Math.atan2(jd, jc);

    const escala = j_tot > 1e-30 ? RADIO_MAX / j_tot : 0;
    const lon_jc = jc * escala;
    const lon_jd = jd * escala;
    const lon_jtot = j_tot * escala;
    const lon_e = RADIO_MAX * 0.72;

    return {
      res,
      jc,
      jd,
      j_tot,
      angulo_perdidas_rad,
      angulo_jtot_rad,
      lon_jc,
      lon_jd,
      lon_jtot,
      lon_e,
    };
  }, [
    amplitud_e0,
    conductividad_s_m,
    fase_animacion,
    frecuencia,
    incluir_maxwell,
    permitividad_relativa,
  ]);

  const angulo_base = rotar_en_vivo ? fase_animacion : 0;

  // Convierte coordenadas matemáticas (x derecha, y arriba) a SVG (y abajo).
  const aSvg = (_mx: number, _my: number): { x: number; y: number } => {
    const rot = rotarPunto(_mx, _my, angulo_base);
    return {
      x: CENTRO_X + rot.x,
      y: CENTRO_Y - rot.y,
    };
  };

  const p_e = aSvg(calculo.lon_e, 0);
  const p_jc = aSvg(calculo.lon_jc, 0);
  const p_jd = aSvg(0, calculo.lon_jd);
  const p_jtot = aSvg(calculo.lon_jc, calculo.lon_jd);

  // Arco geométrico del ángulo de pérdida δ entre +Im (π/2) y J_tot.
  const radio_arco = 36;
  const mostrar_arco_delta =
    incluir_maxwell && calculo.lon_jd > 10 && calculo.lon_jc > 6;
  const inicio_arco = aSvg(0, radio_arco);
  const fin_arco = aSvg(
    radio_arco * Math.cos(calculo.angulo_jtot_rad),
    radio_arco * Math.sin(calculo.angulo_jtot_rad),
  );
  const punto_etiqueta_delta = aSvg(
    (radio_arco + 14) * Math.cos(0.5 * (Math.PI * 0.5 + calculo.angulo_jtot_rad)),
    (radio_arco + 14) * Math.sin(0.5 * (Math.PI * 0.5 + calculo.angulo_jtot_rad)),
  );

  // Cuadro de 90° entre J_c y J_d cuando ambos existen.
  const lado_cuadro = 11;
  const q1 = aSvg(lado_cuadro, 0);
  const q2 = aSvg(lado_cuadro, lado_cuadro);
  const q3 = aSvg(0, lado_cuadro);

  const info_fasores: ReadonlyArray<{
    id: IdFasor;
    simbolo: string;
    nombre: string;
    valor: string;
    fase: string;
    color: string;
  }> = [
    {
      id: "e",
      simbolo: "\\tilde{\\vec{E}}",
      nombre: "Campo eléctrico (ref.)",
      valor: formatearUnidadSI(Math.abs(amplitud_e0), "V/m").texto,
      fase: "0.0°",
      color: COLORES_VECTORES.e,
    },
    {
      id: "jc",
      simbolo: "\\tilde{\\vec{J}}_c",
      nombre: "Conducción (σE)",
      valor: formatearUnidadSI(calculo.jc, "A/m²").texto,
      fase: "0.0° (en fase)",
      color: COLORES_VECTORES.jc,
    },
    {
      id: "jd",
      simbolo: "\\tilde{\\vec{J}}_d",
      nombre: "Desplazamiento (iωεE)",
      valor: formatearUnidadSI(calculo.jd, "A/m²").texto,
      fase: incluir_maxwell ? "+90.0° (cuadratura)" : "Anulado (sin Maxwell)",
      color: COLORES_VECTORES.jd,
    },
    {
      id: "jtot",
      simbolo: "\\tilde{\\vec{J}}_{\\text{tot}}",
      nombre: "Resultante (Jc + Jd)",
      valor: formatearUnidadSI(calculo.j_tot, "A/m²").texto,
      fase: formatearGrados(calculo.angulo_jtot_rad, 1),
      color: COLORES_VECTORES.n,
    },
  ];

  const activo_detalle = info_fasores.find((_f) => _f.id === fasor_sobre);

  return (
    <TarjetaLaboratorio
      etiqueta_superior="Plano Complejo Fasorial"
      titulo="Diagrama Fasorial y Cuadratura de 90°"
      subtitulo="Relación de fase entre E, J_c = σE, J_d = iωεE y ángulo de pérdidas δ"
      icono={<Compass className="h-4 w-4" />}
      clase_extra={clase_extra}
      acciones_derecha={
        <div className="flex items-center gap-1.5">
          <InsigniaEstado variante="verde">
            δ = {formatearGrados(calculo.angulo_perdidas_rad, 1)}
          </InsigniaEstado>
          <button
            type="button"
            onClick={() => setRotarEnVivo((_anterior) => !_anterior)}
            className={combinarClases(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[11px] transition-colors",
              rotar_en_vivo
                ? "border-azul-activo/45 bg-azul-activo/15 text-azul-activo"
                : "border-borde-panel bg-fondo-base/75 text-texto-secundario hover:text-texto-principal",
            )}
          >
            {rotar_en_vivo ? (
              "Fijar 0°"
            ) : (
              <>
                <span>Rotar</span>
                <FormulaKatex expresion="e^{i\omega t}" />
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative overflow-hidden rounded-xl border border-borde-panel bg-[#060a13]">
          <svg
            viewBox={`0 0 ${TAMANO_SVG} ${TAMANO_SVG}`}
            role="img"
            aria-label="Diagrama fasorial de campo eléctrico y densidades de corriente de conducción y desplazamiento"
            className="mx-auto block h-auto w-full max-w-[330px] select-none"
          >
            <defs>
              {[
                { id: "e", color: COLORES_VECTORES.e },
                { id: "jc", color: COLORES_VECTORES.jc },
                { id: "jd", color: COLORES_VECTORES.jd },
                { id: "jtot", color: COLORES_VECTORES.n },
              ].map((_m) => (
                <marker
                  key={_m.id}
                  id={`${prefijo_id}-flecha-${_m.id}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={_m.color} />
                </marker>
              ))}
            </defs>

            {/* Anillos polares de referencia */}
            {[0.33, 0.66, 1].map((_r) => (
              <circle
                key={_r}
                cx={CENTRO_X}
                cy={CENTRO_Y}
                r={RADIO_MAX * _r}
                fill="none"
                stroke="rgba(148,163,184,0.12)"
                strokeWidth={0.9}
                strokeDasharray={_r < 1 ? "3 3" : undefined}
              />
            ))}

            {/* Ejes Re e Im */}
            <line
              x1={26}
              y1={CENTRO_Y}
              x2={TAMANO_SVG - 24}
              y2={CENTRO_Y}
              stroke="rgba(148,163,184,0.3)"
              strokeWidth={1}
            />
            <line
              x1={CENTRO_X}
              y1={24}
              x2={CENTRO_X}
              y2={TAMANO_SVG - 26}
              stroke="rgba(148,163,184,0.3)"
              strokeWidth={1}
            />
            <text
              x={TAMANO_SVG - 20}
              y={CENTRO_Y - 7}
              textAnchor="end"
              fill="#94a3b8"
              fontSize={10}
              fontFamily="var(--font-mono), monospace"
            >
              Re (en fase)
            </text>
            <text
              x={CENTRO_X + 8}
              y={34}
              textAnchor="start"
              fill="#c084fc"
              fontSize={10}
              fontFamily="var(--font-mono), monospace"
            >
              +i·Im (+90°)
            </text>

            {/* Indicador de 90° entre J_c y J_d */}
            {incluir_maxwell && calculo.lon_jc > 14 && calculo.lon_jd > 14 && (
              <path
                d={`M${q1.x.toFixed(1)},${q1.y.toFixed(1)} L${q2.x.toFixed(1)},${q2.y.toFixed(1)} L${q3.x.toFixed(1)},${q3.y.toFixed(1)}`}
                fill="none"
                stroke="rgba(192,132,252,0.55)"
                strokeWidth={1.1}
              />
            )}

            {/* Paralelogramo de suma vectorial */}
            {calculo.lon_jc > 4 && calculo.lon_jd > 4 && (
              <g
                stroke="rgba(148,163,184,0.32)"
                strokeWidth={1}
                strokeDasharray="4 3"
              >
                <line x1={p_jc.x} y1={p_jc.y} x2={p_jtot.x} y2={p_jtot.y} />
                <line x1={p_jd.x} y1={p_jd.y} x2={p_jtot.x} y2={p_jtot.y} />
              </g>
            )}

            {/* Arco del ángulo de pérdida δ */}
            {mostrar_arco_delta && (
              <g>
                <path
                  d={`M${inicio_arco.x.toFixed(1)},${inicio_arco.y.toFixed(1)} A${radio_arco},${radio_arco} 0 0,1 ${fin_arco.x.toFixed(1)},${fin_arco.y.toFixed(1)}`}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={1.6}
                />
                <text
                  x={punto_etiqueta_delta.x}
                  y={punto_etiqueta_delta.y + 3}
                  textAnchor="middle"
                  fill="#34d399"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  δ
                </text>
              </g>
            )}

            {/* Vector E (referencia de fase) */}
            <g
              onPointerEnter={() => setFasorSobre("e")}
              onPointerLeave={() => setFasorSobre(null)}
              className="cursor-pointer"
            >
              <line
                x1={CENTRO_X}
                y1={CENTRO_Y}
                x2={p_e.x}
                y2={p_e.y}
                stroke={COLORES_VECTORES.e}
                strokeWidth={fasor_sobre === "e" ? 3.2 : 2}
                strokeDasharray="5 3"
                markerEnd={`url(#${prefijo_id}-flecha-e)`}
              />
              <text
                x={p_e.x + 8}
                y={p_e.y + 15}
                fill={COLORES_VECTORES.e}
                fontSize={11}
                fontWeight={600}
                fontFamily="var(--font-mono), monospace"
              >
                E
              </text>
            </g>

            {/* Vector J_c = σE */}
            {calculo.lon_jc > 3 && (
              <g
                onPointerEnter={() => setFasorSobre("jc")}
                onPointerLeave={() => setFasorSobre(null)}
                className="cursor-pointer"
              >
                <line
                  x1={CENTRO_X}
                  y1={CENTRO_Y}
                  x2={p_jc.x}
                  y2={p_jc.y}
                  stroke={COLORES_VECTORES.jc}
                  strokeWidth={fasor_sobre === "jc" ? 4 : 2.8}
                  markerEnd={`url(#${prefijo_id}-flecha-jc)`}
                />
                <text
                  x={p_jc.x + 4}
                  y={p_jc.y - 8}
                  fill={COLORES_VECTORES.jc}
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  J_c
                </text>
              </g>
            )}

            {/* Vector J_d = iωεE */}
            {calculo.lon_jd > 3 && (
              <g
                onPointerEnter={() => setFasorSobre("jd")}
                onPointerLeave={() => setFasorSobre(null)}
                className="cursor-pointer"
              >
                <line
                  x1={CENTRO_X}
                  y1={CENTRO_Y}
                  x2={p_jd.x}
                  y2={p_jd.y}
                  stroke={COLORES_VECTORES.jd}
                  strokeWidth={fasor_sobre === "jd" ? 4 : 2.8}
                  markerEnd={`url(#${prefijo_id}-flecha-jd)`}
                />
                <text
                  x={p_jd.x - 24}
                  y={p_jd.y + 4}
                  fill={COLORES_VECTORES.jd}
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  J_d
                </text>
              </g>
            )}

            {/* Vector resultante J_tot */}
            {calculo.lon_jtot > 3 && (
              <g
                onPointerEnter={() => setFasorSobre("jtot")}
                onPointerLeave={() => setFasorSobre(null)}
                className="cursor-pointer"
              >
                <line
                  x1={CENTRO_X}
                  y1={CENTRO_Y}
                  x2={p_jtot.x}
                  y2={p_jtot.y}
                  stroke={COLORES_VECTORES.n}
                  strokeWidth={fasor_sobre === "jtot" ? 4.2 : 3}
                  markerEnd={`url(#${prefijo_id}-flecha-jtot)`}
                />
                <text
                  x={p_jtot.x + 8}
                  y={p_jtot.y - 6}
                  fill={COLORES_VECTORES.n}
                  fontSize={11}
                  fontWeight={700}
                  fontFamily="var(--font-mono), monospace"
                >
                  J_tot
                </text>
              </g>
            )}

            <circle cx={CENTRO_X} cy={CENTRO_Y} r={3.5} fill="#f8fafc" />

            {/* Tooltip emergente si se inspecciona un fasor */}
            {activo_detalle && (
              <g pointerEvents="none">
                <rect
                  x={12}
                  y={TAMANO_SVG - 44}
                  width={TAMANO_SVG - 24}
                  height={34}
                  rx={8}
                  fill="rgba(11, 18, 34, 0.95)"
                  stroke={activo_detalle.color}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
                <text
                  x={22}
                  y={TAMANO_SVG - 23}
                  fill={activo_detalle.color}
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  {activo_detalle.nombre}: {activo_detalle.valor} · {activo_detalle.fase}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Tabla compacta interactiva de fasores */}
        <div className="flex flex-col gap-2">
          {info_fasores.map((_item) => (
            <button
              key={_item.id}
              type="button"
              onMouseEnter={() => setFasorSobre(_item.id)}
              onMouseLeave={() => setFasorSobre(null)}
              className={combinarClases(
                "flex flex-col rounded-xl border px-3 py-2 text-left transition-colors",
                fasor_sobre === _item.id
                  ? "border-azul-activo/50 bg-panel-suave/90"
                  : "border-borde-panel bg-fondo-base/65 hover:border-slate-600/50",
              )}
            >
              <span className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-texto-principal">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: _item.color }}
                  />
                  <FormulaKatex expresion={_item.simbolo} />
                </span>
                <span className="font-mono text-[10px] text-texto-tenue">
                  {_item.fase}
                </span>
              </span>
              <span
                className="mt-0.5 font-mono text-xs font-semibold tabular-nums"
                style={{ color: _item.color }}
              >
                {_item.valor}
              </span>
            </button>
          ))}

          <div className="rounded-xl border border-borde-panel bg-fondo-base/60 px-3 py-2 font-mono text-[11px] text-texto-secundario">
            <div className="flex items-center justify-between">
              <span>tan δ = σ/(ωε)</span>
              <span className="text-verde-inducido">
                {calculo.res.tangente_perdidas < 1e-2 ||
                calculo.res.tangente_perdidas > 1e3
                  ? calculo.res.tangente_perdidas.toExponential(2)
                  : calculo.res.tangente_perdidas.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </TarjetaLaboratorio>
  );
}
