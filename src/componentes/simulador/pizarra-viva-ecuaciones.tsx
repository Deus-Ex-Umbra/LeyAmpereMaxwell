"use client";

import { useState } from "react";
import { Sigma, Sparkles } from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { InsigniaEstado, TarjetaLaboratorio } from "@/componentes/ui";
import {
  COLORES_VECTORES,
  formatearNumeroLatex,
  formatearUnidadSI,
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

export type ClaveTerminoResaltado =
  | "rotacional_h"
  | "corriente_conduccion"
  | "corriente_desplazamiento"
  | "campo_electrico"
  | "campo_magnetico"
  | "poynting";

export interface PropiedadesPizarraVivaEcuaciones {
  escenario: EscenarioLaboratorio;
  parametros_capacitor: ParametrosCapacitor;
  instantanea_capacitor: InstantaneaCapacitor;
  parametros_geometria: ParametrosGeometriaAmpere;
  resultado_geometria: ResultadoGeometriaAmpere;
  parametros_onda: ParametrosOndaEM;
  resultado_onda: ResultadoOndaEM;
  termino_resaltado?: string | null;
  alResaltarTermino?: (_termino_id: string | null) => void;
  clase_extra?: string;
}

interface TarjetaTerminoInteractivo {
  id: ClaveTerminoResaltado;
  titulo: string;
  simbolo_latex: string;
  valor_si: string;
  color: string;
  descripcion: string;
}

export function PizarraVivaEcuaciones(
  _propiedades: PropiedadesPizarraVivaEcuaciones,
) {
  const {
    escenario,
    parametros_capacitor,
    instantanea_capacitor,
    parametros_geometria,
    resultado_geometria,
    parametros_onda,
    resultado_onda,
    termino_resaltado = null,
    alResaltarTermino,
    clase_extra,
  } = _propiedades;

  const [termino_fijado, setTerminoFijado] = useState<string | null>(null);

  function manejarClicTermino(_id: ClaveTerminoResaltado): void {
    if (!alResaltarTermino) {
      return;
    }
    if (termino_fijado === _id) {
      setTerminoFijado(null);
      alResaltarTermino(null);
      return;
    }
    setTerminoFijado(_id);
    alResaltarTermino(_id);
  }

  function manejarSobreTermino(_id: ClaveTerminoResaltado | null): void {
    if (!alResaltarTermino || termino_fijado !== null) {
      return;
    }
    alResaltarTermino(_id);
  }

  let ecuacion_simbolica = "";
  let ecuacion_sustituida = "";
  let ecuacion_auxiliar = "";
  let insignia_contexto = "";
  let terminos: TarjetaTerminoInteractivo[] = [];

  if (escenario === "capacitor_paradoja") {
    const ic = instantanea_capacitor.superficie_s2.corriente_conduccion;
    const id = instantanea_capacitor.superficie_s2.corriente_desplazamiento;
    const circ_h = instantanea_capacitor.superficie_s2.circulacion_h;
    const maxwell_on = parametros_capacitor.incluir_maxwell;

    insignia_contexto =
      parametros_capacitor.modo === "alta_frecuencia_bessel"
        ? `Modo Bessel · ka = ${instantanea_capacitor.argumento_bessel_borde.toFixed(2)}`
        : parametros_capacitor.modo === "transitorio_rc"
          ? `RC · t/τ = ${parametros_capacitor.fase_o_tiempo_norm.toFixed(2)}`
          : "AC Cuasi-estático";

    ecuacion_simbolica = maxwell_on
      ? "\\azul{\\oint_C \\vec{H}\\cdot d\\vec{l}} = \\naranja{I_c} + \\morado{\\frac{d}{dt}\\iint_S \\vec{D}\\cdot d\\vec{S}}"
      : "\\azul{\\oint_C \\vec{H}\\cdot d\\vec{l}} = \\naranja{I_c} + \\tachar{\\frac{d\\Phi_D}{dt}}";

    const texto_circ = formatearNumeroLatex(circ_h, "A", {
      decimales: 2,
      mostrar_signo: true,
    });
    const texto_ic = formatearNumeroLatex(ic, "A", {
      decimales: 2,
      mostrar_signo: true,
    });
    const texto_id = formatearNumeroLatex(id, "A", {
      decimales: 2,
      mostrar_signo: true,
    });

    ecuacion_sustituida = maxwell_on
      ? `\\azul{${texto_circ}} = \\naranja{${texto_ic}} + \\morado{(${texto_id})}`
      : `\\azul{${texto_circ}} \\;\\rojo{\\neq}\\; \\naranja{${texto_ic}} + \\rojo{0\\,\\text{A}}`;

    if (parametros_capacitor.modo === "alta_frecuencia_bessel") {
      const ka_txt = instantanea_capacitor.argumento_bessel_borde.toFixed(3);
      const b_lazo_txt = formatearNumeroLatex(instantanea_capacitor.campo_b_lazo, "T", {
        decimales: 2,
        mostrar_signo: true,
      });
      ecuacion_auxiliar = `E_z(\\rho)=E_0 J_0(k\\rho)\\cos\\omega t,\\quad ka=${ka_txt},\\quad B_\\phi(\\rho)=${b_lazo_txt}`;
    } else {
      const c_txt = formatearNumeroLatex(instantanea_capacitor.capacitancia, "F", {
        decimales: 2,
      });
      const p_ent_txt = formatearNumeroLatex(
        instantanea_capacitor.potencia_entrante_poynting,
        "W",
        { decimales: 2, mostrar_signo: true },
      );
      ecuacion_auxiliar = `C = ${c_txt},\\quad P_{\\text{Poynting}} = \\oint (-\\verde{\\vec{N}})\\cdot d\\vec{S} = \\verde{${p_ent_txt}}`;
    }

    terminos = [
      {
        id: "rotacional_h",
        titulo: "Circulación H",
        simbolo_latex: "\\oint_C \\vec{H}\\cdot d\\vec{l}",
        valor_si: formatearUnidadSI(
          instantanea_capacitor.superficie_entrehierro.circulacion_h,
          "A",
          { mostrar_signo: true },
        ).texto,
        color: COLORES_VECTORES.lazo,
        descripcion: "Circulación sobre el lazo amperiano C",
      },
      {
        id: "corriente_conduccion",
        titulo: "Conducción",
        simbolo_latex: "\\vec{J}_c / I_c",
        valor_si: formatearUnidadSI(instantanea_capacitor.corriente_cable, "A", {
          mostrar_signo: true,
        }).texto,
        color: COLORES_VECTORES.jc,
        descripcion: "Corriente libre en conductores / pérdidas",
      },
      {
        id: "corriente_desplazamiento",
        titulo: "Desplazamiento",
        simbolo_latex: "\\partial\\vec{D}/\\partial t",
        valor_si: maxwell_on
          ? formatearUnidadSI(
              instantanea_capacitor.corriente_desplazamiento_entrehierro,
              "A",
              { mostrar_signo: true },
            ).texto
          : "Desactivado",
        color: COLORES_VECTORES.jd,
        descripcion: "Término de Maxwell en el entrehierro",
      },
      {
        id: "campo_electrico",
        titulo: "Campo Eléctrico",
        simbolo_latex: "\\vec{E},\\,\\vec{D}",
        valor_si: formatearUnidadSI(instantanea_capacitor.campo_e_eje, "V/m", {
          mostrar_signo: true,
        }).texto,
        color: COLORES_VECTORES.e,
        descripcion: "Campo axial E_z y desplazamiento D = εE",
      },
      {
        id: "campo_magnetico",
        titulo: "Campo Magnético",
        simbolo_latex: "\\vec{B}(\\rho),\\,\\vec{H}",
        valor_si: formatearUnidadSI(instantanea_capacitor.campo_b_lazo, "T", {
          mostrar_signo: true,
        }).texto,
        color: COLORES_VECTORES.b,
        descripcion: "Campo azimutal inducido en el radio ρ",
      },
      {
        id: "poynting",
        titulo: "Poynting",
        simbolo_latex: "\\vec{N} = \\vec{E}\\times\\vec{H}",
        valor_si: formatearUnidadSI(
          instantanea_capacitor.potencia_entrante_poynting,
          "W",
          { mostrar_signo: true },
        ).texto,
        color: COLORES_VECTORES.n,
        descripcion: "Flujo radial de energía por el borde",
      },
    ];
  } else if (escenario === "geometrias_ampere") {
    insignia_contexto = "Magnetostática · Cap. 3";
    ecuacion_simbolica =
      "\\azul{\\oint_C \\vec{H}\\cdot d\\vec{l}} = \\naranja{I_{\\text{enc}}}, \\qquad \\vec{B} = \\mu_0\\mu_r\\,\\vec{H}";

    const circ_txt = formatearNumeroLatex(resultado_geometria.circulacion_h, "A", {
      decimales: 2,
      mostrar_signo: true,
    });
    const i_enc_txt = formatearNumeroLatex(
      resultado_geometria.corriente_encerrada,
      "A",
      { decimales: 2, mostrar_signo: true },
    );
    const b_txt = formatearNumeroLatex(resultado_geometria.campo_b, "T", {
      decimales: 2,
      mostrar_signo: true,
    });
    const h_txt = formatearNumeroLatex(resultado_geometria.campo_h, "A/m", {
      decimales: 2,
      mostrar_signo: true,
    });

    ecuacion_sustituida = `\\azul{${circ_txt}} = \\naranja{${i_enc_txt}},\\qquad B(\\rho) = \\rojo{${b_txt}},\\quad H(\\rho) = ${h_txt}`;

    if (parametros_geometria.tipo === "conductor_cilindrico") {
      ecuacion_auxiliar =
        parametros_geometria.radio_lazo <= parametros_geometria.radio_interior
          ? "H_\\phi(\\rho) = \\frac{I\\,\\rho}{2\\pi a^2}\\;(\\rho \\le a),\\quad \\mu_r = " +
            parametros_geometria.permeabilidad_relativa_nucleo.toFixed(1)
          : "H_\\phi(\\rho) = \\frac{I}{2\\pi\\rho}\\;(\\rho > a),\\quad B = \\mu_0 H";
    } else if (parametros_geometria.tipo === "cable_coaxial") {
      ecuacion_auxiliar = `I_{\\text{ext}} = I(1 - \\alpha) = ${formatearNumeroLatex(
        parametros_geometria.corriente * (1 - parametros_geometria.factor_retorno_coaxial),
        "A",
      )},\\quad \\alpha = ${parametros_geometria.factor_retorno_coaxial.toFixed(2)}`;
    } else if (parametros_geometria.tipo === "solenoide_largo") {
      ecuacion_auxiliar = `H_{\\text{int}} = nI = ${formatearNumeroLatex(
        parametros_geometria.espiras_por_metro * parametros_geometria.corriente,
        "A/m",
      )},\\quad B_{\\text{ideal}} = ${formatearNumeroLatex(
        resultado_geometria.campo_b_solenoide_ideal,
        "T",
      )}`;
    } else {
      ecuacion_auxiliar = `H_\\phi(\\rho) = \\frac{N I}{2\\pi\\rho}\\;(R_{\\text{int}}\\le\\rho\\le R_{\\text{ext}}),\\quad N = ${parametros_geometria.numero_espiras_total}`;
    }

    terminos = [
      {
        id: "rotacional_h",
        titulo: "Circulación H",
        simbolo_latex: "\\oint_C \\vec{H}\\cdot d\\vec{l}",
        valor_si: formatearUnidadSI(resultado_geometria.circulacion_h, "A", {
          mostrar_signo: true,
        }).texto,
        color: COLORES_VECTORES.lazo,
        descripcion: "Integral cerrada sobre el contorno C",
      },
      {
        id: "corriente_conduccion",
        titulo: "Corriente libre",
        simbolo_latex: "I_{\\text{enc}}",
        valor_si: formatearUnidadSI(resultado_geometria.corriente_encerrada, "A", {
          mostrar_signo: true,
        }).texto,
        color: COLORES_VECTORES.jc,
        descripcion: "Corriente neta abrazada por el lazo",
      },
      {
        id: "corriente_desplazamiento",
        titulo: "Desplazamiento",
        simbolo_latex: "\\partial\\vec{D}/\\partial t",
        valor_si: "0.00 A (DC)",
        color: COLORES_VECTORES.jd,
        descripcion: "Nulo en régimen magnetostático",
      },
      {
        id: "campo_magnetico",
        titulo: "Campo B y H",
        simbolo_latex: "\\vec{B},\\,\\vec{H}",
        valor_si: formatearUnidadSI(resultado_geometria.campo_b, "T", {
          mostrar_signo: true,
        }).texto,
        color: COLORES_VECTORES.b,
        descripcion: "Inducción magnética en el radio actual",
      },
    ];
  } else {
    const maxwell_on = parametros_onda.incluir_maxwell;
    insignia_contexto = maxwell_on
      ? `n = ${resultado_onda.indice_refraccion.toFixed(2)} · λ/D = ${resultado_onda.razon_longitud_onda_dimension.toFixed(1)}`
      : "Propagación desactivada";

    ecuacion_simbolica = maxwell_on
      ? "\\azul{\\nabla\\times\\vec{E}} = -\\frac{\\partial\\vec{B}}{\\partial t},\\qquad \\rojo{\\nabla\\times\\vec{H}} = \\naranja{\\sigma\\vec{E}} + \\morado{\\frac{\\partial\\vec{D}}{\\partial t}}"
      : "\\azul{\\nabla\\times\\vec{E}} = -\\frac{\\partial\\vec{B}}{\\partial t},\\qquad \\rojo{\\nabla\\times\\vec{H}} = \\naranja{\\sigma\\vec{E}} + \\tachar{\\frac{\\partial\\vec{D}}{\\partial t}}";

    const vp_txt = formatearNumeroLatex(resultado_onda.velocidad_fase, "m/s", {
      decimales: 2,
    });
    const lam_txt = formatearNumeroLatex(resultado_onda.longitud_onda, "m", {
      decimales: 2,
    });
    const eta_txt = formatearNumeroLatex(
      resultado_onda.impedancia_intrinseca.modulo,
      "\\Omega",
      { decimales: 1 },
    );

    ecuacion_sustituida = maxwell_on
      ? `v_p = \\azul{${vp_txt}},\\quad \\lambda = \\morado{${lam_txt}},\\quad |\\eta| = ${eta_txt}`
      : "\\rojo{\\text{Sin } \\partial\\vec{D}/\\partial t \\text{ no existe ecuación de onda ni radiación electromagnética}}";

    const poynting_txt = formatearNumeroLatex(
      resultado_onda.poynting_promedio_origen,
      "\\text{W/m}^2",
      { decimales: 2 },
    );
    ecuacion_auxiliar = `\\langle N_x\\rangle = \\verde{${poynting_txt}},\\quad \\theta_\\eta = ${resultado_onda.desfasaje_h_atraso_grados.toFixed(1)}^\\circ,\\quad \\frac{\\lambda}{D} = ${resultado_onda.razon_longitud_onda_dimension.toFixed(2)}`;

    terminos = [
      {
        id: "campo_electrico",
        titulo: "Onda E_y",
        simbolo_latex: "\\vec{E}(x,t)",
        valor_si: formatearUnidadSI(parametros_onda.amplitud_e0, "V/m").texto,
        color: COLORES_VECTORES.e,
        descripcion: "Amplitud eléctrica transversal",
      },
      {
        id: "campo_magnetico",
        titulo: "Onda B / H",
        simbolo_latex: "\\vec{H}(x,t)",
        valor_si: maxwell_on
          ? formatearUnidadSI(
              parametros_onda.amplitud_e0 /
                Math.max(resultado_onda.impedancia_intrinseca.modulo, 1e-12),
              "A/m",
            ).texto
          : "0.00 A/m",
        color: COLORES_VECTORES.b,
        descripcion: "Campo magnético acoplado en cuadratura espacial",
      },
      {
        id: "corriente_desplazamiento",
        titulo: "Acoplamiento Maxwell",
        simbolo_latex: "\\partial\\vec{D}/\\partial t",
        valor_si: maxwell_on ? "Activo" : "Apagado",
        color: COLORES_VECTORES.jd,
        descripcion: "Mecanismo de autopropagación EM",
      },
      {
        id: "poynting",
        titulo: "Poynting",
        simbolo_latex: "\\langle\\vec{N}\\rangle",
        valor_si: formatearUnidadSI(
          resultado_onda.poynting_promedio_origen,
          "W/m²",
        ).texto,
        color: COLORES_VECTORES.n,
        descripcion: "Irradiancia promedio en +x",
      },
    ];
  }

  return (
    <TarjetaLaboratorio
      etiqueta_superior="Pizarra Viva de Ecuaciones"
      titulo="Sustitución Instantánea y Vínculo 3D"
      subtitulo="Pasá el cursor o hacé clic sobre cualquier término para resaltarlo en el visor 3D"
      icono={<Sigma className="h-4 w-4" />}
      clase_extra={clase_extra}
      acciones_derecha={
        <InsigniaEstado variante="morado" con_punto>
          {insignia_contexto}
        </InsigniaEstado>
      }
    >
      {/* Bloque matemático principal + sustitución en vivo */}
      <div className="space-y-2 rounded-xl border border-borde-panel bg-[#060a13]/90 p-3.5">
        <FormulaKatex
          expresion={ecuacion_simbolica}
          en_bloque
          clase_extra="text-center text-sm sm:text-base text-texto-principal"
        />
        <div className="border-t border-borde-panel/70 pt-2">
          <FormulaKatex
            expresion={ecuacion_sustituida}
            en_bloque
            clase_extra="text-center text-xs sm:text-sm text-texto-principal"
          />
        </div>
        <div className="border-t border-borde-panel/50 pt-1.5 text-center text-[11px] text-texto-secundario">
          <FormulaKatex expresion={ecuacion_auxiliar} en_bloque />
        </div>
      </div>

      {/* Botones interactivos para iluminar vectores en 3D */}
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-texto-secundario">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-azul-activo" />
            Resaltar término en escena 3D:
          </span>
          {termino_fijado && alResaltarTermino && (
            <button
              type="button"
              onClick={() => {
                setTerminoFijado(null);
                alResaltarTermino(null);
              }}
              className="font-mono text-[10px] text-azul-activo hover:underline"
            >
              Limpiar selección
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {terminos.map((_termino) => {
            const esta_resaltado = termino_resaltado === _termino.id;
            const esta_fijado = termino_fijado === _termino.id;
            return (
              <button
                key={_termino.id}
                type="button"
                title={_termino.descripcion}
                aria-pressed={esta_fijado}
                onMouseEnter={() => manejarSobreTermino(_termino.id)}
                onMouseLeave={() => manejarSobreTermino(null)}
                onClick={() => manejarClicTermino(_termino.id)}
                className={combinarClases(
                  "flex flex-col gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60",
                  esta_resaltado
                    ? "border-azul-activo/60 bg-azul-activo/12 shadow-[0_0_16px_-4px_rgba(56,189,248,0.45)]"
                    : "border-borde-panel bg-fondo-base/60 hover:border-slate-500/60 hover:bg-panel/80",
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-texto-principal">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: _termino.color }}
                    />
                    <span className="truncate">{_termino.titulo}</span>
                  </span>
                  {esta_fijado && (
                    <span className="rounded bg-azul-activo/20 px-1 font-mono text-[9px] text-azul-activo">
                      3D
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-texto-secundario">
                  <FormulaKatex expresion={_termino.simbolo_latex} />
                </span>
                <span
                  className="truncate font-mono text-xs font-semibold tabular-nums"
                  style={{ color: _termino.color }}
                >
                  {_termino.valor_si}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </TarjetaLaboratorio>
  );
}
