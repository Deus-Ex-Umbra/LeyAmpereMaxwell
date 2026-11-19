"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Activity, MoveHorizontal } from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { InsigniaEstado, TarjetaLaboratorio } from "@/componentes/ui";
import {
  COLORES_VECTORES,
  DOS_PI,
  PERMITIVIDAD_VACIO,
  calcularCapacitor,
  calcularGeometriaAmpere,
  formatearUnidadSI,
  generarPerfilRadialCapacitor,
} from "@/lib/fisica";
import { combinarClases } from "@/lib/utils";
import type {
  InstantaneaCapacitor,
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ResultadoGeometriaAmpere,
} from "@/tipos";

export interface PropiedadesGraficaPerfilRadial {
  escenario: "capacitor_paradoja" | "geometrias_ampere";
  parametros_capacitor?: ParametrosCapacitor;
  instantanea_capacitor?: InstantaneaCapacitor;
  parametros_geometria?: ParametrosGeometriaAmpere;
  resultado_geometria?: ResultadoGeometriaAmpere;
  alCambiarRadioLazo?: (_nuevo_radio: number) => void;
  clase_extra?: string;
}

type ModoCurvasRadial = "ambos" | "solo_b" | "solo_h";

interface PuntoMuestraRadial {
  radio: number;
  magnitud_b: number;
  magnitud_h: number;
  campo_b_signo: number;
  campo_h_signo: number;
  referencia_b?: number;
  referencia_h?: number;
  campo_e?: number;
  region: string;
}

interface MarcadorVertical {
  radio: number;
  etiqueta: string;
  color: string;
}

interface BandaRegion {
  inicio: number;
  fin: number;
  etiqueta: string;
  color_fondo: string;
}

const ANCHO_SVG = 680;
const ALTO_SVG = 310;
const MARGEN_IZQ = 76;
const MARGEN_DER = 78;
const MARGEN_SUP = 28;
const MARGEN_INF = 48;
const ANCHO_AREA = ANCHO_SVG - MARGEN_IZQ - MARGEN_DER;
const ALTO_AREA = ALTO_SVG - MARGEN_SUP - MARGEN_INF;
const COLOR_CURVA_B = COLORES_VECTORES.b;
const COLOR_CURVA_H = "#fb923c";
const COLOR_CURVA_REF = "#38bdf8";
const COLOR_CURVA_BESSEL = COLORES_VECTORES.jd;
const COLOR_CURSOR = COLORES_VECTORES.lazo;

function construirTrazadoPolilinea(
  _puntos: ReadonlyArray<{ x: number; y: number }>,
): string {
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

function construirAreaBajoCurva(
  _puntos: ReadonlyArray<{ x: number; y: number }>,
  _y_base: number,
): string {
  if (_puntos.length < 2) {
    return "";
  }
  const linea = construirTrazadoPolilinea(_puntos);
  const primero = _puntos[0];
  const ultimo = _puntos[_puntos.length - 1];
  return `${linea} L${ultimo.x.toFixed(2)},${_y_base.toFixed(2)} L${primero.x.toFixed(2)},${_y_base.toFixed(2)} Z`;
}

function encontrarPuntoMasCercano(
  _muestras: ReadonlyArray<PuntoMuestraRadial>,
  _radio_objetivo: number,
): PuntoMuestraRadial | null {
  if (_muestras.length === 0) {
    return null;
  }
  let mejor = _muestras[0];
  let distancia_min = Math.abs(mejor.radio - _radio_objetivo);
  for (let i = 1; i < _muestras.length; i += 1) {
    const distancia = Math.abs(_muestras[i].radio - _radio_objetivo);
    if (distancia < distancia_min) {
      distancia_min = distancia;
      mejor = _muestras[i];
    }
  }
  return mejor;
}

function calcularFasePicoCorriente(_parametros: ParametrosCapacitor): number {
  if (_parametros.modo === "transitorio_rc") {
    return 0;
  }
  if (_parametros.modo === "alta_frecuencia_bessel") {
    return Math.PI * 0.5;
  }
  const omega = DOS_PI * Math.max(_parametros.frecuencia, 1e-3);
  const eps = PERMITIVIDAD_VACIO * Math.max(_parametros.permitividad_relativa, 1);
  const sigma = Math.max(_parametros.conductividad_s_m, 0);
  // I(θ) = G V₀ cos(θ) - ω C V₀ sin(θ) alcanza su extremo en θ = atan2(-ωε, σ).
  return Math.atan2(-omega * eps, sigma);
}

export function GraficaPerfilRadial(
  _propiedades: PropiedadesGraficaPerfilRadial,
) {
  const {
    escenario,
    parametros_capacitor,
    instantanea_capacitor,
    parametros_geometria,
    resultado_geometria,
    alCambiarRadioLazo,
    clase_extra,
  } = _propiedades;

  const prefijo_id = useId().replace(/:/g, "");
  const [modo_curvas, setModoCurvas] = useState<ModoCurvasRadial>("ambos");
  const [radio_sobre, setRadioSobre] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const svg_ref = useRef<SVGSVGElement | null>(null);

  const datos_grafica = useMemo(() => {
    if (escenario === "capacitor_paradoja" && parametros_capacitor) {
      const a = Math.max(parametros_capacitor.radio_placa, 1e-6);
      const radio_lazo = Math.max(parametros_capacitor.radio_lazo, 1e-6);
      const multiplo_max = Math.max(2.5, (radio_lazo / a) * 1.15);
      const r_max = a * multiplo_max;
      const instantanea =
        instantanea_capacitor ?? calcularCapacitor(parametros_capacitor);

      const perfil = generarPerfilRadialCapacitor(
        parametros_capacitor,
        120,
        multiplo_max,
      );

      const fase_pico = calcularFasePicoCorriente(parametros_capacitor);
      const perfil_pico = generarPerfilRadialCapacitor(
        {
          ...parametros_capacitor,
          fase_o_tiempo_norm: fase_pico,
        },
        96,
        multiplo_max,
      );

      const mostrar_bessel_previa =
        parametros_capacitor.modo === "ac_cuasiestatico" &&
        instantanea.argumento_bessel_borde > 0.15;

      const perfil_bessel_previa = mostrar_bessel_previa
        ? generarPerfilRadialCapacitor(
            {
              ...parametros_capacitor,
              modo: "alta_frecuencia_bessel",
              conductividad_s_m: 0,
            },
            120,
            multiplo_max,
          )
        : null;

      const muestras: PuntoMuestraRadial[] = perfil.map((_p, _idx) => ({
        radio: _p.radio,
        magnitud_b: _p.magnitud_b,
        magnitud_h: _p.magnitud_h,
        campo_b_signo: _p.campo_b_phi,
        campo_h_signo: _p.campo_h_phi,
        referencia_b:
          parametros_capacitor.modo === "alta_frecuencia_bessel"
            ? _p.magnitud_b_cuasiestatico
            : perfil_bessel_previa
              ? perfil_bessel_previa[_idx]?.magnitud_b
              : undefined,
        campo_e: _p.campo_e_z,
        region: _p.radio <= a ? "Interior placas (ρ ≤ a)" : "Exterior (ρ > a)",
      }));

      let max_b = 0;
      let max_h = 0;
      for (const p of muestras) {
        max_b = Math.max(max_b, p.magnitud_b, p.referencia_b ?? 0);
        max_h = Math.max(max_h, p.magnitud_h);
      }
      for (const p of perfil_pico) {
        max_b = Math.max(max_b, p.magnitud_b, p.magnitud_b_cuasiestatico);
        max_h = Math.max(max_h, p.magnitud_h);
      }

      const escala_b = max_b > 1e-30 ? max_b * 1.14 : 1;
      const escala_h = max_h > 1e-30 ? max_h * 1.14 : 1;

      const punto_lazo = instantanea.evaluarEnRadio(radio_lazo);

      const marcadores: MarcadorVertical[] = [
        {
          radio: a,
          etiqueta: "a",
          color: "#38bdf8",
        },
      ];

      const bandas: BandaRegion[] = [
        {
          inicio: 0,
          fin: a,
          etiqueta: "Interior (ρ ≤ a)",
          color_fondo: "rgba(56, 189, 248, 0.065)",
        },
        {
          inicio: a,
          fin: r_max,
          etiqueta: "Exterior (1/ρ)",
          color_fondo: "rgba(15, 23, 42, 0.0)",
        },
      ];

      const etiqueta_referencia =
        parametros_capacitor.modo === "alta_frecuencia_bessel"
          ? "Cuasi-estático (lineal + 1/ρ)"
          : mostrar_bessel_previa
            ? "Bessel exacto J₁(kρ)"
            : null;

      return {
        r_max,
        r_min_cursor: Math.max(a * 0.04, 0.001),
        radio_lazo,
        muestras,
        envolvente_b: perfil_pico.map((_p) => ({
          radio: _p.radio,
          valor: _p.magnitud_b,
        })),
        escala_b,
        escala_h,
        b_en_lazo: Math.abs(punto_lazo.campo_b_phi),
        h_en_lazo: Math.abs(punto_lazo.campo_h_phi),
        marcadores,
        bandas,
        etiqueta_referencia,
        color_referencia:
          parametros_capacitor.modo === "alta_frecuencia_bessel"
            ? COLOR_CURVA_REF
            : COLOR_CURVA_BESSEL,
        apantallado_exterior: false,
        hay_salto_mu: false,
        subtitulo:
          parametros_capacitor.modo === "alta_frecuencia_bessel"
            ? `Perfil exacto J₁(kρ) vs aproximación cuasi-estática · ka = ${instantanea.argumento_bessel_borde.toFixed(2)}`
            : "Régimen lineal interior (ρ ≤ a) y decaimiento hiperbólico exterior (1/ρ)",
        aviso_maxwell_apagado: !parametros_capacitor.incluir_maxwell,
      };
    }

    if (escenario === "geometrias_ampere" && parametros_geometria) {
      const resultado =
        resultado_geometria ?? calcularGeometriaAmpere(parametros_geometria);
      const a = Math.max(parametros_geometria.radio_interior, 1e-6);
      const b = Math.max(parametros_geometria.radio_medio, a + 1e-6);
      const c = Math.max(parametros_geometria.radio_exterior, b + 1e-6);
      const radio_lazo = Math.max(parametros_geometria.radio_lazo, 1e-6);

      let r_max = a * 3.5;
      if (parametros_geometria.tipo === "cable_coaxial") {
        r_max = Math.max(c * 1.8, radio_lazo * 1.15);
      } else if (parametros_geometria.tipo === "toroide") {
        r_max = Math.max(b * 1.6, radio_lazo * 1.15);
      } else if (parametros_geometria.tipo === "solenoide_largo") {
        r_max = Math.max(a * 2.2, radio_lazo * 1.15);
      } else {
        r_max = Math.max(a * 3.5, radio_lazo * 1.15);
      }

      const radios_base: number[] = [];
      const pasos = 140;
      for (let i = 0; i <= pasos; i += 1) {
        radios_base.push((i / pasos) * r_max);
      }

      // Puntos gemelos en fronteras para dibujar discontinuidades verticales exactas.
      const fronteras: number[] = [a];
      if (
        parametros_geometria.tipo === "cable_coaxial" ||
        parametros_geometria.tipo === "toroide"
      ) {
        fronteras.push(b);
      }
      if (parametros_geometria.tipo === "cable_coaxial") {
        fronteras.push(c);
      }

      const delta_frontera = r_max * 1e-4;
      for (const f of fronteras) {
        if (f > delta_frontera && f < r_max) {
          radios_base.push(Math.max(0, f - delta_frontera), f, Math.min(r_max, f + delta_frontera));
        }
      }
      radios_base.sort((_x, _y) => _x - _y);

      const muestras: PuntoMuestraRadial[] = radios_base.map((_r) => {
        const ev = resultado.evaluarEnRadio(_r);
        let region = "Exterior";
        if (parametros_geometria.tipo === "conductor_cilindrico") {
          region = _r <= a ? "Interior conductor (ρ ≤ a)" : "Exterior (ρ > a)";
        } else if (parametros_geometria.tipo === "cable_coaxial") {
          if (_r <= a) region = "Núcleo (+I)";
          else if (_r < b) region = "Dieléctrico";
          else if (_r <= c) region = "Malla (-αI)";
          else region = "Exterior";
        } else if (parametros_geometria.tipo === "solenoide_largo") {
          region = _r < a ? "Núcleo uniforme" : "Exterior (H ≈ 0)";
        } else {
          if (_r < a) region = "Hueco central";
          else if (_r <= b) region = "Núcleo toroidal (1/ρ)";
          else region = "Exterior (H = 0)";
        }

        return {
          radio: _r,
          magnitud_b: Math.abs(ev.campo_b),
          magnitud_h: Math.abs(ev.campo_h),
          campo_b_signo: ev.campo_b,
          campo_h_signo: ev.campo_h,
          referencia_h:
            parametros_geometria.tipo === "conductor_cilindrico" && _r >= 0.35 * a
              ? Math.abs(parametros_geometria.corriente / (DOS_PI * _r))
              : undefined,
          region,
        };
      });

      let max_b = 0;
      let max_h = 0;
      for (const p of muestras) {
        max_b = Math.max(max_b, p.magnitud_b);
        max_h = Math.max(max_h, p.magnitud_h);
      }

      const escala_b = max_b > 1e-30 ? max_b * 1.15 : 1;
      const escala_h = max_h > 1e-30 ? max_h * 1.15 : 1;
      const eval_lazo = resultado.evaluarEnRadio(radio_lazo);

      const marcadores: MarcadorVertical[] = [];
      const bandas: BandaRegion[] = [];

      if (parametros_geometria.tipo === "conductor_cilindrico") {
        marcadores.push({ radio: a, etiqueta: "a", color: "#38bdf8" });
        bandas.push(
          {
            inicio: 0,
            fin: a,
            etiqueta: "Conductor",
            color_fondo: "rgba(251, 191, 36, 0.065)",
          },
          {
            inicio: a,
            fin: r_max,
            etiqueta: "Exterior (1/ρ)",
            color_fondo: "rgba(15, 23, 42, 0)",
          },
        );
      } else if (parametros_geometria.tipo === "cable_coaxial") {
        marcadores.push(
          { radio: a, etiqueta: "a", color: "#fbbf24" },
          { radio: b, etiqueta: "b", color: "#38bdf8" },
          { radio: c, etiqueta: "c", color: "#c084fc" },
        );
        bandas.push(
          {
            inicio: 0,
            fin: a,
            etiqueta: "Núcleo",
            color_fondo: "rgba(251, 191, 36, 0.08)",
          },
          {
            inicio: a,
            fin: b,
            etiqueta: "Aislante",
            color_fondo: "rgba(56, 189, 248, 0.05)",
          },
          {
            inicio: b,
            fin: c,
            etiqueta: "Malla",
            color_fondo: "rgba(192, 132, 252, 0.08)",
          },
          {
            inicio: c,
            fin: r_max,
            etiqueta:
              Math.abs(1 - parametros_geometria.factor_retorno_coaxial) < 1e-6
                ? "Apantallado (H = 0)"
                : "Fuga exterior",
            color_fondo:
              Math.abs(1 - parametros_geometria.factor_retorno_coaxial) < 1e-6
                ? "rgba(16, 185, 129, 0.06)"
                : "rgba(248, 113, 113, 0.05)",
          },
        );
      } else if (parametros_geometria.tipo === "solenoide_largo") {
        marcadores.push({ radio: a, etiqueta: "R_sol", color: "#38bdf8" });
        bandas.push({
          inicio: 0,
          fin: a,
          etiqueta: "Interior uniforme",
          color_fondo: "rgba(56, 189, 248, 0.07)",
        });
      } else {
        marcadores.push(
          { radio: a, etiqueta: "R_int", color: "#38bdf8" },
          { radio: b, etiqueta: "R_ext", color: "#c084fc" },
        );
        bandas.push({
          inicio: a,
          fin: b,
          etiqueta: "Núcleo toroidal",
          color_fondo: "rgba(192, 132, 252, 0.08)",
        });
      }

      const hay_salto_mu =
        parametros_geometria.permeabilidad_relativa_nucleo > 1.01 &&
        (parametros_geometria.tipo === "conductor_cilindrico" ||
          parametros_geometria.tipo === "cable_coaxial");

      return {
        r_max,
        r_min_cursor: Math.max(r_max * 0.015, 0.0005),
        radio_lazo,
        muestras,
        envolvente_b: null as ReadonlyArray<{ radio: number; valor: number }> | null,
        escala_b,
        escala_h,
        b_en_lazo: Math.abs(eval_lazo.campo_b),
        h_en_lazo: Math.abs(eval_lazo.campo_h),
        marcadores,
        bandas,
        etiqueta_referencia:
          parametros_geometria.tipo === "conductor_cilindrico"
            ? "Asintota hilo fino I/(2πρ)"
            : null,
        color_referencia: "#94a3b8",
        apantallado_exterior:
          parametros_geometria.tipo === "cable_coaxial" &&
          Math.abs(1 - parametros_geometria.factor_retorno_coaxial) < 1e-6,
        hay_salto_mu,
        subtitulo: hay_salto_mu
          ? `H(ρ) continuo vs salto de B = μ₀μᵣH en ρ = a (μᵣ = ${parametros_geometria.permeabilidad_relativa_nucleo.toFixed(0)})`
          : resultado.region_descripcion,
        aviso_maxwell_apagado: false,
      };
    }

    return null;
  }, [
    escenario,
    parametros_capacitor,
    instantanea_capacitor,
    parametros_geometria,
    resultado_geometria,
  ]);

  const radioDesdeEventoPuntero = useCallback(
    (_cliente_x: number): number | null => {
      if (!svg_ref.current || !datos_grafica) {
        return null;
      }
      const rect = svg_ref.current.getBoundingClientRect();
      if (rect.width <= 0) {
        return null;
      }
      const x_svg = ((_cliente_x - rect.left) / rect.width) * ANCHO_SVG;
      const fraccion = Math.min(1, Math.max(0, (x_svg - MARGEN_IZQ) / ANCHO_AREA));
      return fraccion * datos_grafica.r_max;
    },
    [datos_grafica],
  );

  const manejarPointerDown = useCallback(
    (_evento: React.PointerEvent<SVGSVGElement>) => {
      if (!alCambiarRadioLazo || !datos_grafica) {
        return;
      }
      const radio_clic = radioDesdeEventoPuntero(_evento.clientX);
      if (radio_clic === null) {
        return;
      }
      _evento.currentTarget.setPointerCapture(_evento.pointerId);
      setArrastrando(true);
      const acotado = Math.max(
        datos_grafica.r_min_cursor,
        Math.min(datos_grafica.r_max, radio_clic),
      );
      alCambiarRadioLazo(acotado);
    },
    [alCambiarRadioLazo, datos_grafica, radioDesdeEventoPuntero],
  );

  const manejarPointerMove = useCallback(
    (_evento: React.PointerEvent<SVGSVGElement>) => {
      if (!datos_grafica) {
        return;
      }
      const radio_actual = radioDesdeEventoPuntero(_evento.clientX);
      if (radio_actual === null) {
        return;
      }
      setRadioSobre(radio_actual);
      if (arrastrando && alCambiarRadioLazo) {
        const acotado = Math.max(
          datos_grafica.r_min_cursor,
          Math.min(datos_grafica.r_max, radio_actual),
        );
        alCambiarRadioLazo(acotado);
      }
    },
    [arrastrando, alCambiarRadioLazo, datos_grafica, radioDesdeEventoPuntero],
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

  if (!datos_grafica) {
    return null;
  }

  const xDeRadio = (_r: number): number =>
    MARGEN_IZQ + Math.min(1, Math.max(0, _r / datos_grafica.r_max)) * ANCHO_AREA;
  const yDeB = (_b: number): number =>
    MARGEN_SUP + ALTO_AREA - Math.min(1, Math.max(0, _b / datos_grafica.escala_b)) * ALTO_AREA;
  const yDeH = (_h: number): number =>
    MARGEN_SUP + ALTO_AREA - Math.min(1, Math.max(0, _h / datos_grafica.escala_h)) * ALTO_AREA;

  const y_base = MARGEN_SUP + ALTO_AREA;
  const mostrar_b = modo_curvas === "ambos" || modo_curvas === "solo_b";
  const mostrar_h = modo_curvas === "ambos" || modo_curvas === "solo_h";

  const coords_b = datos_grafica.muestras.map((_p) => ({
    x: xDeRadio(_p.radio),
    y: yDeB(_p.magnitud_b),
  }));
  const coords_h = datos_grafica.muestras.map((_p) => ({
    x: xDeRadio(_p.radio),
    y: yDeH(_p.magnitud_h),
  }));

  const coords_ref = datos_grafica.muestras
    .filter((_p) =>
      escenario === "capacitor_paradoja"
        ? _p.referencia_b !== undefined
        : _p.referencia_h !== undefined && _p.referencia_h <= datos_grafica.escala_h * 1.05,
    )
    .map((_p) => ({
      x: xDeRadio(_p.radio),
      y:
        escenario === "capacitor_paradoja"
          ? yDeB(_p.referencia_b ?? 0)
          : yDeH(_p.referencia_h ?? 0),
    }));

  const coords_envolvente = datos_grafica.envolvente_b
    ? datos_grafica.envolvente_b.map((_p) => ({
        x: xDeRadio(_p.radio),
        y: yDeB(_p.valor),
      }))
    : null;

  const x_cursor = xDeRadio(datos_grafica.radio_lazo);
  const y_cursor_b = yDeB(datos_grafica.b_en_lazo);
  const y_cursor_h = yDeH(datos_grafica.h_en_lazo);

  const punto_sobre =
    radio_sobre !== null
      ? encontrarPuntoMasCercano(datos_grafica.muestras, radio_sobre)
      : null;

  const marcas_x = [0, 0.25, 0.5, 0.75, 1];
  const marcas_y = [0, 0.25, 0.5, 0.75, 1];

  const x_globo = punto_sobre ? xDeRadio(punto_sobre.radio) : 0;
  const globo_izquierda = x_globo > MARGEN_IZQ + ANCHO_AREA * 0.58;

  return (
    <TarjetaLaboratorio
      etiqueta_superior="Perfil Radial Sincronizado"
      titulo="Distribución |B(ρ)| y |H(ρ)|"
      subtitulo={datos_grafica.subtitulo}
      icono={<Activity className="h-4 w-4" />}
      clase_extra={clase_extra}
      acciones_derecha={
        <div className="flex flex-wrap items-center gap-1.5">
          {datos_grafica.apantallado_exterior && (
            <InsigniaEstado variante="verde" con_punto>
              H = 0 exterior
            </InsigniaEstado>
          )}
          {datos_grafica.hay_salto_mu && (
            <InsigniaEstado variante="naranja" con_punto>
              Salto μᵣ
            </InsigniaEstado>
          )}
          <div className="inline-flex rounded-lg border border-borde-panel bg-fondo-base/80 p-0.5 text-[11px]">
            {(
              [
                { id: "ambos", texto: "B y H" },
                { id: "solo_b", texto: "|B|" },
                { id: "solo_h", texto: "|H|" },
              ] as const
            ).map((_opcion) => (
              <button
                key={_opcion.id}
                type="button"
                onClick={() => setModoCurvas(_opcion.id)}
                className={combinarClases(
                  "rounded-md px-2 py-0.5 font-mono transition-colors",
                  modo_curvas === _opcion.id
                    ? "bg-azul-activo/20 text-azul-activo"
                    : "text-texto-secundario hover:text-texto-principal",
                )}
              >
                {_opcion.texto}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {mostrar_b && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-texto-principal">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: COLOR_CURVA_B }}
              />
              <FormulaKatex expresion="|\vec{B}(\rho)|" />
              <span className="text-texto-secundario">
                = {formatearUnidadSI(datos_grafica.b_en_lazo, "T").texto}
              </span>
            </span>
          )}
          {mostrar_h && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-texto-principal">
              <span
                className="h-0.5 w-4 border-t-2 border-dashed"
                style={{ borderColor: COLOR_CURVA_H }}
              />
              <FormulaKatex expresion="|\vec{H}(\rho)|" />
              <span className="text-texto-secundario">
                = {formatearUnidadSI(datos_grafica.h_en_lazo, "A/m").texto}
              </span>
            </span>
          )}
          {datos_grafica.etiqueta_referencia && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-texto-secundario">
              <span
                className="h-0.5 w-4 border-t-2 border-dotted"
                style={{ borderColor: datos_grafica.color_referencia }}
              />
              {datos_grafica.etiqueta_referencia}
            </span>
          )}
        </div>

        {alCambiarRadioLazo && (
          <span className="inline-flex items-center gap-1 rounded-md border border-ambar-destacar/30 bg-ambar-destacar/10 px-2 py-0.5 font-mono text-[10px] text-ambar-destacar">
            <MoveHorizontal className="h-3 w-3" />
            Arrastrá en la gráfica para mover ρ ={" "}
            {formatearUnidadSI(datos_grafica.radio_lazo, "m").texto}
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-borde-panel bg-[#060a13]">
        <svg
          ref={svg_ref}
          viewBox={`0 0 ${ANCHO_SVG} ${ALTO_SVG}`}
          role="img"
          aria-label="Gráfica del perfil radial del campo magnético B y H en función del radio rho"
          onPointerDown={manejarPointerDown}
          onPointerMove={manejarPointerMove}
          onPointerUp={manejarPointerUp}
          onPointerCancel={manejarPointerUp}
          onPointerLeave={() => {
            if (!arrastrando) {
              setRadioSobre(null);
            }
          }}
          className={combinarClases(
            "block h-auto w-full select-none touch-none",
            alCambiarRadioLazo
              ? arrastrando
                ? "cursor-grabbing"
                : "cursor-ew-resize"
              : "cursor-crosshair",
          )}
        >
          <defs>
            <linearGradient id={`${prefijo_id}-relleno-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_CURVA_B} stopOpacity="0.24" />
              <stop offset="100%" stopColor={COLOR_CURVA_B} stopOpacity="0.01" />
            </linearGradient>
            <clipPath id={`${prefijo_id}-clip-radial`}>
              <rect
                x={MARGEN_IZQ}
                y={MARGEN_SUP}
                width={ANCHO_AREA}
                height={ALTO_AREA}
              />
            </clipPath>
          </defs>

          {/* Fondo del marco de trazado */}
          <rect
            x={MARGEN_IZQ}
            y={MARGEN_SUP}
            width={ANCHO_AREA}
            height={ALTO_AREA}
            fill="#091020"
            stroke="rgba(148,163,184,0.22)"
            strokeWidth={1}
          />

          {/* Bandas de regiones físicas */}
          {datos_grafica.bandas.map((_banda, _idx) => {
            const x1 = xDeRadio(_banda.inicio);
            const x2 = xDeRadio(_banda.fin);
            const ancho_banda = Math.max(0, x2 - x1);
            return (
              <g key={`${_banda.etiqueta}-${_idx}`}>
                <rect
                  x={x1}
                  y={MARGEN_SUP}
                  width={ancho_banda}
                  height={ALTO_AREA}
                  fill={_banda.color_fondo}
                />
                {ancho_banda > 54 && (
                  <text
                    x={x1 + ancho_banda * 0.5}
                    y={MARGEN_SUP + 14}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={9.5}
                    fontFamily="var(--font-mono), monospace"
                  >
                    {_banda.etiqueta}
                  </text>
                )}
              </g>
            );
          })}

          {/* Rejilla menor (Regla 04) */}
          {[0.125, 0.375, 0.625, 0.875].map((_f) => (
            <g key={`minor-${_f}`} stroke="rgba(148,163,184,0.06)" strokeWidth={0.75}>
              <line
                x1={MARGEN_IZQ + _f * ANCHO_AREA}
                y1={MARGEN_SUP}
                x2={MARGEN_IZQ + _f * ANCHO_AREA}
                y2={y_base}
              />
              <line
                x1={MARGEN_IZQ}
                y1={MARGEN_SUP + _f * ALTO_AREA}
                x2={MARGEN_IZQ + ANCHO_AREA}
                y2={MARGEN_SUP + _f * ALTO_AREA}
              />
            </g>
          ))}

          {/* Rejilla mayor y etiquetas de ejes */}
          {marcas_y.map((_f) => {
            const y = y_base - _f * ALTO_AREA;
            const val_b = _f * datos_grafica.escala_b;
            const val_h = _f * datos_grafica.escala_h;
            return (
              <g key={`tick-y-${_f}`}>
                <line
                  x1={MARGEN_IZQ}
                  y1={y}
                  x2={MARGEN_IZQ + ANCHO_AREA}
                  y2={y}
                  stroke="rgba(148,163,184,0.14)"
                  strokeWidth={0.9}
                />
                {mostrar_b && (
                  <text
                    x={MARGEN_IZQ - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill={COLOR_CURVA_B}
                    fontSize={9.5}
                    fontFamily="var(--font-mono), monospace"
                  >
                    {formatearUnidadSI(val_b, "T", { decimales: 1 }).texto}
                  </text>
                )}
                {mostrar_h && (
                  <text
                    x={MARGEN_IZQ + ANCHO_AREA + 8}
                    y={y + 3.5}
                    textAnchor="start"
                    fill={COLOR_CURVA_H}
                    fontSize={9.5}
                    fontFamily="var(--font-mono), monospace"
                  >
                    {formatearUnidadSI(val_h, "A/m", { decimales: 1 }).texto}
                  </text>
                )}
              </g>
            );
          })}

          {marcas_x.map((_f) => {
            const x = MARGEN_IZQ + _f * ANCHO_AREA;
            const r_marca = _f * datos_grafica.r_max;
            return (
              <g key={`tick-x-${_f}`}>
                <line
                  x1={x}
                  y1={MARGEN_SUP}
                  x2={x}
                  y2={y_base}
                  stroke="rgba(148,163,184,0.14)"
                  strokeWidth={0.9}
                />
                <text
                  x={x}
                  y={y_base + 16}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={9.5}
                  fontFamily="var(--font-mono), monospace"
                >
                  {formatearUnidadSI(r_marca, "m", { decimales: 1 }).texto}
                </text>
              </g>
            );
          })}

          {/* Títulos de ejes */}
          <text
            x={MARGEN_IZQ + ANCHO_AREA * 0.5}
            y={ALTO_SVG - 10}
            textAnchor="middle"
            fill="#cbd5e1"
            fontSize={11}
            fontFamily="var(--font-mono), monospace"
          >
            Distancia radial ρ
          </text>
          {mostrar_b && (
            <text
              x={14}
              y={MARGEN_SUP + ALTO_AREA * 0.5}
              textAnchor="middle"
              fill={COLOR_CURVA_B}
              fontSize={10.5}
              fontFamily="var(--font-mono), monospace"
              transform={`rotate(-90 14 ${MARGEN_SUP + ALTO_AREA * 0.5})`}
            >
              |B(ρ)|
            </text>
          )}
          {mostrar_h && (
            <text
              x={ANCHO_SVG - 12}
              y={MARGEN_SUP + ALTO_AREA * 0.5}
              textAnchor="middle"
              fill={COLOR_CURVA_H}
              fontSize={10.5}
              fontFamily="var(--font-mono), monospace"
              transform={`rotate(90 ${ANCHO_SVG - 12} ${MARGEN_SUP + ALTO_AREA * 0.5})`}
            >
              |H(ρ)|
            </text>
          )}

          {/* Marcadores verticales de radios geométricos (a, b, c) */}
          {datos_grafica.marcadores.map((_m) => {
            const xm = xDeRadio(_m.radio);
            return (
              <g key={`marcador-${_m.etiqueta}`}>
                <line
                  x1={xm}
                  y1={MARGEN_SUP}
                  x2={xm}
                  y2={y_base}
                  stroke={_m.color}
                  strokeOpacity={0.7}
                  strokeWidth={1.25}
                  strokeDasharray="4 4"
                />
                <rect
                  x={xm - 16}
                  y={MARGEN_SUP - 18}
                  width={32}
                  height={15}
                  rx={4}
                  fill="#0b1222"
                  stroke={_m.color}
                  strokeOpacity={0.55}
                  strokeWidth={0.9}
                />
                <text
                  x={xm}
                  y={MARGEN_SUP - 7.5}
                  textAnchor="middle"
                  fill={_m.color}
                  fontSize={9.5}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  {_m.etiqueta}
                </text>
              </g>
            );
          })}

          {/* Curvas recortadas al marco */}
          <g clipPath={`url(#${prefijo_id}-clip-radial)`}>
            {/* Envolvente pico en modos dinámicos */}
            {mostrar_b && coords_envolvente && (
              <path
                d={construirTrazadoPolilinea(coords_envolvente)}
                fill="none"
                stroke={COLOR_CURVA_B}
                strokeOpacity={0.22}
                strokeWidth={1.2}
                strokeDasharray="3 4"
              />
            )}

            {/* Curva de referencia (Bessel o cuasi-estático o hilo fino) */}
            {coords_ref.length > 1 && (
              <path
                d={construirTrazadoPolilinea(coords_ref)}
                fill="none"
                stroke={datos_grafica.color_referencia}
                strokeWidth={1.8}
                strokeDasharray="2 4"
                strokeLinecap="round"
              />
            )}

            {/* Área y curva |B(ρ)| */}
            {mostrar_b && (
              <>
                <path
                  d={construirAreaBajoCurva(coords_b, y_base)}
                  fill={`url(#${prefijo_id}-relleno-b)`}
                />
                <path
                  d={construirTrazadoPolilinea(coords_b)}
                  fill="none"
                  stroke={COLOR_CURVA_B}
                  strokeWidth={2.35}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Curva |H(ρ)| */}
            {mostrar_h && (
              <path
                d={construirTrazadoPolilinea(coords_h)}
                fill="none"
                stroke={COLOR_CURVA_H}
                strokeWidth={2}
                strokeDasharray="6 3.5"
                strokeLinejoin="round"
              />
            )}
          </g>

          {/* Cursor vivo interactivo del lazo amperiano ρ */}
          <g>
            <line
              x1={x_cursor}
              y1={MARGEN_SUP}
              x2={x_cursor}
              y2={y_base}
              stroke={COLOR_CURSOR}
              strokeWidth={1.7}
            />
            {mostrar_b && (
              <circle
                cx={x_cursor}
                cy={y_cursor_b}
                r={5}
                fill={COLOR_CURVA_B}
                stroke="#f8fafc"
                strokeWidth={1.6}
              />
            )}
            {mostrar_h && (
              <circle
                cx={x_cursor}
                cy={y_cursor_h}
                r={4.2}
                fill={COLOR_CURVA_H}
                stroke="#060a13"
                strokeWidth={1.4}
              />
            )}
            <polygon
              points={`${x_cursor},${MARGEN_SUP + 2} ${x_cursor - 5},${MARGEN_SUP - 6} ${x_cursor + 5},${MARGEN_SUP - 6}`}
              fill={COLOR_CURSOR}
            />
          </g>

          {/* Línea guía y tooltip interactivo al pasar el mouse */}
          {punto_sobre && (
            <g pointerEvents="none">
              <line
                x1={x_globo}
                y1={MARGEN_SUP}
                x2={x_globo}
                y2={y_base}
                stroke="rgba(241,245,249,0.35)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <g
                transform={`translate(${
                  globo_izquierda ? x_globo - 188 : x_globo + 12
                }, ${MARGEN_SUP + 22})`}
              >
                <rect
                  x={0}
                  y={0}
                  width={176}
                  height={punto_sobre.referencia_b !== undefined ? 84 : 70}
                  rx={8}
                  fill="rgba(11, 18, 34, 0.95)"
                  stroke="rgba(56, 189, 248, 0.4)"
                  strokeWidth={1}
                />
                <text
                  x={10}
                  y={16}
                  fill="#f8fafc"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="var(--font-mono), monospace"
                >
                  ρ = {formatearUnidadSI(punto_sobre.radio, "m").texto}
                </text>
                <text
                  x={10}
                  y={30}
                  fill="#94a3b8"
                  fontSize={9}
                  fontFamily="var(--font-sans), sans-serif"
                >
                  {punto_sobre.region}
                </text>
                <text
                  x={10}
                  y={46}
                  fill={COLOR_CURVA_B}
                  fontSize={10}
                  fontFamily="var(--font-mono), monospace"
                >
                  |B| = {formatearUnidadSI(punto_sobre.magnitud_b, "T").texto}
                </text>
                <text
                  x={10}
                  y={60}
                  fill={COLOR_CURVA_H}
                  fontSize={10}
                  fontFamily="var(--font-mono), monospace"
                >
                  |H| = {formatearUnidadSI(punto_sobre.magnitud_h, "A/m").texto}
                </text>
                {punto_sobre.referencia_b !== undefined && (
                  <text
                    x={10}
                    y={74}
                    fill={datos_grafica.color_referencia}
                    fontSize={9.5}
                    fontFamily="var(--font-mono), monospace"
                  >
                    Ref = {formatearUnidadSI(punto_sobre.referencia_b, "T").texto}
                  </text>
                )}
              </g>
            </g>
          )}
        </svg>
      </div>

      {datos_grafica.aviso_maxwell_apagado && (
        <p className="mt-2.5 rounded-lg border border-rojo-anulado/35 bg-rojo-anulado/10 px-3 py-1.5 text-[11px] text-rojo-anulado">
          Término ∂D/∂t desactivado: la curva muestra el campo físico real, pero
          la Ley de Ampère incompleta predice B = 0 sobre S₂ en el entrehierro.
        </p>
      )}
    </TarjetaLaboratorio>
  );
}
