"use client";

import { useMemo } from "react";
import { AlertOctagon, Eye, SlidersHorizontal, Zap } from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import {
  DeslizadorParametro,
  InsigniaEstado,
  InterruptorLaboratorio,
  SelectorOpciones,
  SelectorSegmentado,
  TarjetaLaboratorio,
} from "@/componentes/ui";
import {
  CATALOGO_DIELECTRICOS,
  CATALOGO_MEDIOS_CONDUCTORES,
  COLORES_VECTORES,
  DOS_PI,
  UMBRAL_CUASIESTATICO_FIUBA,
  formatearGrados,
  formatearUnidadSI,
} from "@/lib/fisica";
import { combinarClases } from "@/lib/utils";
import type {
  CapasVisibles3D,
  DireccionRC,
  EscenarioLaboratorio,
  InstantaneaCapacitor,
  ModoCapacitor,
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ParametrosOndaEM,
  ResultadoGeometriaAmpere,
  ResultadoOndaEM,
  SuperficieAmperiana,
  TipoGeometriaAmpere,
  TipoPolarizacionOnda,
} from "@/tipos";

export interface PropiedadesPanelControlesSimulador {
  escenario: EscenarioLaboratorio;
  parametros_capacitor: ParametrosCapacitor;
  instantanea_capacitor: InstantaneaCapacitor;
  alCambiarCapacitor: (_parcial: Partial<ParametrosCapacitor>) => void;
  parametros_geometria: ParametrosGeometriaAmpere;
  resultado_geometria: ResultadoGeometriaAmpere;
  alCambiarGeometria: (_parcial: Partial<ParametrosGeometriaAmpere>) => void;
  parametros_onda: ParametrosOndaEM;
  resultado_onda: ResultadoOndaEM;
  alCambiarOnda: (_parcial: Partial<ParametrosOndaEM>) => void;
  capas_visibles: CapasVisibles3D;
  alCambiarCapas: (_parcial: Partial<CapasVisibles3D>) => void;
  clase_extra?: string;
}

const OPCIONES_MODO_CAPACITOR: ReadonlyArray<{
  valor: ModoCapacitor;
  etiqueta: string;
  descripcion: string;
}> = [
  {
    valor: "transitorio_rc",
    etiqueta: "Transitorio RC",
    descripcion: "Carga/descarga exponencial (Prob. 5.4)",
  },
  {
    valor: "ac_cuasiestatico",
    etiqueta: "AC Cuasi-est.",
    descripcion: "Régimen armónico uniforme (Ej. 5-9 / Prob. 5.8)",
  },
  {
    valor: "alta_frecuencia_bessel",
    etiqueta: "Bessel HF",
    descripcion: "Modos exactos J₀(kρ) y J₁(kρ) (Ej. 5-10)",
  },
];

const OPCIONES_SUPERFICIE: ReadonlyArray<{
  valor: SuperficieAmperiana;
  etiqueta: string;
  color_punto: string;
}> = [
  { valor: "S1", etiqueta: "S₁ Plana", color_punto: COLORES_VECTORES.s1 },
  { valor: "S2", etiqueta: "S₂ Maxwell", color_punto: COLORES_VECTORES.s2 },
  { valor: "ambas", etiqueta: "Ambas", color_punto: "#38bdf8" },
  { valor: "S_entrehierro", etiqueta: "Entrehierro", color_punto: "#34d399" },
];

const OPCIONES_DIRECCION_RC: ReadonlyArray<{
  valor: DireccionRC;
  etiqueta: string;
}> = [
  { valor: "carga", etiqueta: "Carga (+I)" },
  { valor: "descarga", etiqueta: "Descarga (-I)" },
];

const OPCIONES_GEOMETRIA: ReadonlyArray<{
  valor: TipoGeometriaAmpere;
  etiqueta: string;
  detalle: string;
}> = [
  {
    valor: "conductor_cilindrico",
    etiqueta: "Conductor cilíndrico macizo",
    detalle: "Ej. 3-18 y 3-19 · perfil lineal + 1/ρ",
  },
  {
    valor: "cable_coaxial",
    etiqueta: "Cable coaxial apantallado",
    detalle: "Ej. 3-20 · cancelación exterior con retorno -αI",
  },
  {
    valor: "solenoide_largo",
    etiqueta: "Solenoide largo",
    detalle: "Ej. 3-16 · campo axial uniforme B = μ₀μᵣnI",
  },
  {
    valor: "toroide",
    etiqueta: "Toroide devanado",
    detalle: "Prob. 3.11 · campo confinado H = NI/(2πρ)",
  },
];

const OPCIONES_POLARIZACION: ReadonlyArray<{
  valor: TipoPolarizacionOnda;
  etiqueta: string;
}> = [
  { valor: "lineal", etiqueta: "Lineal (E_y, H_z)" },
  { valor: "circular_derecha", etiqueta: "Circular derecha" },
];

interface PropiedadesInterruptorMaxwellDestacado {
  etiqueta: string;
  simbolo_latex: string;
  activo: boolean;
  descripcion: string;
  alAlternar: (_activo: boolean) => void;
}

function InterruptorMaxwellDestacado(
  _propiedades: PropiedadesInterruptorMaxwellDestacado,
) {
  const { etiqueta, simbolo_latex, activo, descripcion, alAlternar } =
    _propiedades;
  const color_indicador = activo ? COLORES_VECTORES.jd : "#f87171";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => alAlternar(!activo)}
      className={combinarClases(
        "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
        activo
          ? "border-slate-600/60 bg-fondo-elevado/90 text-texto-principal"
          : "border-borde-panel bg-fondo-base/55 text-texto-secundario hover:border-slate-600/45 hover:text-texto-principal",
      )}
    >
      <span className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition-[background-color,box-shadow]"
          style={{
            backgroundColor: color_indicador,
            boxShadow: `0 0 10px ${color_indicador}`,
          }}
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs font-medium leading-snug sm:text-[13px]">
            <span className="leading-snug">{etiqueta}</span>
            <span
              className="shrink-0 text-xs"
              style={{ color: color_indicador }}
            >
              <FormulaKatex expresion={simbolo_latex} />
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-texto-tenue">
            {descripcion}
          </span>
        </span>
      </span>

      <span
        aria-hidden="true"
        className={combinarClases(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
          activo ? "border-white/20" : "border-slate-700 bg-slate-800/90",
        )}
        style={
          activo
            ? {
                backgroundColor: `color-mix(in srgb, ${color_indicador} 45%, #0f172a)`,
              }
            : undefined
        }
      >
        <span
          className={combinarClases(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
            activo ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function PanelControlesSimulador(
  _propiedades: PropiedadesPanelControlesSimulador,
) {
  const {
    escenario,
    parametros_capacitor,
    instantanea_capacitor,
    alCambiarCapacitor,
    parametros_geometria,
    resultado_geometria,
    alCambiarGeometria,
    parametros_onda,
    resultado_onda,
    alCambiarOnda,
    capas_visibles,
    alCambiarCapas,
    clase_extra,
  } = _propiedades;

  const opciones_dielectricos = useMemo(() => {
    const base = CATALOGO_DIELECTRICOS.map((_mat) => ({
      valor: _mat.id,
      etiqueta: _mat.nombre,
      detalle: `εᵣ = ${_mat.permitividad_relativa} · Eᵣ = ${
        Number.isFinite(_mat.campo_ruptura_v_m)
          ? formatearUnidadSI(_mat.campo_ruptura_v_m, "V/m", { decimales: 0 })
              .texto
          : "∞"
      }`,
    }));
    return [
      ...base,
      {
        valor: "personalizado",
        etiqueta: "Personalizado",
        detalle: `εᵣ = ${parametros_capacitor.permitividad_relativa.toFixed(2)}`,
      },
    ];
  }, [parametros_capacitor.permitividad_relativa]);

  const id_dielectrico_actual = useMemo(() => {
    const coincidencia = CATALOGO_DIELECTRICOS.find(
      (_m) =>
        Math.abs(
          _m.permitividad_relativa - parametros_capacitor.permitividad_relativa,
        ) /
          Math.max(_m.permitividad_relativa, 1) <
        0.02,
    );
    return coincidencia ? coincidencia.id : "personalizado";
  }, [parametros_capacitor.permitividad_relativa]);

  const opciones_medios_onda = useMemo(() => {
    const base = [
      {
        valor: "vacio",
        etiqueta: "Vacío",
        detalle: "εᵣ = 1 · μᵣ = 1 · σ = 0 (v = c)",
      },
      ...CATALOGO_MEDIOS_CONDUCTORES.map((_m) => ({
        valor: _m.id,
        etiqueta: _m.nombre,
        detalle: `εᵣ = ${_m.permitividad_relativa} · σ = ${formatearUnidadSI(_m.conductividad_s_m, "S/m", { decimales: 1 }).texto}`,
      })),
      {
        valor: "personalizado",
        etiqueta: "Personalizado",
        detalle: `εᵣ = ${parametros_onda.permitividad_relativa.toFixed(1)} · σ = ${formatearUnidadSI(parametros_onda.conductividad_s_m, "S/m", { decimales: 1 }).texto}`,
      },
    ];
    return base;
  }, [parametros_onda.permitividad_relativa, parametros_onda.conductividad_s_m]);

  const id_medio_onda_actual = useMemo(() => {
    if (
      Math.abs(parametros_onda.permitividad_relativa - 1) < 0.02 &&
      Math.abs(parametros_onda.permeabilidad_relativa - 1) < 0.02 &&
      parametros_onda.conductividad_s_m === 0
    ) {
      return "vacio";
    }
    const coincidencia = CATALOGO_MEDIOS_CONDUCTORES.find(
      (_m) =>
        Math.abs(_m.permitividad_relativa - parametros_onda.permitividad_relativa) <
          0.2 &&
        Math.abs(_m.conductividad_s_m - parametros_onda.conductividad_s_m) <=
          Math.max(_m.conductividad_s_m * 0.05, 1e-13),
    );
    return coincidencia ? coincidencia.id : "personalizado";
  }, [
    parametros_onda.conductividad_s_m,
    parametros_onda.permeabilidad_relativa,
    parametros_onda.permitividad_relativa,
  ]);

  const radio_max_lazo_capacitor = Math.max(
    0.16,
    parametros_capacitor.radio_placa * 2.5,
  );

  const radio_max_lazo_geometria = useMemo(() => {
    const { tipo, radio_interior, radio_medio, radio_exterior } =
      parametros_geometria;
    if (tipo === "cable_coaxial") {
      return Math.max(radio_exterior * 1.8, 0.04);
    }
    if (tipo === "toroide") {
      return Math.max(radio_medio * 1.6, 0.04);
    }
    if (tipo === "solenoide_largo") {
      return Math.max(radio_interior * 2.2, 0.03);
    }
    return Math.max(radio_interior * 3.5, 0.04);
  }, [parametros_geometria]);

  return (
    <TarjetaLaboratorio
      etiqueta_superior="Consola de Parámetros Físicos"
      titulo="Controles del Experimento"
      icono={<SlidersHorizontal className="h-4 w-4" />}
      clase_extra={clase_extra}
    >
      <div className="flex flex-col gap-4">
        {/* ==================== ESCENARIO 1: CAPACITOR ==================== */}
        {escenario === "capacitor_paradoja" && (
          <>
            {/* Interruptor destacado de Maxwell ∂D/∂t */}
            <div
              className={combinarClases(
                "rounded-xl border p-2.5 transition-colors",
                parametros_capacitor.incluir_maxwell
                  ? "border-morado-frontera/45 bg-morado-frontera/[0.08] shadow-[0_0_24px_-8px_rgba(192,132,252,0.5)]"
                  : "border-rojo-anulado/55 bg-rojo-anulado/[0.11] shadow-[0_0_24px_-8px_rgba(248,113,113,0.55)]",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-texto-principal">
                  <Zap
                    className={combinarClases(
                      "h-3.5 w-3.5",
                      parametros_capacitor.incluir_maxwell
                        ? "text-morado-frontera"
                        : "text-rojo-anulado",
                    )}
                  />
                  Término de Maxwell
                </span>
                <InsigniaEstado
                  variante={
                    parametros_capacitor.incluir_maxwell ? "morado" : "rojo"
                  }
                  pulso={!parametros_capacitor.incluir_maxwell}
                >
                  {parametros_capacitor.incluir_maxwell
                    ? "Ampère-Maxwell"
                    : "Solo Ampère"}
                </InsigniaEstado>
              </div>
              <InterruptorMaxwellDestacado
                etiqueta="Corriente de desplazamiento"
                simbolo_latex="\partial\vec{D}/\partial t"
                activo={parametros_capacitor.incluir_maxwell}
                descripcion={
                  parametros_capacitor.incluir_maxwell
                    ? "Activo: S₁ y S₂ arrojan igual circulación ∮ H·dl."
                    : "Apagado: provoca la contradicción S₁ ≠ S₂ entre placas."
                }
                alAlternar={(_activo) =>
                  alCambiarCapacitor({ incluir_maxwell: _activo })
                }
              />
            </div>

            {/* Alerta visual de ruptura dieléctrica */}
            {instantanea_capacitor.hay_ruptura_dielectrica && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rojo-anulado/55 bg-rojo-anulado/15 px-3.5 py-2.5 text-xs text-red-100"
              >
                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-rojo-anulado" />
                <div>
                  <p className="font-semibold text-rojo-anulado">
                    ¡Ruptura dieléctrica detectada (E &gt; Eᵣ)!
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-red-100/90">
                    E_max ={" "}
                    {
                      formatearUnidadSI(
                        instantanea_capacitor.campo_electrico_maximo,
                        "V/m",
                      ).texto
                    }{" "}
                    supera la rigidez Eᵣ ={" "}
                    {
                      formatearUnidadSI(
                        parametros_capacitor.campo_ruptura_v_m,
                        "V/m",
                      ).texto
                    }{" "}
                    ({(instantanea_capacitor.razon_ruptura_dielectrica * 100).toFixed(0)}
                    %). Se produciría arco eléctrico en el dieléctrico.
                  </p>
                </div>
              </div>
            )}

            {/* Modo y superficie */}
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
                Régimen del Capacitor
              </p>
              <SelectorSegmentado
                opciones={OPCIONES_MODO_CAPACITOR}
                valor_actual={parametros_capacitor.modo}
                alSeleccionar={(_modo) => alCambiarCapacitor({ modo: _modo })}
                tamano="sm"
                ancho_completo
                etiqueta_aria="Seleccionar régimen físico del capacitor"
              />
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
                Superficie Amperiana (Contorno C)
              </p>
              <SelectorSegmentado
                opciones={OPCIONES_SUPERFICIE}
                valor_actual={parametros_capacitor.superficie_activa}
                alSeleccionar={(_sup) =>
                  alCambiarCapacitor({ superficie_activa: _sup })
                }
                tamano="sm"
                ancho_completo
                etiqueta_aria="Seleccionar superficie amperiana"
              />
            </div>

            {/* Geometría y Lazo */}
            <div className="space-y-2.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
                Geometría y Lazo Amperiano
              </p>
              <DeslizadorParametro
                etiqueta="Radio de placa"
                simbolo_latex="a"
                valor={parametros_capacitor.radio_placa}
                valor_formateado={
                  formatearUnidadSI(parametros_capacitor.radio_placa, "m").texto
                }
                minimo={0.01}
                maximo={0.15}
                paso={0.002}
                etiqueta_minimo="10 mm"
                etiqueta_maximo="150 mm"
                color_acento="azul"
                alCambiar={(_a) => alCambiarCapacitor({ radio_placa: _a })}
              />
              <DeslizadorParametro
                etiqueta="Separación entre placas"
                simbolo_latex="d"
                valor={parametros_capacitor.separacion_placas}
                valor_formateado={
                  formatearUnidadSI(parametros_capacitor.separacion_placas, "m")
                    .texto
                }
                minimo={0.001}
                maximo={0.04}
                paso={0.0005}
                etiqueta_minimo="1 mm"
                etiqueta_maximo="40 mm"
                color_acento="azul"
                alCambiar={(_d) => alCambiarCapacitor({ separacion_placas: _d })}
              />
              <DeslizadorParametro
                etiqueta="Radio lazo amperiano"
                simbolo_latex="\rho"
                valor={parametros_capacitor.radio_lazo}
                valor_formateado={`${
                  formatearUnidadSI(parametros_capacitor.radio_lazo, "m").texto
                } (${(
                  parametros_capacitor.radio_lazo /
                  Math.max(parametros_capacitor.radio_placa, 1e-6)
                ).toFixed(2)}a)`}
                minimo={0.002}
                maximo={radio_max_lazo_capacitor}
                paso={0.001}
                etiqueta_minimo="2 mm"
                etiqueta_maximo={
                  formatearUnidadSI(radio_max_lazo_capacitor, "m", {
                    decimales: 0,
                  }).texto
                }
                color_acento="ambar"
                alCambiar={(_rho) => alCambiarCapacitor({ radio_lazo: _rho })}
              />
            </div>

            {/* Excitación eléctrica */}
            <div className="space-y-2.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
                Excitación y Frecuencia
              </p>
              <DeslizadorParametro
                etiqueta="Tensión pico"
                simbolo_latex="V_0"
                valor={parametros_capacitor.tension_pico}
                valor_formateado={
                  formatearUnidadSI(parametros_capacitor.tension_pico, "V").texto
                }
                minimo={1}
                maximo={50000}
                paso={1}
                escala_logaritmica
                etiqueta_minimo="1 V"
                etiqueta_maximo="50 kV"
                color_acento="azul"
                alCambiar={(_v) => alCambiarCapacitor({ tension_pico: _v })}
              />

              {parametros_capacitor.modo === "transitorio_rc" ? (
                <>
                  <SelectorSegmentado
                    opciones={OPCIONES_DIRECCION_RC}
                    valor_actual={parametros_capacitor.direccion_rc}
                    alSeleccionar={(_dir) =>
                      alCambiarCapacitor({ direccion_rc: _dir })
                    }
                    tamano="sm"
                    ancho_completo
                    etiqueta_aria="Dirección del transitorio RC"
                  />
                  <DeslizadorParametro
                    etiqueta="Resistencia serie"
                    simbolo_latex="R"
                    valor={parametros_capacitor.resistencia_ohm}
                    valor_formateado={
                      formatearUnidadSI(
                        parametros_capacitor.resistencia_ohm,
                        "Ω",
                      ).texto
                    }
                    minimo={10}
                    maximo={1e6}
                    paso={10}
                    escala_logaritmica
                    etiqueta_minimo="10 Ω"
                    etiqueta_maximo="1 MΩ"
                    color_acento="naranja"
                    alCambiar={(_r) =>
                      alCambiarCapacitor({ resistencia_ohm: _r })
                    }
                  />
                  <DeslizadorParametro
                    etiqueta="Tiempo normalizado"
                    simbolo_latex="t/\tau"
                    valor={Math.min(5, Math.max(0, parametros_capacitor.fase_o_tiempo_norm))}
                    valor_formateado={`${parametros_capacitor.fase_o_tiempo_norm.toFixed(2)} τ`}
                    minimo={0}
                    maximo={5}
                    paso={0.02}
                    etiqueta_minimo="0"
                    etiqueta_maximo="5τ"
                    color_acento="verde"
                    descripcion={`τ = RC = ${formatearUnidadSI(instantanea_capacitor.constante_tiempo_rc, "s").texto}`}
                    alCambiar={(_u) =>
                      alCambiarCapacitor({ fase_o_tiempo_norm: _u })
                    }
                  />
                </>
              ) : (
                <>
                  <DeslizadorParametro
                    etiqueta="Frecuencia"
                    simbolo_latex="f"
                    valor={parametros_capacitor.frecuencia}
                    valor_formateado={
                      formatearUnidadSI(parametros_capacitor.frecuencia, "Hz")
                        .texto
                    }
                    minimo={1e3}
                    maximo={1e10}
                    paso={1}
                    escala_logaritmica
                    etiqueta_minimo="1 kHz"
                    etiqueta_maximo="10 GHz"
                    color_acento="morado"
                    descripcion={`ka = ${instantanea_capacitor.argumento_bessel_borde.toFixed(2)} · λ/(2a) = ${
                      instantanea_capacitor.razon_longitud_onda_diametro > 1e4
                        ? instantanea_capacitor.razon_longitud_onda_diametro.toExponential(1)
                        : instantanea_capacitor.razon_longitud_onda_diametro.toFixed(1)
                    }`}
                    alCambiar={(_f) => alCambiarCapacitor({ frecuencia: _f })}
                  />
                  <DeslizadorParametro
                    etiqueta="Fase instantánea"
                    simbolo_latex="\omega t"
                    valor={
                      ((parametros_capacitor.fase_o_tiempo_norm % DOS_PI) +
                        DOS_PI) %
                      DOS_PI
                    }
                    valor_formateado={formatearGrados(
                      ((parametros_capacitor.fase_o_tiempo_norm % DOS_PI) +
                        DOS_PI) %
                        DOS_PI,
                      0,
                    )}
                    minimo={0}
                    maximo={DOS_PI}
                    paso={0.03}
                    etiqueta_minimo="0°"
                    etiqueta_maximo="360°"
                    color_acento="verde"
                    alCambiar={(_theta) =>
                      alCambiarCapacitor({ fase_o_tiempo_norm: _theta })
                    }
                  />
                </>
              )}
            </div>

            {/* Medio dieléctrico real FIUBA */}
            <div className="space-y-2.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
                Medio Dieléctrico FIUBA (Cap. 2)
              </p>
              <SelectorOpciones
                etiqueta="Material entre placas"
                valor_actual={id_dielectrico_actual}
                opciones={opciones_dielectricos}
                alSeleccionar={(_id) => {
                  const mat = CATALOGO_DIELECTRICOS.find((_m) => _m.id === _id);
                  if (!mat) {
                    return;
                  }
                  alCambiarCapacitor({
                    permitividad_relativa: mat.permitividad_relativa,
                    campo_ruptura_v_m: mat.campo_ruptura_v_m,
                    conductividad_s_m:
                      mat.conductividad_s_m >= 1e-6 ? mat.conductividad_s_m : 0,
                  });
                }}
              />
              <DeslizadorParametro
                etiqueta="Permitividad relativa"
                simbolo_latex="\varepsilon_r"
                valor={parametros_capacitor.permitividad_relativa}
                valor_formateado={
                  parametros_capacitor.permitividad_relativa >= 100
                    ? parametros_capacitor.permitividad_relativa.toFixed(0)
                    : parametros_capacitor.permitividad_relativa.toFixed(2)
                }
                minimo={1}
                maximo={2100}
                paso={0.1}
                escala_logaritmica
                etiqueta_minimo="1"
                etiqueta_maximo="2100"
                color_acento="azul"
                alCambiar={(_er) =>
                  alCambiarCapacitor({ permitividad_relativa: _er })
                }
              />

              {parametros_capacitor.modo === "ac_cuasiestatico" && (
                <div className="space-y-2">
                  <InterruptorLaboratorio
                    etiqueta="Dieléctrico con pérdidas (Prob. 5.8)"
                    simbolo_latex="\sigma > 0"
                    activo={parametros_capacitor.conductividad_s_m > 0}
                    color_indicador={COLORES_VECTORES.jc}
                    compacto
                    alAlternar={(_con_perdidas) =>
                      alCambiarCapacitor({
                        conductividad_s_m: _con_perdidas ? 1e-3 : 0,
                      })
                    }
                  />
                  {parametros_capacitor.conductividad_s_m > 0 && (
                    <DeslizadorParametro
                      etiqueta="Conductividad"
                      simbolo_latex="\sigma"
                      valor={Math.max(parametros_capacitor.conductividad_s_m, 1e-6)}
                      valor_formateado={
                        formatearUnidadSI(
                          parametros_capacitor.conductividad_s_m,
                          "S/m",
                        ).texto
                      }
                      minimo={1e-6}
                      maximo={10}
                      paso={1e-6}
                      escala_logaritmica
                      etiqueta_minimo="1 µS/m"
                      etiqueta_maximo="10 S/m"
                      color_acento="ambar"
                      descripcion={`f_c = ${formatearUnidadSI(instantanea_capacitor.frecuencia_cruce, "Hz").texto}`}
                      alCambiar={(_sigma) =>
                        alCambiarCapacitor({ conductividad_s_m: _sigma })
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== ESCENARIO 2: GEOMETRÍAS AMPÈRE ==================== */}
        {escenario === "geometrias_ampere" && (
          <>
            <SelectorOpciones
              etiqueta="Geometría Clásica de Ampère (Cap. 3)"
              valor_actual={parametros_geometria.tipo}
              opciones={OPCIONES_GEOMETRIA}
              alSeleccionar={(_tipo) => alCambiarGeometria({ tipo: _tipo })}
            />

            <DeslizadorParametro
              etiqueta="Corriente eléctrica"
              simbolo_latex="I"
              valor={parametros_geometria.corriente}
              valor_formateado={
                formatearUnidadSI(parametros_geometria.corriente, "A", {
                  mostrar_signo: true,
                }).texto
              }
              minimo={-50}
              maximo={50}
              paso={0.5}
              etiqueta_minimo="-50 A"
              etiqueta_maximo="+50 A"
              color_acento="ambar"
              alCambiar={(_i) => alCambiarGeometria({ corriente: _i })}
            />

            <DeslizadorParametro
              etiqueta={
                parametros_geometria.tipo === "toroide"
                  ? "Radio interior toroide"
                  : parametros_geometria.tipo === "solenoide_largo"
                    ? "Radio del solenoide"
                    : "Radio conductor interno"
              }
              simbolo_latex="a"
              valor={parametros_geometria.radio_interior}
              valor_formateado={
                formatearUnidadSI(parametros_geometria.radio_interior, "m").texto
              }
              minimo={0.002}
              maximo={0.03}
              paso={0.001}
              etiqueta_minimo="2 mm"
              etiqueta_maximo="30 mm"
              color_acento="azul"
              alCambiar={(_a) => {
                const b_ajustado = Math.max(parametros_geometria.radio_medio, _a + 0.004);
                const c_ajustado = Math.max(
                  parametros_geometria.radio_exterior,
                  b_ajustado + 0.003,
                );
                alCambiarGeometria({
                  radio_interior: _a,
                  radio_medio: b_ajustado,
                  radio_exterior: c_ajustado,
                });
              }}
            />

            {(parametros_geometria.tipo === "cable_coaxial" ||
              parametros_geometria.tipo === "toroide") && (
              <DeslizadorParametro
                etiqueta={
                  parametros_geometria.tipo === "toroide"
                    ? "Radio exterior toroide"
                    : "Radio interior malla"
                }
                simbolo_latex="b"
                valor={parametros_geometria.radio_medio}
                valor_formateado={
                  formatearUnidadSI(parametros_geometria.radio_medio, "m").texto
                }
                minimo={parametros_geometria.radio_interior + 0.003}
                maximo={0.055}
                paso={0.001}
                etiqueta_minimo={
                  formatearUnidadSI(
                    parametros_geometria.radio_interior + 0.003,
                    "m",
                    { decimales: 0 },
                  ).texto
                }
                etiqueta_maximo="55 mm"
                color_acento="azul"
                alCambiar={(_b) => {
                  const c_ajustado = Math.max(
                    parametros_geometria.radio_exterior,
                    _b + 0.003,
                  );
                  alCambiarGeometria({
                    radio_medio: _b,
                    radio_exterior: c_ajustado,
                  });
                }}
              />
            )}

            {parametros_geometria.tipo === "cable_coaxial" && (
              <>
                <DeslizadorParametro
                  etiqueta="Radio exterior malla"
                  simbolo_latex="c"
                  valor={parametros_geometria.radio_exterior}
                  valor_formateado={
                    formatearUnidadSI(parametros_geometria.radio_exterior, "m")
                      .texto
                  }
                  minimo={parametros_geometria.radio_medio + 0.002}
                  maximo={0.065}
                  paso={0.001}
                  etiqueta_minimo={
                    formatearUnidadSI(
                      parametros_geometria.radio_medio + 0.002,
                      "m",
                      { decimales: 0 },
                    ).texto
                  }
                  etiqueta_maximo="65 mm"
                  color_acento="morado"
                  alCambiar={(_c) => alCambiarGeometria({ radio_exterior: _c })}
                />
                <DeslizadorParametro
                  etiqueta="Factor corriente de retorno"
                  simbolo_latex="\alpha"
                  valor={parametros_geometria.factor_retorno_coaxial}
                  valor_formateado={`${(
                    parametros_geometria.factor_retorno_coaxial * 100
                  ).toFixed(0)}%`}
                  minimo={0}
                  maximo={1}
                  paso={0.05}
                  etiqueta_minimo="0% (sin retorno)"
                  etiqueta_maximo="100% (apantallado)"
                  color_acento="verde"
                  descripcion="I_retorno = -α·I en la malla externa (α = 1 anula H en ρ > c)."
                  alCambiar={(_alfa) =>
                    alCambiarGeometria({ factor_retorno_coaxial: _alfa })
                  }
                />
              </>
            )}

            {parametros_geometria.tipo === "solenoide_largo" && (
              <>
                <DeslizadorParametro
                  etiqueta="Densidad de espiras"
                  simbolo_latex="n"
                  valor={parametros_geometria.espiras_por_metro}
                  valor_formateado={`${parametros_geometria.espiras_por_metro.toFixed(0)} esp/m`}
                  minimo={100}
                  maximo={5000}
                  paso={50}
                  etiqueta_minimo="100 esp/m"
                  etiqueta_maximo="5000 esp/m"
                  color_acento="morado"
                  alCambiar={(_n) => alCambiarGeometria({ espiras_por_metro: _n })}
                />
                <DeslizadorParametro
                  etiqueta="Longitud del solenoide"
                  simbolo_latex="L"
                  valor={parametros_geometria.longitud_solenoide}
                  valor_formateado={
                    formatearUnidadSI(
                      parametros_geometria.longitud_solenoide,
                      "m",
                    ).texto
                  }
                  minimo={0.05}
                  maximo={1.0}
                  paso={0.01}
                  etiqueta_minimo="50 mm"
                  etiqueta_maximo="1.0 m"
                  color_acento="azul"
                  alCambiar={(_l) => alCambiarGeometria({ longitud_solenoide: _l })}
                />
                <InterruptorLaboratorio
                  etiqueta="Corrección por solenoide finito"
                  simbolo_latex="L/\sqrt{L^2+4a^2}"
                  activo={parametros_geometria.usar_solenoide_finito}
                  color_indicador="#38bdf8"
                  compacto
                  alAlternar={(_finito) =>
                    alCambiarGeometria({ usar_solenoide_finito: _finito })
                  }
                />
              </>
            )}

            {parametros_geometria.tipo === "toroide" && (
              <DeslizadorParametro
                etiqueta="Número total de espiras"
                simbolo_latex="N"
                valor={parametros_geometria.numero_espiras_total}
                valor_formateado={`${parametros_geometria.numero_espiras_total.toFixed(0)} espiras`}
                minimo={20}
                maximo={1000}
                paso={10}
                etiqueta_minimo="20"
                etiqueta_maximo="1000"
                color_acento="morado"
                alCambiar={(_n) =>
                  alCambiarGeometria({ numero_espiras_total: _n })
                }
              />
            )}

            <DeslizadorParametro
              etiqueta="Permeabilidad del núcleo"
              simbolo_latex="\mu_{r,\text{in}}"
              valor={parametros_geometria.permeabilidad_relativa_nucleo}
              valor_formateado={
                parametros_geometria.permeabilidad_relativa_nucleo >= 10
                  ? parametros_geometria.permeabilidad_relativa_nucleo.toFixed(0)
                  : parametros_geometria.permeabilidad_relativa_nucleo.toFixed(1)
              }
              minimo={1}
              maximo={1000}
              paso={1}
              escala_logaritmica
              etiqueta_minimo="1 (vacío)"
              etiqueta_maximo="1000 (ferro)"
              color_acento="rojo"
              descripcion="Aumentá μᵣ > 1 para ver B discontinuo y H continuo en la frontera."
              alCambiar={(_mur) =>
                alCambiarGeometria({ permeabilidad_relativa_nucleo: _mur })
              }
            />

            <DeslizadorParametro
              etiqueta="Radio lazo amperiano"
              simbolo_latex="\rho"
              valor={Math.min(
                parametros_geometria.radio_lazo,
                radio_max_lazo_geometria,
              )}
              valor_formateado={
                formatearUnidadSI(parametros_geometria.radio_lazo, "m").texto
              }
              minimo={0.001}
              maximo={radio_max_lazo_geometria}
              paso={0.0005}
              etiqueta_minimo="1 mm"
              etiqueta_maximo={
                formatearUnidadSI(radio_max_lazo_geometria, "m", {
                  decimales: 0,
                }).texto
              }
              color_acento="ambar"
              descripcion={resultado_geometria.region_descripcion}
              alCambiar={(_rho) => alCambiarGeometria({ radio_lazo: _rho })}
            />
          </>
        )}

        {/* ==================== ESCENARIO 3: ONDA EM ==================== */}
        {escenario === "onda_electromagnetica" && (
          <>
            {/* Interruptor destacado de Maxwell ∂D/∂t */}
            <div
              className={combinarClases(
                "rounded-xl border p-2.5 transition-colors",
                parametros_onda.incluir_maxwell
                  ? "border-morado-frontera/45 bg-morado-frontera/[0.08]"
                  : "border-rojo-anulado/55 bg-rojo-anulado/[0.11]",
              )}
            >
              <InterruptorMaxwellDestacado
                etiqueta="Acoplamiento de Maxwell"
                simbolo_latex="\partial\vec{D}/\partial t"
                activo={parametros_onda.incluir_maxwell}
                descripcion={
                  parametros_onda.incluir_maxwell
                    ? "Activo: Faraday y Ampère-Maxwell sostienen la propagación EM."
                    : "Apagado: la onda colapsa y el campo magnético acoplado desaparece."
                }
                alAlternar={(_activo) =>
                  alCambiarOnda({ incluir_maxwell: _activo })
                }
              />
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
                Polarización de la Onda
              </p>
              <SelectorSegmentado
                opciones={OPCIONES_POLARIZACION}
                valor_actual={parametros_onda.polarizacion}
                alSeleccionar={(_pol) => alCambiarOnda({ polarizacion: _pol })}
                tamano="sm"
                ancho_completo
                etiqueta_aria="Seleccionar polarización de la onda"
              />
            </div>

            <DeslizadorParametro
              etiqueta="Amplitud eléctrica"
              simbolo_latex="E_0"
              valor={parametros_onda.amplitud_e0}
              valor_formateado={
                formatearUnidadSI(parametros_onda.amplitud_e0, "V/m").texto
              }
              minimo={1}
              maximo={1000}
              paso={1}
              escala_logaritmica
              etiqueta_minimo="1 V/m"
              etiqueta_maximo="1 kV/m"
              color_acento="azul"
              alCambiar={(_e0) => alCambiarOnda({ amplitud_e0: _e0 })}
            />

            <DeslizadorParametro
              etiqueta="Frecuencia"
              simbolo_latex="f"
              valor={parametros_onda.frecuencia}
              valor_formateado={
                formatearUnidadSI(parametros_onda.frecuencia, "Hz").texto
              }
              minimo={1e5}
              maximo={1e11}
              paso={1}
              escala_logaritmica
              etiqueta_minimo="100 kHz"
              etiqueta_maximo="100 GHz"
              color_acento="morado"
              descripcion={`λ = ${formatearUnidadSI(resultado_onda.longitud_onda, "m").texto} · v_p = ${formatearUnidadSI(resultado_onda.velocidad_fase, "m/s").texto}`}
              alCambiar={(_f) => alCambiarOnda({ frecuencia: _f })}
            />

            <SelectorOpciones
              etiqueta="Medio de Propagación"
              valor_actual={id_medio_onda_actual}
              opciones={opciones_medios_onda}
              alSeleccionar={(_id) => {
                if (_id === "vacio") {
                  alCambiarOnda({
                    permitividad_relativa: 1,
                    permeabilidad_relativa: 1,
                    conductividad_s_m: 0,
                  });
                  return;
                }
                const med = CATALOGO_MEDIOS_CONDUCTORES.find(
                  (_m) => _m.id === _id,
                );
                if (!med) {
                  return;
                }
                alCambiarOnda({
                  permitividad_relativa: med.permitividad_relativa,
                  permeabilidad_relativa: med.permeabilidad_relativa,
                  conductividad_s_m:
                    med.conductividad_s_m >= 1e-10 ? med.conductividad_s_m : 0,
                });
              }}
            />

            <DeslizadorParametro
              etiqueta="Permitividad relativa"
              simbolo_latex="\varepsilon_r"
              valor={parametros_onda.permitividad_relativa}
              valor_formateado={parametros_onda.permitividad_relativa.toFixed(2)}
              minimo={1}
              maximo={80}
              paso={0.1}
              escala_logaritmica
              etiqueta_minimo="1"
              etiqueta_maximo="80"
              color_acento="azul"
              alCambiar={(_er) => alCambiarOnda({ permitividad_relativa: _er })}
            />

            <DeslizadorParametro
              etiqueta="Permeabilidad relativa"
              simbolo_latex="\mu_r"
              valor={parametros_onda.permeabilidad_relativa}
              valor_formateado={parametros_onda.permeabilidad_relativa.toFixed(2)}
              minimo={1}
              maximo={20}
              paso={0.1}
              escala_logaritmica
              etiqueta_minimo="1"
              etiqueta_maximo="20"
              color_acento="rojo"
              alCambiar={(_mur) =>
                alCambiarOnda({ permeabilidad_relativa: _mur })
              }
            />

            <div className="space-y-2">
              <InterruptorLaboratorio
                etiqueta="Medio con pérdidas (atenuación)"
                simbolo_latex="\sigma > 0,\; e^{-\alpha x}"
                activo={parametros_onda.conductividad_s_m > 0}
                color_indicador={COLORES_VECTORES.jc}
                compacto
                alAlternar={(_activo) =>
                  alCambiarOnda({ conductividad_s_m: _activo ? 0.05 : 0 })
                }
              />
              {parametros_onda.conductividad_s_m > 0 && (
                <DeslizadorParametro
                  etiqueta="Conductividad del medio"
                  simbolo_latex="\sigma"
                  valor={Math.max(parametros_onda.conductividad_s_m, 1e-5)}
                  valor_formateado={
                    formatearUnidadSI(parametros_onda.conductividad_s_m, "S/m")
                      .texto
                  }
                  minimo={1e-5}
                  maximo={10}
                  paso={1e-5}
                  escala_logaritmica
                  etiqueta_minimo="10 µS/m"
                  etiqueta_maximo="10 S/m"
                  color_acento="ambar"
                  descripcion={`Profundidad pelicular δ = ${
                    Number.isFinite(resultado_onda.profundidad_pelicular)
                      ? formatearUnidadSI(
                          resultado_onda.profundidad_pelicular,
                          "m",
                        ).texto
                      : "∞"
                  }`}
                  alCambiar={(_s) => alCambiarOnda({ conductividad_s_m: _s })}
                />
              )}
            </div>

            {/* Tamaño del sistema D y criterio cuasi-estático FIUBA */}
            <div className="space-y-2 rounded-xl border border-borde-panel bg-fondo-base/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-texto-principal">
                  Criterio Cuasi-estático (<FormulaKatex expresion="\lambda/D \ge 10" />)
                </span>
                <InsigniaEstado
                  variante={
                    resultado_onda.regimen_modelado === "cuasiestatico"
                      ? "verde"
                      : resultado_onda.regimen_modelado === "distribuido"
                        ? "ambar"
                        : "morado"
                  }
                >
                  {resultado_onda.regimen_modelado === "cuasiestatico"
                    ? "Cuasi-estático"
                    : resultado_onda.regimen_modelado === "distribuido"
                      ? "Distribuido"
                      : "Campo completo"}
                </InsigniaEstado>
              </div>
              <DeslizadorParametro
                etiqueta="Tamaño del sistema"
                simbolo_latex="D"
                valor={parametros_onda.dimension_caracteristica}
                valor_formateado={
                  formatearUnidadSI(
                    parametros_onda.dimension_caracteristica,
                    "m",
                  ).texto
                }
                minimo={0.005}
                maximo={2.0}
                paso={0.005}
                escala_logaritmica
                etiqueta_minimo="5 mm"
                etiqueta_maximo="2 m"
                color_acento="verde"
                descripcion={`λ/D = ${
                  resultado_onda.razon_longitud_onda_dimension > 1e4
                    ? resultado_onda.razon_longitud_onda_dimension.toExponential(1)
                    : resultado_onda.razon_longitud_onda_dimension.toFixed(2)
                } (umbral FIUBA: ${UMBRAL_CUASIESTATICO_FIUBA})`}
                alCambiar={(_d) =>
                  alCambiarOnda({ dimension_caracteristica: _d })
                }
              />
            </div>
          </>
        )}

        {/* ==================== CAPAS VISUALES 3D ==================== */}
        <div className="border-t border-borde-panel pt-3.5">
          <p className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-texto-secundario">
            <Eye className="h-3.5 w-3.5 text-azul-activo" />
            Capas Vectoriales 3D
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
            {escenario !== "geometrias_ampere" && (
              <InterruptorLaboratorio
                etiqueta="Campo eléctrico"
                simbolo_latex="\vec{E}"
                activo={capas_visibles.mostrar_e}
                color_indicador={COLORES_VECTORES.e}
                compacto
                alAlternar={(_v) => alCambiarCapas({ mostrar_e: _v })}
              />
            )}
            {escenario === "capacitor_paradoja" && (
              <InterruptorLaboratorio
                etiqueta="Desplazamiento"
                simbolo_latex="\vec{D}"
                activo={capas_visibles.mostrar_d}
                color_indicador={COLORES_VECTORES.d}
                compacto
                alAlternar={(_v) => alCambiarCapas({ mostrar_d: _v })}
              />
            )}
            <InterruptorLaboratorio
              etiqueta="Campo magnético"
              simbolo_latex="\vec{B}/\vec{H}"
              activo={capas_visibles.mostrar_b_h}
              color_indicador={COLORES_VECTORES.b}
              compacto
              alAlternar={(_v) => alCambiarCapas({ mostrar_b_h: _v })}
            />
            {escenario !== "onda_electromagnetica" && (
              <InterruptorLaboratorio
                etiqueta="Conducción"
                simbolo_latex="\vec{J}_c"
                activo={capas_visibles.mostrar_jc}
                color_indicador={COLORES_VECTORES.jc}
                compacto
                alAlternar={(_v) => alCambiarCapas({ mostrar_jc: _v })}
              />
            )}
            {escenario === "capacitor_paradoja" && (
              <InterruptorLaboratorio
                etiqueta="Desplazamiento"
                simbolo_latex="\vec{J}_d"
                activo={capas_visibles.mostrar_jd}
                color_indicador={COLORES_VECTORES.jd}
                compacto
                alAlternar={(_v) => alCambiarCapas({ mostrar_jd: _v })}
              />
            )}
            {escenario !== "geometrias_ampere" && (
              <InterruptorLaboratorio
                etiqueta="Vector de Poynting"
                simbolo_latex="\vec{N}"
                activo={capas_visibles.mostrar_poynting}
                color_indicador={COLORES_VECTORES.n}
                compacto
                alAlternar={(_v) => alCambiarCapas({ mostrar_poynting: _v })}
              />
            )}
            {escenario === "capacitor_paradoja" && (
              <InterruptorLaboratorio
                etiqueta="Cargas en placas y cables"
                simbolo_latex="\pm q"
                activo={capas_visibles.mostrar_cargas}
                color_indicador="#fbbf24"
                compacto
                alAlternar={(_v) => alCambiarCapas({ mostrar_cargas: _v })}
              />
            )}
            {escenario !== "onda_electromagnetica" && (
              <InterruptorLaboratorio
                etiqueta="Lazo C y superficies"
                simbolo_latex="C,\,S"
                activo={capas_visibles.mostrar_lazo_y_superficie}
                color_indicador={COLORES_VECTORES.lazo}
                compacto
                alAlternar={(_v) =>
                  alCambiarCapas({ mostrar_lazo_y_superficie: _v })
                }
              />
            )}
            <InterruptorLaboratorio
              etiqueta="Rejilla y ejes XYZ"
              activo={capas_visibles.mostrar_rejilla_y_ejes}
              color_indicador="#94a3b8"
              compacto
              alAlternar={(_v) =>
                alCambiarCapas({ mostrar_rejilla_y_ejes: _v })
              }
            />
          </div>
        </div>
      </div>
    </TarjetaLaboratorio>
  );
}
