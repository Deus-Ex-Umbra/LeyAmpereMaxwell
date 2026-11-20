"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type {
  CasoCalculadora,
  MagnitudResumen,
  ModoCapacitorCalculadora,
  ParametrosCasoACapacitor,
  ParametrosCasoBConductor,
  ParametrosCasoCArmonico,
  ResultadoCalculadora,
  TipoConductorCalculadora,
} from "@/tipos";
import {
  CATALOGO_DIELECTRICOS,
  CATALOGO_MEDIOS_CONDUCTORES,
  CEROS_BESSEL_J0,
  DOS_PI,
  PERMITIVIDAD_VACIO,
  VELOCIDAD_LUZ,
  formatearGrados,
  formatearUnidadSI,
  obtenerDielectricoPorId,
  obtenerMedioPorId,
  resolverCasoACapacitor,
  resolverCasoBConductor,
  resolverCasoCArmonico,
} from "@/lib/fisica";
import {
  DeslizadorParametro,
  InsigniaEstado,
  InterruptorLaboratorio,
  SelectorOpciones,
  SelectorSegmentado,
  TarjetaLaboratorio,
  type OpcionSegmentada,
  type OpcionSelector,
} from "@/componentes/ui";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { PasoAnaliticoDeus } from "@/componentes/ecuaciones/paso-analitico-deus";
import { combinarClases } from "@/lib/utils";

export interface PropiedadesModuloCalculadora {
  caso_inicial?: CasoCalculadora;
  alAbrirPreset?: (_preset_id: string) => void;
}

interface EjemploRapidoFIUBA {
  id: string;
  etiqueta: string;
  subtitulo: string;
  caso: CasoCalculadora;
  preset_simulador_id?: string;
  dielectrico_id?: string;
  medio_id?: string;
  parametros_a?: Partial<ParametrosCasoACapacitor>;
  parametros_b?: Partial<ParametrosCasoBConductor>;
  parametros_c?: Partial<ParametrosCasoCArmonico>;
}

const FRECUENCIA_CRUCE_PROB_5_8 = 1e-3 / (DOS_PI * PERMITIVIDAD_VACIO * 10);
const FRECUENCIA_PRIMER_CERO_J0_AIRE =
  (CEROS_BESSEL_J0[0] * (VELOCIDAD_LUZ / Math.sqrt(1.0006))) / (DOS_PI * 0.05);

const CASO_A_DEFECTO: ParametrosCasoACapacitor = {
  modo: "ac_cuasiestatico",
  radio_placa: 0.05,
  separacion_placas: 0.01,
  tension_pico: 100,
  frecuencia: 1e6,
  permitividad_relativa: 1.0006,
  conductividad_s_m: 0,
  campo_ruptura_v_m: 3e6,
  resistencia_ohm: 1000,
  direccion_rc: "carga",
  tiempo_normalizado_rc: Math.LN2,
  fase_rad: Math.PI * 0.35,
  radio_evaluacion: 0.065,
};

const CASO_B_DEFECTO: ParametrosCasoBConductor = {
  tipo: "conductor_cilindrico",
  corriente: 20,
  radio_interior: 0.01,
  radio_medio: 0.018,
  radio_exterior: 0.024,
  factor_retorno_coaxial: 1,
  permeabilidad_relativa_nucleo: 1,
  radio_evaluacion: 0.007,
};

const CASO_C_DEFECTO: ParametrosCasoCArmonico = {
  amplitud_e0: 100,
  frecuencia: 8.99e8,
  permitividad_relativa: 80,
  permeabilidad_relativa: 1,
  conductividad_s_m: 4.0,
  radio_evaluacion: 0.02,
  dimension_caracteristica: 0.1,
  tiempo_s: 2.5e-10,
};

const OPCIONES_CASO: ReadonlyArray<OpcionSegmentada<CasoCalculadora>> = [
  {
    valor: "caso_a_capacitor",
    etiqueta: "Caso A · Capacitor Circular",
    descripcion: "DC / Transitorio RC / AC con pérdidas, S₁ vs S₂ y Poynting",
    color_punto: "#38bdf8",
  },
  {
    valor: "caso_b_conductor",
    etiqueta: "Caso B · Conductor y Coaxial",
    descripcion: "Conductor cilíndrico (Ej. 3-19) y cable coaxial (Ej. 3-20)",
    color_punto: "#fbbf24",
  },
  {
    valor: "caso_c_armonico",
    etiqueta: "Caso C · Armónico y Pérdidas",
    descripcion: "Régimen σ vs ωε (Ej. 3-7 / Prob. 5.8) y criterio Bessel",
    color_punto: "#c084fc",
  },
];

const OPCIONES_MODO_CAPACITOR: ReadonlyArray<
  OpcionSegmentada<ModoCapacitorCalculadora>
> = [
  {
    valor: "ac_cuasiestatico",
    etiqueta: "AC Senoidal",
    descripcion: "V(t) = V₀ cos(ωt), admite dieléctrico con pérdidas σ ≥ 0",
    color_punto: "#38bdf8",
  },
  {
    valor: "transitorio_rc",
    etiqueta: "Transitorio RC (DC)",
    descripcion: "Carga o descarga exponencial con constante τ = RC",
    color_punto: "#34d399",
  },
];

const OPCIONES_DIRECCION_RC: ReadonlyArray<
  OpcionSegmentada<"carga" | "descarga">
> = [
  { valor: "carga", etiqueta: "Carga RC" },
  { valor: "descarga", etiqueta: "Descarga RC" },
];

const OPCIONES_TIPO_CONDUCTOR: ReadonlyArray<
  OpcionSegmentada<TipoConductorCalculadora>
> = [
  {
    valor: "conductor_cilindrico",
    etiqueta: "Conductor cilíndrico (Ej. 3-19)",
    color_punto: "#fbbf24",
  },
  {
    valor: "cable_coaxial",
    etiqueta: "Cable coaxial (Ej. 3-20)",
    color_punto: "#34d399",
  },
];

const EJEMPLOS_RAPIDOS_FIUBA: readonly EjemploRapidoFIUBA[] = [
  {
    id: "calc-ej-5-9",
    etiqueta: "Ej. 5-9",
    subtitulo: "Paradoja S₁ vs S₂ (AC)",
    caso: "caso_a_capacitor",
    preset_simulador_id: "fiuba-ej-5-9-paradoja",
    dielectrico_id: "aire",
    parametros_a: {
      modo: "ac_cuasiestatico",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 100,
      frecuencia: 1e6,
      permitividad_relativa: 1.0006,
      conductividad_s_m: 0,
      campo_ruptura_v_m: 3e6,
      fase_rad: Math.PI * 0.35,
      radio_evaluacion: 0.065,
    },
  },
  {
    id: "calc-prob-5-4",
    etiqueta: "Prob. 5.4",
    subtitulo: "Carga RC en t = τ ln 2",
    caso: "caso_a_capacitor",
    preset_simulador_id: "fiuba-prob-5-4-rc",
    dielectrico_id: "vidrio",
    parametros_a: {
      modo: "transitorio_rc",
      radio_placa: 0.06,
      separacion_placas: 0.004,
      tension_pico: 50,
      permitividad_relativa: 4.0,
      conductividad_s_m: 0,
      campo_ruptura_v_m: 30e6,
      resistencia_ohm: 1000,
      direccion_rc: "carga",
      tiempo_normalizado_rc: Math.LN2,
      radio_evaluacion: 0.045,
    },
  },
  {
    id: "calc-prob-5-8",
    etiqueta: "Prob. 5.8",
    subtitulo: "Capacitor con pérdidas",
    caso: "caso_a_capacitor",
    preset_simulador_id: "fiuba-prob-5-8-perdidas",
    parametros_a: {
      modo: "ac_cuasiestatico",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 120,
      frecuencia: FRECUENCIA_CRUCE_PROB_5_8,
      permitividad_relativa: 10,
      conductividad_s_m: 1e-3,
      campo_ruptura_v_m: 20e6,
      fase_rad: Math.PI * 0.25,
      radio_evaluacion: 0.04,
    },
  },
  {
    id: "calc-ej-3-19",
    etiqueta: "Ej. 3-19",
    subtitulo: "Conductor μ_r = 50",
    caso: "caso_b_conductor",
    preset_simulador_id: "fiuba-ej-3-19-conductor-ferro",
    parametros_b: {
      tipo: "conductor_cilindrico",
      corriente: 25,
      radio_interior: 0.01,
      permeabilidad_relativa_nucleo: 50,
      radio_evaluacion: 0.007,
    },
  },
  {
    id: "calc-ej-3-20",
    etiqueta: "Ej. 3-20",
    subtitulo: "Cable coaxial apantallado",
    caso: "caso_b_conductor",
    preset_simulador_id: "fiuba-ej-3-20-coaxial",
    parametros_b: {
      tipo: "cable_coaxial",
      corriente: 18,
      radio_interior: 0.005,
      radio_medio: 0.018,
      radio_exterior: 0.024,
      factor_retorno_coaxial: 1,
      permeabilidad_relativa_nucleo: 1,
      radio_evaluacion: 0.03,
    },
  },
  {
    id: "calc-ej-3-7",
    etiqueta: "Ej. 3-7",
    subtitulo: "Agua de mar (σ = ωε)",
    caso: "caso_c_armonico",
    preset_simulador_id: "fiuba-ej-3-7-agua-mar",
    medio_id: "agua_mar",
    parametros_c: {
      amplitud_e0: 100,
      frecuencia: 8.99e8,
      conductividad_s_m: 4.0,
      permitividad_relativa: 80,
      permeabilidad_relativa: 1,
      radio_evaluacion: 0.02,
      dimension_caracteristica: 0.1,
      tiempo_s: 2.5e-10,
    },
  },
  {
    id: "calc-ej-5-10",
    etiqueta: "Ej. 5-10",
    subtitulo: "Bessel J₀(ka) = 0",
    caso: "caso_c_armonico",
    preset_simulador_id: "fiuba-ej-5-10-bessel",
    medio_id: "vidrio_aislante",
    parametros_c: {
      amplitud_e0: 1e4,
      frecuencia: FRECUENCIA_PRIMER_CERO_J0_AIRE,
      conductividad_s_m: 1e-14,
      permitividad_relativa: 1.0006,
      permeabilidad_relativa: 1,
      radio_evaluacion: 0.05,
      dimension_caracteristica: 0.1,
      tiempo_s: 1e-10,
    },
  },
];

const CLASES_COLOR_RESUMEN: Record<MagnitudResumen["color_token"], string> = {
  azul: "border-azul-activo/30 bg-azul-activo/[0.06] text-azul-activo",
  rojo: "border-rojo-anulado/30 bg-rojo-anulado/[0.06] text-rojo-anulado",
  verde: "border-verde-inducido/30 bg-verde-inducido/[0.06] text-verde-inducido",
  morado: "border-morado-frontera/30 bg-morado-frontera/[0.06] text-morado-frontera",
  naranja: "border-naranja-constante/30 bg-naranja-constante/[0.06] text-naranja-constante",
  ambar: "border-ambar-destacar/30 bg-ambar-destacar/[0.06] text-ambar-destacar",
  cian: "border-sky-500/35 bg-sky-500/[0.08] text-azul-activo",
};

const OPCIONES_DIELECTRICOS: ReadonlyArray<OpcionSelector<string>> =
  CATALOGO_DIELECTRICOS.map((_mat) => ({
    valor: _mat.id,
    etiqueta: _mat.nombre,
    detalle: Number.isFinite(_mat.campo_ruptura_v_m)
      ? `ε_r = ${_mat.permitividad_relativa} · E_r = ${formatearUnidadSI(_mat.campo_ruptura_v_m, "V/m", { decimales: 0 }).texto}`
      : `ε_r = ${_mat.permitividad_relativa} · sin ruptura`,
  }));

const OPCIONES_MEDIOS: ReadonlyArray<OpcionSelector<string>> =
  CATALOGO_MEDIOS_CONDUCTORES.map((_medio) => ({
    valor: _medio.id,
    etiqueta: _medio.nombre,
    detalle: `σ = ${formatearUnidadSI(_medio.conductividad_s_m, "S/m", { decimales: 1 }).texto} · ε_r = ${_medio.permitividad_relativa}`,
  }));

function construirDocumentoLatex(_resultado: ResultadoCalculadora): string {
  const lineas: string[] = [
    `% ${ _resultado.titulo } (${ _resultado.referencia_fiuba })`,
    `\\subsection*{${_resultado.titulo}}`,
    `\\solucion`,
    "",
  ];

  for (const paso of _resultado.pasos) {
    lineas.push(`\\paso{${paso.numero}}{${paso.titulo}}`);
    lineas.push("\\begin{align*}");
    const sufijo_nota = paso.nota_conceptual
      ? ` && \\nota{${paso.nota_conceptual}}`
      : "";
    lineas.push(`  ${paso.expresion_latex}${sufijo_nota}`);
    lineas.push("\\end{align*}");
    if (paso.verificacion_dimensional) {
      lineas.push(`% Verificación SI: $${paso.verificacion_dimensional}$`);
    }
    lineas.push("");
  }

  return lineas.join("\n");
}

export function ModuloCalculadora(_propiedades: PropiedadesModuloCalculadora) {
  const { caso_inicial = "caso_a_capacitor", alAbrirPreset } = _propiedades;

  const [caso_activo, setCasoActivo] = useState<CasoCalculadora>(caso_inicial);
  const [ejemplo_activo_id, setEjemploActivoId] = useState<string | null>(
    "calc-ej-5-9",
  );
  const [dielectrico_a_id, setDielectricoAId] = useState<string>("aire");
  const [medio_c_id, setMedioCId] = useState<string>("agua_mar");
  const [perdidas_activas_a, setPerdidasActivasA] = useState<boolean>(false);
  const [copiado_latex, setCopiadoLatex] = useState<boolean>(false);

  const [parametros_a, setParametrosA] =
    useState<ParametrosCasoACapacitor>(CASO_A_DEFECTO);
  const [parametros_b, setParametrosB] =
    useState<ParametrosCasoBConductor>(CASO_B_DEFECTO);
  const [parametros_c, setParametrosC] =
    useState<ParametrosCasoCArmonico>(CASO_C_DEFECTO);

  const resultado = useMemo<ResultadoCalculadora>(() => {
    if (caso_activo === "caso_a_capacitor") {
      return resolverCasoACapacitor(parametros_a);
    }
    if (caso_activo === "caso_b_conductor") {
      return resolverCasoBConductor(parametros_b);
    }
    return resolverCasoCArmonico(parametros_c);
  }, [caso_activo, parametros_a, parametros_b, parametros_c]);

  const ejemplo_seleccionado = useMemo(
    () =>
      EJEMPLOS_RAPIDOS_FIUBA.find((_ej) => _ej.id === ejemplo_activo_id) ?? null,
    [ejemplo_activo_id],
  );

  function aplicarEjemplo(_ejemplo: EjemploRapidoFIUBA): void {
    setCasoActivo(_ejemplo.caso);
    setEjemploActivoId(_ejemplo.id);

    if (_ejemplo.caso === "caso_a_capacitor" && _ejemplo.parametros_a) {
      const siguiente_a: ParametrosCasoACapacitor = {
        ...CASO_A_DEFECTO,
        ..._ejemplo.parametros_a,
      };
      setParametrosA(siguiente_a);
      setPerdidasActivasA(siguiente_a.conductividad_s_m > 0);
      if (_ejemplo.dielectrico_id) {
        setDielectricoAId(_ejemplo.dielectrico_id);
      }
    } else if (_ejemplo.caso === "caso_b_conductor" && _ejemplo.parametros_b) {
      setParametrosB({ ...CASO_B_DEFECTO, ..._ejemplo.parametros_b });
    } else if (_ejemplo.caso === "caso_c_armonico" && _ejemplo.parametros_c) {
      setParametrosC({ ...CASO_C_DEFECTO, ..._ejemplo.parametros_c });
      if (_ejemplo.medio_id) {
        setMedioCId(_ejemplo.medio_id);
      }
    }
  }

  function reiniciarCasoActual(): void {
    setEjemploActivoId(null);
    if (caso_activo === "caso_a_capacitor") {
      setParametrosA(CASO_A_DEFECTO);
      setDielectricoAId("aire");
      setPerdidasActivasA(false);
    } else if (caso_activo === "caso_b_conductor") {
      setParametrosB(CASO_B_DEFECTO);
    } else {
      setParametrosC(CASO_C_DEFECTO);
      setMedioCId("agua_mar");
    }
  }

  function seleccionarDielectricoA(_id_material: string): void {
    const material = obtenerDielectricoPorId(_id_material);
    setDielectricoAId(material.id);
    setEjemploActivoId(null);
    setParametrosA((_previo) => ({
      ..._previo,
      permitividad_relativa: material.permitividad_relativa,
      campo_ruptura_v_m: material.campo_ruptura_v_m,
      conductividad_s_m: perdidas_activas_a
        ? Math.max(material.conductividad_s_m, 1e-6)
        : 0,
    }));
  }

  function seleccionarMedioC(_id_medio: string): void {
    const medio = obtenerMedioPorId(_id_medio);
    setMedioCId(medio.id);
    setEjemploActivoId(null);
    setParametrosC((_previo) => ({
      ..._previo,
      conductividad_s_m: Math.max(medio.conductividad_s_m, 1e-12),
      permitividad_relativa: medio.permitividad_relativa,
      permeabilidad_relativa: medio.permeabilidad_relativa,
    }));
  }

  async function manejarCopiarLatex(): Promise<void> {
    const bloque_latex = construirDocumentoLatex(resultado);
    try {
      await navigator.clipboard.writeText(bloque_latex);
      setCopiadoLatex(true);
      window.setTimeout(() => setCopiadoLatex(false), 2200);
    } catch {
      setCopiadoLatex(false);
    }
  }

  const radio_max_a = Math.max(parametros_a.radio_placa * 3, 0.05);
  const radio_max_b =
    parametros_b.tipo === "cable_coaxial"
      ? Math.max(parametros_b.radio_exterior * 2.4, 0.04)
      : Math.max(parametros_b.radio_interior * 4, 0.04);

  return (
    <div className="flex flex-col gap-5">
      <TarjetaLaboratorio
        variante="elevada"
        etiqueta_superior="Módulo 2 · Resolución Analítica Rigurosa"
        titulo="Calculadora Analítica Paso a Paso"
        subtitulo="Desarrollo simbólico-numérico estilo cuaderno universitario con verificación dimensional SI e invariantes exactos."
        icono={<Calculator className="h-4 w-4" />}
        acciones_derecha={
          <button
            type="button"
            onClick={reiniciarCasoActual}
            className="inline-flex items-center gap-1.5 rounded-lg border border-borde-panel bg-fondo-base/75 px-3 py-1.5 text-xs font-medium text-texto-secundario transition-colors hover:border-slate-500/60 hover:text-texto-principal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectorSegmentado
            opciones={OPCIONES_CASO}
            valor_actual={caso_activo}
            alSeleccionar={(_nuevo_caso) => {
              setCasoActivo(_nuevo_caso);
              setEjemploActivoId(null);
            }}
            etiqueta_aria="Seleccionar caso analítico"
            ancho_completo
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-texto-tenue">
              <Sparkles className="h-3.5 w-3.5 text-ambar-destacar" />
              <span>Ejemplos rápidos del curso FIUBA</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EJEMPLOS_RAPIDOS_FIUBA.map((_ejemplo) => {
                const esta_activo = _ejemplo.id === ejemplo_activo_id;
                return (
                  <button
                    key={_ejemplo.id}
                    type="button"
                    onClick={() => aplicarEjemplo(_ejemplo)}
                    className={combinarClases(
                      "inline-flex flex-col items-start rounded-xl border px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
                      esta_activo
                        ? "border-azul-activo/50 bg-azul-activo/15 text-texto-principal"
                        : "border-borde-panel bg-fondo-base/60 text-texto-secundario hover:border-slate-500/50 hover:text-texto-principal",
                    )}
                  >
                    <span className="font-mono text-[11px] font-semibold text-azul-activo">
                      {_ejemplo.etiqueta}
                    </span>
                    <span className="text-[11px] leading-tight">
                      {_ejemplo.subtitulo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </TarjetaLaboratorio>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)]">
        <TarjetaLaboratorio
          etiqueta_superior="Parámetros de entrada"
          titulo={
            caso_activo === "caso_a_capacitor"
              ? "Capacitor Circular"
              : caso_activo === "caso_b_conductor"
                ? "Conductor / Coaxial"
                : "Campo Armónico y Medio"
          }
          clase_cuerpo="flex flex-col gap-3"
        >
          {caso_activo === "caso_a_capacitor" && (
            <>
              <SelectorSegmentado
                opciones={OPCIONES_MODO_CAPACITOR}
                valor_actual={parametros_a.modo}
                tamano="sm"
                ancho_completo
                etiqueta_aria="Modo de excitación del capacitor"
                alSeleccionar={(_modo) => {
                  setEjemploActivoId(null);
                  setParametrosA((_previo) => ({ ..._previo, modo: _modo }));
                }}
              />

              <SelectorOpciones
                etiqueta="Dieléctrico entre placas (tabla Cap. 2)"
                valor_actual={dielectrico_a_id}
                opciones={OPCIONES_DIELECTRICOS}
                alSeleccionar={seleccionarDielectricoA}
              />

              <DeslizadorParametro
                etiqueta="Radio de placa"
                simbolo_latex="a"
                valor={parametros_a.radio_placa}
                valor_formateado={
                  formatearUnidadSI(parametros_a.radio_placa, "m").texto
                }
                minimo={0.005}
                maximo={0.2}
                paso={0.001}
                etiqueta_minimo="5 mm"
                etiqueta_maximo="200 mm"
                color_acento="azul"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosA((_previo) => ({
                    ..._previo,
                    radio_placa: _valor,
                    radio_evaluacion: Math.min(
                      _previo.radio_evaluacion,
                      Math.max(_valor * 3, 0.05),
                    ),
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Separación entre placas"
                simbolo_latex="d"
                valor={parametros_a.separacion_placas}
                valor_formateado={
                  formatearUnidadSI(parametros_a.separacion_placas, "m").texto
                }
                minimo={0.0005}
                maximo={0.05}
                paso={0.0005}
                etiqueta_minimo="0.5 mm"
                etiqueta_maximo="50 mm"
                color_acento="azul"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosA((_previo) => ({
                    ..._previo,
                    separacion_placas: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Tensión pico"
                simbolo_latex="V_0"
                valor={parametros_a.tension_pico}
                valor_formateado={
                  formatearUnidadSI(parametros_a.tension_pico, "V").texto
                }
                minimo={1}
                maximo={5e4}
                paso={1}
                escala_logaritmica
                etiqueta_minimo="1 V"
                etiqueta_maximo="50 kV"
                color_acento="ambar"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosA((_previo) => ({
                    ..._previo,
                    tension_pico: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Permitividad relativa"
                simbolo_latex="\varepsilon_r"
                valor={parametros_a.permitividad_relativa}
                valor_formateado={parametros_a.permitividad_relativa.toFixed(
                  parametros_a.permitividad_relativa < 2 ? 4 : 1,
                )}
                minimo={1}
                maximo={2100}
                paso={0.1}
                escala_logaritmica
                etiqueta_minimo="1 (vacío)"
                etiqueta_maximo="2100"
                color_acento="morado"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosA((_previo) => ({
                    ..._previo,
                    permitividad_relativa: _valor,
                  }));
                }}
              />

              {parametros_a.modo === "ac_cuasiestatico" ? (
                <>
                  <DeslizadorParametro
                    etiqueta="Frecuencia"
                    simbolo_latex="f"
                    valor={parametros_a.frecuencia}
                    valor_formateado={
                      formatearUnidadSI(parametros_a.frecuencia, "Hz").texto
                    }
                    minimo={10}
                    maximo={5e9}
                    paso={10}
                    escala_logaritmica
                    etiqueta_minimo="10 Hz"
                    etiqueta_maximo="5 GHz"
                    color_acento="verde"
                    alCambiar={(_valor) => {
                      setEjemploActivoId(null);
                      setParametrosA((_previo) => ({
                        ..._previo,
                        frecuencia: _valor,
                      }));
                    }}
                  />

                  <DeslizadorParametro
                    etiqueta="Fase instantánea"
                    simbolo_latex="\omega t"
                    valor={parametros_a.fase_rad}
                    valor_formateado={formatearGrados(parametros_a.fase_rad, 0)}
                    minimo={0}
                    maximo={DOS_PI}
                    paso={0.05}
                    etiqueta_minimo="0°"
                    etiqueta_maximo="360°"
                    color_acento="azul"
                    alCambiar={(_valor) => {
                      setEjemploActivoId(null);
                      setParametrosA((_previo) => ({
                        ..._previo,
                        fase_rad: _valor,
                      }));
                    }}
                  />

                  <InterruptorLaboratorio
                    etiqueta="Dieléctrico con pérdidas"
                    simbolo_latex="\sigma > 0"
                    activo={perdidas_activas_a}
                    color_indicador="#c084fc"
                    compacto
                    alAlternar={(_activo) => {
                      setPerdidasActivasA(_activo);
                      setEjemploActivoId(null);
                      setParametrosA((_previo) => ({
                        ..._previo,
                        conductividad_s_m: _activo
                          ? Math.max(_previo.conductividad_s_m, 1e-3)
                          : 0,
                      }));
                    }}
                  />

                  {perdidas_activas_a && (
                    <DeslizadorParametro
                      etiqueta="Conductividad"
                      simbolo_latex="\sigma"
                      valor={Math.max(parametros_a.conductividad_s_m, 1e-6)}
                      valor_formateado={
                        formatearUnidadSI(parametros_a.conductividad_s_m, "S/m")
                          .texto
                      }
                      minimo={1e-6}
                      maximo={10}
                      paso={1e-6}
                      escala_logaritmica
                      etiqueta_minimo="1 µS/m"
                      etiqueta_maximo="10 S/m"
                      color_acento="morado"
                      alCambiar={(_valor) => {
                        setEjemploActivoId(null);
                        setParametrosA((_previo) => ({
                          ..._previo,
                          conductividad_s_m: _valor,
                        }));
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  <SelectorSegmentado
                    opciones={OPCIONES_DIRECCION_RC}
                    valor_actual={parametros_a.direccion_rc}
                    tamano="sm"
                    ancho_completo
                    etiqueta_aria="Dirección del transitorio RC"
                    alSeleccionar={(_direccion) => {
                      setEjemploActivoId(null);
                      setParametrosA((_previo) => ({
                        ..._previo,
                        direccion_rc: _direccion,
                      }));
                    }}
                  />

                  <DeslizadorParametro
                    etiqueta="Resistencia serie"
                    simbolo_latex="R"
                    valor={parametros_a.resistencia_ohm}
                    valor_formateado={
                      formatearUnidadSI(parametros_a.resistencia_ohm, "Ω").texto
                    }
                    minimo={10}
                    maximo={1e6}
                    paso={10}
                    escala_logaritmica
                    etiqueta_minimo="10 Ω"
                    etiqueta_maximo="1 MΩ"
                    color_acento="naranja"
                    alCambiar={(_valor) => {
                      setEjemploActivoId(null);
                      setParametrosA((_previo) => ({
                        ..._previo,
                        resistencia_ohm: _valor,
                      }));
                    }}
                  />

                  <DeslizadorParametro
                    etiqueta="Instante normalizado"
                    simbolo_latex="t / \tau"
                    valor={parametros_a.tiempo_normalizado_rc}
                    valor_formateado={`${parametros_a.tiempo_normalizado_rc.toFixed(2)} τ`}
                    minimo={0}
                    maximo={5}
                    paso={0.05}
                    etiqueta_minimo="0 τ"
                    etiqueta_maximo="5 τ"
                    color_acento="verde"
                    alCambiar={(_valor) => {
                      setEjemploActivoId(null);
                      setParametrosA((_previo) => ({
                        ..._previo,
                        tiempo_normalizado_rc: _valor,
                      }));
                    }}
                  />
                </>
              )}

              <DeslizadorParametro
                etiqueta="Radio amperiano de evaluación"
                simbolo_latex="\rho"
                valor={Math.min(parametros_a.radio_evaluacion, radio_max_a)}
                valor_formateado={`${formatearUnidadSI(parametros_a.radio_evaluacion, "m").texto} (${(parametros_a.radio_evaluacion / parametros_a.radio_placa).toFixed(2)}a)`}
                minimo={0.001}
                maximo={radio_max_a}
                paso={0.001}
                etiqueta_minimo="1 mm"
                etiqueta_maximo={
                  formatearUnidadSI(radio_max_a, "m", { decimales: 0 }).texto
                }
                color_acento="rojo"
                descripcion={
                  parametros_a.radio_evaluacion <= parametros_a.radio_placa
                    ? "Punto interior (ρ ≤ a): H crece linealmente con ρ."
                    : "Punto exterior (ρ > a): H decae como 1/ρ."
                }
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosA((_previo) => ({
                    ..._previo,
                    radio_evaluacion: _valor,
                  }));
                }}
              />
            </>
          )}

          {caso_activo === "caso_b_conductor" && (
            <>
              <SelectorSegmentado
                opciones={OPCIONES_TIPO_CONDUCTOR}
                valor_actual={parametros_b.tipo}
                tamano="sm"
                ancho_completo
                etiqueta_aria="Tipo de geometría conductora"
                alSeleccionar={(_tipo) => {
                  setEjemploActivoId(null);
                  setParametrosB((_previo) => ({ ..._previo, tipo: _tipo }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Corriente libre"
                simbolo_latex="I"
                valor={parametros_b.corriente}
                valor_formateado={
                  formatearUnidadSI(parametros_b.corriente, "A").texto
                }
                minimo={0.5}
                maximo={200}
                paso={0.5}
                etiqueta_minimo="0.5 A"
                etiqueta_maximo="200 A"
                color_acento="ambar"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosB((_previo) => ({
                    ..._previo,
                    corriente: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Radio del núcleo"
                simbolo_latex="a"
                valor={parametros_b.radio_interior}
                valor_formateado={
                  formatearUnidadSI(parametros_b.radio_interior, "m").texto
                }
                minimo={0.002}
                maximo={0.03}
                paso={0.001}
                etiqueta_minimo="2 mm"
                etiqueta_maximo="30 mm"
                color_acento="azul"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosB((_previo) => {
                    const nuevo_b = Math.max(_previo.radio_medio, _valor + 0.003);
                    const nuevo_c = Math.max(_previo.radio_exterior, nuevo_b + 0.003);
                    return {
                      ..._previo,
                      radio_interior: _valor,
                      radio_medio: nuevo_b,
                      radio_exterior: nuevo_c,
                    };
                  });
                }}
              />

              <DeslizadorParametro
                etiqueta="Permeabilidad del núcleo"
                simbolo_latex="\mu_r"
                valor={parametros_b.permeabilidad_relativa_nucleo}
                valor_formateado={parametros_b.permeabilidad_relativa_nucleo.toFixed(
                  parametros_b.permeabilidad_relativa_nucleo < 10 ? 1 : 0,
                )}
                minimo={1}
                maximo={500}
                paso={1}
                escala_logaritmica
                etiqueta_minimo="1 (aire)"
                etiqueta_maximo="500"
                color_acento="morado"
                descripcion="H es continuo en ρ = a; si μ_r > 1, B presenta un salto de factor μ_r."
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosB((_previo) => ({
                    ..._previo,
                    permeabilidad_relativa_nucleo: _valor,
                  }));
                }}
              />

              {parametros_b.tipo === "cable_coaxial" && (
                <>
                  <DeslizadorParametro
                    etiqueta="Radio interior blindaje"
                    simbolo_latex="b"
                    valor={parametros_b.radio_medio}
                    valor_formateado={
                      formatearUnidadSI(parametros_b.radio_medio, "m").texto
                    }
                    minimo={parametros_b.radio_interior + 0.002}
                    maximo={0.05}
                    paso={0.001}
                    etiqueta_minimo={
                      formatearUnidadSI(
                        parametros_b.radio_interior + 0.002,
                        "m",
                        { decimales: 1 },
                      ).texto
                    }
                    etiqueta_maximo="50 mm"
                    color_acento="verde"
                    alCambiar={(_valor) => {
                      setEjemploActivoId(null);
                      setParametrosB((_previo) => ({
                        ..._previo,
                        radio_medio: _valor,
                        radio_exterior: Math.max(
                          _previo.radio_exterior,
                          _valor + 0.002,
                        ),
                      }));
                    }}
                  />

                  <DeslizadorParametro
                    etiqueta="Radio exterior blindaje"
                    simbolo_latex="c"
                    valor={parametros_b.radio_exterior}
                    valor_formateado={
                      formatearUnidadSI(parametros_b.radio_exterior, "m").texto
                    }
                    minimo={parametros_b.radio_medio + 0.002}
                    maximo={0.07}
                    paso={0.001}
                    etiqueta_minimo={
                      formatearUnidadSI(
                        parametros_b.radio_medio + 0.002,
                        "m",
                        { decimales: 1 },
                      ).texto
                    }
                    etiqueta_maximo="70 mm"
                    color_acento="verde"
                    alCambiar={(_valor) => {
                      setEjemploActivoId(null);
                      setParametrosB((_previo) => ({
                        ..._previo,
                        radio_exterior: _valor,
                      }));
                    }}
                  />

                  <DeslizadorParametro
                    etiqueta="Factor de corriente retorno"
                    simbolo_latex="\alpha"
                    valor={parametros_b.factor_retorno_coaxial}
                    valor_formateado={parametros_b.factor_retorno_coaxial.toFixed(
                      2,
                    )}
                    minimo={0}
                    maximo={1}
                    paso={0.05}
                    etiqueta_minimo="0 (sin retorno)"
                    etiqueta_maximo="1 (apantallado)"
                    color_acento="naranja"
                    descripcion="Con α = 1 el retorno cancela I en ρ > c (apantallamiento ideal)."
                    alCambiar={(_valor) => {
                      setEjemploActivoId(null);
                      setParametrosB((_previo) => ({
                        ..._previo,
                        factor_retorno_coaxial: _valor,
                      }));
                    }}
                  />
                </>
              )}

              <DeslizadorParametro
                etiqueta="Radio amperiano de evaluación"
                simbolo_latex="\rho"
                valor={Math.min(parametros_b.radio_evaluacion, radio_max_b)}
                valor_formateado={
                  formatearUnidadSI(parametros_b.radio_evaluacion, "m").texto
                }
                minimo={0.0005}
                maximo={radio_max_b}
                paso={0.0005}
                etiqueta_minimo="0.5 mm"
                etiqueta_maximo={
                  formatearUnidadSI(radio_max_b, "m", { decimales: 0 }).texto
                }
                color_acento="rojo"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosB((_previo) => ({
                    ..._previo,
                    radio_evaluacion: _valor,
                  }));
                }}
              />
            </>
          )}

          {caso_activo === "caso_c_armonico" && (
            <>
              <SelectorOpciones
                etiqueta="Medio electromagnético (Cap. 3 y 5)"
                valor_actual={medio_c_id}
                opciones={OPCIONES_MEDIOS}
                alSeleccionar={seleccionarMedioC}
              />

              <DeslizadorParametro
                etiqueta="Amplitud eléctrica"
                simbolo_latex="E_0"
                valor={parametros_c.amplitud_e0}
                valor_formateado={
                  formatearUnidadSI(parametros_c.amplitud_e0, "V/m").texto
                }
                minimo={1}
                maximo={1e5}
                paso={1}
                escala_logaritmica
                etiqueta_minimo="1 V/m"
                etiqueta_maximo="100 kV/m"
                color_acento="azul"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosC((_previo) => ({
                    ..._previo,
                    amplitud_e0: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Frecuencia"
                simbolo_latex="f"
                valor={parametros_c.frecuencia}
                valor_formateado={
                  formatearUnidadSI(parametros_c.frecuencia, "Hz").texto
                }
                minimo={10}
                maximo={3e10}
                paso={10}
                escala_logaritmica
                etiqueta_minimo="10 Hz"
                etiqueta_maximo="30 GHz"
                color_acento="verde"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosC((_previo) => ({
                    ..._previo,
                    frecuencia: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Conductividad"
                simbolo_latex="\sigma"
                valor={Math.max(parametros_c.conductividad_s_m, 1e-12)}
                valor_formateado={
                  formatearUnidadSI(parametros_c.conductividad_s_m, "S/m").texto
                }
                minimo={1e-12}
                maximo={1e8}
                paso={1e-12}
                escala_logaritmica
                etiqueta_minimo="1 pS/m"
                etiqueta_maximo="100 MS/m"
                color_acento="morado"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosC((_previo) => ({
                    ..._previo,
                    conductividad_s_m: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Permitividad relativa"
                simbolo_latex="\varepsilon_r"
                valor={parametros_c.permitividad_relativa}
                valor_formateado={parametros_c.permitividad_relativa.toFixed(1)}
                minimo={1}
                maximo={100}
                paso={0.5}
                etiqueta_minimo="1"
                etiqueta_maximo="100"
                color_acento="azul"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosC((_previo) => ({
                    ..._previo,
                    permitividad_relativa: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Permeabilidad relativa"
                simbolo_latex="\mu_r"
                valor={parametros_c.permeabilidad_relativa}
                valor_formateado={parametros_c.permeabilidad_relativa.toFixed(1)}
                minimo={1}
                maximo={100}
                paso={0.5}
                escala_logaritmica
                etiqueta_minimo="1"
                etiqueta_maximo="100"
                color_acento="morado"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosC((_previo) => ({
                    ..._previo,
                    permeabilidad_relativa: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Radio de evaluación"
                simbolo_latex="\rho"
                valor={parametros_c.radio_evaluacion}
                valor_formateado={
                  formatearUnidadSI(parametros_c.radio_evaluacion, "m").texto
                }
                minimo={0.002}
                maximo={0.25}
                paso={0.002}
                etiqueta_minimo="2 mm"
                etiqueta_maximo="250 mm"
                color_acento="rojo"
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosC((_previo) => ({
                    ..._previo,
                    radio_evaluacion: _valor,
                  }));
                }}
              />

              <DeslizadorParametro
                etiqueta="Dimensión del dispositivo"
                simbolo_latex="D"
                valor={parametros_c.dimension_caracteristica}
                valor_formateado={
                  formatearUnidadSI(parametros_c.dimension_caracteristica, "m")
                    .texto
                }
                minimo={0.01}
                maximo={1}
                paso={0.01}
                etiqueta_minimo="10 mm"
                etiqueta_maximo="1 m"
                color_acento="naranja"
                descripcion="Evalúa el criterio cuasi-estático λ ≥ 10 D (Cap. 1)."
                alCambiar={(_valor) => {
                  setEjemploActivoId(null);
                  setParametrosC((_previo) => ({
                    ..._previo,
                    dimension_caracteristica: _valor,
                  }));
                }}
              />
            </>
          )}
        </TarjetaLaboratorio>

        <div className="flex min-w-0 flex-col gap-5">
          <TarjetaLaboratorio
            etiqueta_superior={resultado.referencia_fiuba}
            titulo={resultado.titulo}
            acciones_derecha={
              <div className="flex flex-wrap items-center gap-2">
                {alAbrirPreset && ejemplo_seleccionado?.preset_simulador_id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (ejemplo_seleccionado.preset_simulador_id) {
                        alAbrirPreset(ejemplo_seleccionado.preset_simulador_id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-azul-activo/35 bg-azul-activo/12 px-3 py-1.5 text-xs font-medium text-azul-activo transition-colors hover:bg-azul-activo/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir en Simulador 3D
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    void manejarCopiarLatex();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-borde-panel bg-fondo-base/80 px-3 py-1.5 text-xs font-medium text-texto-principal transition-colors hover:border-azul-activo/40 hover:text-azul-activo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60"
                >
                  {copiado_latex ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-verde-inducido" />
                      LaTeX copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar LaTeX
                    </>
                  )}
                </button>
              </div>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {resultado.resumen_magnitudes.map((_magnitud) => (
                  <div
                    key={_magnitud.etiqueta}
                    className={combinarClases(
                      "rounded-xl border px-3.5 py-3",
                      CLASES_COLOR_RESUMEN[_magnitud.color_token],
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-texto-secundario">
                        {_magnitud.etiqueta}
                      </span>
                      <span className="shrink-0 text-xs">
                        <FormulaKatex expresion={_magnitud.simbolo_latex} />
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-base font-semibold tabular-nums text-texto-principal">
                      {_magnitud.valor_formateado}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde-panel bg-fondo-base/65 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-texto-principal">
                  <CheckCircle2
                    className={combinarClases(
                      "h-4 w-4 shrink-0",
                      resultado.verificacion_invariante.cumple
                        ? "text-verde-inducido"
                        : "text-rojo-anulado",
                    )}
                  />
                  <span className="font-medium">
                    {resultado.verificacion_invariante.etiqueta}
                  </span>
                </div>
                <InsigniaEstado
                  variante={
                    resultado.verificacion_invariante.cumple ? "verde" : "rojo"
                  }
                  con_punto
                >
                  {resultado.verificacion_invariante.cumple
                    ? `Invariante exacto · ε = ${resultado.verificacion_invariante.error_relativo.toExponential(1)}`
                    : `Desviación · ε = ${resultado.verificacion_invariante.error_relativo.toExponential(2)}`}
                </InsigniaEstado>
              </div>

              {resultado.alertas.length > 0 && (
                <div
                  role="alert"
                  className="flex flex-col gap-1.5 rounded-xl border border-ambar-destacar/40 bg-ambar-destacar/[0.08] px-4 py-3 text-xs text-amber-100"
                >
                  {resultado.alertas.map((_alerta) => (
                    <div key={_alerta} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ambar-destacar" />
                      <span>{_alerta}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {resultado.pasos.map((_paso, _indice) => (
                  <PasoAnaliticoDeus
                    key={_paso.numero}
                    paso={_paso}
                    es_ultimo={_indice === resultado.pasos.length - 1}
                  />
                ))}
              </div>
            </div>
          </TarjetaLaboratorio>
        </div>
      </div>
    </div>
  );
}
