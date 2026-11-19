import type {
  MagnitudResumen,
  ParametrosCasoACapacitor,
  ParametrosCasoBConductor,
  ParametrosCasoCArmonico,
  PasoAnalitico,
  ResultadoCalculadora,
} from "../../tipos/calculadora";
import { evaluarBesselJ0, evaluarBesselJ1 } from "./bessel";
import { calcularCapacitor } from "./capacitor";
import {
  DOS_PI,
  PERMEABILIDAD_VACIO,
  PERMITIVIDAD_VACIO,
  UMBRAL_CUASIESTATICO_FIUBA,
} from "./constantes";
import { calcularGeometriaAmpere } from "./geometrias-ampere";
import { calcularRegimenConduccion } from "./regimen-conduccion";
import {
  formatearAdimensional,
  formatearAdimensionalLatex,
  formatearGrados,
  formatearNumeroLatex,
  formatearUnidadSI,
} from "./unidades";

export function resolverCasoACapacitor(
  _parametros: ParametrosCasoACapacitor,
): ResultadoCalculadora {
  const a = Math.max(_parametros.radio_placa, 1e-6);
  const d = Math.max(_parametros.separacion_placas, 1e-6);
  const rho = Math.max(_parametros.radio_evaluacion, 1e-6);
  const sigma =
    _parametros.modo === "ac_cuasiestatico"
      ? Math.max(_parametros.conductividad_s_m, 0)
      : 0;

  const estado = calcularCapacitor({
    modo: _parametros.modo,
    radio_placa: a,
    separacion_placas: d,
    tension_pico: _parametros.tension_pico,
    frecuencia: _parametros.frecuencia,
    permitividad_relativa: _parametros.permitividad_relativa,
    permeabilidad_relativa: 1,
    conductividad_s_m: sigma,
    campo_ruptura_v_m: _parametros.campo_ruptura_v_m,
    resistencia_ohm: _parametros.resistencia_ohm,
    direccion_rc: _parametros.direccion_rc,
    radio_lazo: rho,
    superficie_activa: "ambas",
    incluir_maxwell: true,
    fase_o_tiempo_norm:
      _parametros.modo === "transitorio_rc"
        ? _parametros.tiempo_normalizado_rc
        : _parametros.fase_rad,
  });

  const epsilon =
    PERMITIVIDAD_VACIO * Math.max(_parametros.permitividad_relativa, 1);
  const dentro_placas = rho <= a;
  const punto_rho = estado.evaluarEnRadio(rho);

  const pasos: PasoAnalitico[] = [
    {
      numero: 1,
      titulo: "Geometría y capacitancia del capacitor circular",
      expresion_latex:
        `C = \\frac{\\naranja{\\varepsilon_0}\\,\\morado{\\varepsilon_r}\\,\\pi a^2}{d} = ` +
        `\\frac{(${formatearNumeroLatex(epsilon, "\\text{F}/\\text{m}")})\\,\\pi\\,(${formatearNumeroLatex(a, "m")})^2}{${formatearNumeroLatex(d, "m")}} = \\azul{${formatearNumeroLatex(estado.capacitancia, "F")}}`,
      verificacion_dimensional:
        "\\left[\\frac{\\text{F}}{\\text{m}}\\right]\\cdot\\frac{[\\text{m}^2]}{[\\text{m}]} = \\text{F}",
    },
  ];

  if (_parametros.modo === "transitorio_rc") {
    const u = Math.max(0, _parametros.tiempo_normalizado_rc);
    const tiempo_s = u * estado.constante_tiempo_rc;
    const expr_v =
      _parametros.direccion_rc === "carga"
        ? `V(t) = V_0\\left(1 - e^{-t/\\tau}\\right) = \\azul{${formatearNumeroLatex(estado.tension_instantanea, "V")}}`
        : `V(t) = V_0\\,e^{-t/\\tau} = \\azul{${formatearNumeroLatex(estado.tension_instantanea, "V")}}`;
    const signo_i = _parametros.direccion_rc === "carga" ? "" : "-";

    pasos.push({
      numero: 2,
      titulo: "Respuesta transitoria del circuito RC",
      expresion_latex:
        `\\tau = R C = ${formatearNumeroLatex(estado.constante_tiempo_rc, "s")},\\quad ` +
        `t = ${u.toFixed(2)}\\tau = ${formatearNumeroLatex(tiempo_s, "s")}\\\\[4pt]` +
        `${expr_v},\\quad I(t) = ${signo_i}\\frac{V_0}{R}e^{-t/\\tau} = \\verde{${formatearNumeroLatex(estado.corriente_cable, "A", { mostrar_signo: true })}}`,
      nota_conceptual: "Ley de mallas RC (Prob. 5.4)",
    });
  } else {
    const tiene_perdidas = sigma > 0;
    const parte_jc = tiene_perdidas
      ? `I_c^{\\text{gap}}(t) = G V(t) = \\morado{${formatearNumeroLatex(estado.corriente_conduccion_entrehierro, "A", { mostrar_signo: true })}},\\quad `
      : "";
    pasos.push({
      numero: 2,
      titulo: tiene_perdidas
        ? "Excitación armónica y corrientes en dieléctrico con pérdidas"
        : "Excitación armónica cuasi-estática",
      expresion_latex:
        `V(t) = V_0\\cos(\\omega t) = \\azul{${formatearNumeroLatex(estado.tension_instantanea, "V", { mostrar_signo: true })}},\\quad ` +
        `E_z(t) = \\frac{V(t)}{d} = \\azul{${formatearNumeroLatex(estado.campo_e_eje, "\\text{V}/\\text{m}", { mostrar_signo: true })}}\\\\[4pt]` +
        `${parte_jc}I_d(t) = C\\frac{dV}{dt} = -\\omega C V_0\\sin(\\omega t) = \\verde{${formatearNumeroLatex(estado.corriente_desplazamiento_entrehierro, "A", { mostrar_signo: true })}}`,
      nota_conceptual: tiene_perdidas
        ? "Conducción y desplazamiento en cuadratura de 90° (Prob. 5.8)"
        : "Régimen armónico cuasi-estático (Ej. 5-9)",
    });
  }

  pasos.push({
    numero: 3,
    titulo: "Densidad y flujo de corriente de desplazamiento",
    expresion_latex:
      `\\vec{J}_d = \\frac{\\partial \\vec{D}}{\\partial t} = \\varepsilon\\frac{\\partial E_z}{\\partial t}\\,\\hat{\\vec{z}} = ` +
      `\\verde{${formatearNumeroLatex(estado.densidad_jd_eje, "\\text{A}/\\text{m}^2", { mostrar_signo: true })}}\\,\\hat{\\vec{z}},\\quad ` +
      `\\Phi_D = \\varepsilon E_z \\pi a^2 = ${formatearNumeroLatex(estado.flujo_desplazamiento_total, "C", { mostrar_signo: true })}`,
    verificacion_dimensional:
      "\\left[\\frac{\\text{F}}{\\text{m}}\\right]\\cdot\\left[\\frac{\\text{V}}{\\text{m}\\cdot\\text{s}}\\right] = \\frac{\\text{C}}{\\text{m}^2\\cdot\\text{s}} = \\frac{\\text{A}}{\\text{m}^2}",
  });

  const expr_s1 =
    `S_1\\text{ (plana)}: I_c = \\azul{${formatearNumeroLatex(estado.superficie_s1.corriente_conduccion, "A", { mostrar_signo: true })}},\\ ` +
    `I_d = \\rojo{0}`;
  const expr_s2 =
    `S_2\\text{ (Maxwell)}: I_c = ${estado.superficie_s2.corriente_conduccion === 0 ? "\\rojo{0}" : `\\morado{${formatearNumeroLatex(estado.superficie_s2.corriente_conduccion, "A", { mostrar_signo: true })}}`},\\ ` +
    `I_d = \\verde{${formatearNumeroLatex(estado.superficie_s2.corriente_desplazamiento, "A", { mostrar_signo: true })}}`;

  pasos.push({
    numero: 4,
    titulo: "Verificación de consistencia entre superficies S₁ y S₂",
    expresion_latex:
      `${expr_s1}\\\\[4pt]${expr_s2}\\\\[4pt]` +
      `\\oint_C \\vec{H}\\cdot d\\vec{l} = I_c(S_1) + I_d(S_1) = I_c(S_2) + I_d(S_2) = \\destacar{${formatearNumeroLatex(estado.corriente_cable, "A", { mostrar_signo: true })}}`,
    nota_conceptual: "Resolución de la paradoja mediante ∂D/∂t (Teorema de Stokes)",
  });

  const formula_h_region = dentro_placas
    ? `H_\\varphi(\\rho) = \\frac{I_{\\text{tot}}\\,\\rho}{2\\pi a^2}`
    : `H_\\varphi(\\rho) = \\frac{I_{\\text{tot}}}{2\\pi\\rho}`;

  pasos.push({
    numero: 5,
    titulo: dentro_placas
      ? "Campo magnético inducido en el interior (ρ ≤ a)"
      : "Campo magnético en el exterior (ρ > a)",
    expresion_latex:
      `${formula_h_region} = \\azul{${formatearNumeroLatex(punto_rho.campo_h_phi, "\\text{A}/\\text{m}", { mostrar_signo: true })}},\\quad ` +
      `B_\\varphi(\\rho) = \\naranja{\\mu_0} H_\\varphi(\\rho) = \\destacar{${formatearNumeroLatex(punto_rho.campo_b_phi, "T", { mostrar_signo: true })}}`,
    verificacion_dimensional:
      "\\left[\\frac{\\text{N}}{\\text{A}^2}\\right]\\cdot\\left[\\frac{\\text{A}}{\\text{m}}\\right] = \\frac{\\text{N}}{\\text{A}\\cdot\\text{m}} = \\text{T}",
  });

  pasos.push({
    numero: 6,
    titulo: "Vector de Poynting y balance de potencia en el borde",
    expresion_latex:
      `\\vec{N}(a) = \\vec{E}\\times\\vec{H} = ${formatearNumeroLatex(estado.poynting_borde, "\\text{W}/\\text{m}^2", { mostrar_signo: true })}\\,\\hat{\\boldsymbol{\\rho}},\\quad ` +
      `P_{\\text{ent}} = -N_\\rho(a)\\,(2\\pi a d) = \\verde{${formatearNumeroLatex(estado.potencia_entrante_poynting, "W", { mostrar_signo: true })}}`,
    nota_conceptual: "Teorema de Poynting: la energía ingresa radialmente por el borde lateral",
  });

  const alertas: string[] = [];
  if (estado.hay_ruptura_dielectrica) {
    alertas.push(
      `Ruptura dieléctrica detectada: |E_máx| = ${formatearUnidadSI(estado.campo_electrico_maximo, "V/m").texto} supera E_r = ${formatearUnidadSI(_parametros.campo_ruptura_v_m, "V/m").texto}.`,
    );
  }
  if (!estado.es_cuasiestatico_valido) {
    alertas.push(
      `Advertencia de alta frecuencia: λ/(2a) = ${estado.razon_longitud_onda_diametro.toFixed(2)} < ${UMBRAL_CUASIESTATICO_FIUBA}. Emplear modo Bessel (Ej. 5-10).`,
    );
  }

  const resumen_magnitudes: MagnitudResumen[] = [
    {
      etiqueta: "Capacitancia",
      simbolo_latex: "C",
      valor_formateado: formatearUnidadSI(estado.capacitancia, "F").texto,
      color_token: "azul",
    },
    {
      etiqueta: "Corriente desplazamiento",
      simbolo_latex: "I_d",
      valor_formateado: formatearUnidadSI(
        estado.corriente_desplazamiento_entrehierro,
        "A",
        { mostrar_signo: true },
      ).texto,
      color_token: "morado",
    },
    {
      etiqueta: "Inducción B(ρ)",
      simbolo_latex: "B_\\varphi(\\rho)",
      valor_formateado: formatearUnidadSI(punto_rho.campo_b_phi, "T", {
        mostrar_signo: true,
      }).texto,
      color_token: "rojo",
    },
    {
      etiqueta: "Potencia entrante",
      simbolo_latex: "P_{\\text{ent}}",
      valor_formateado: formatearUnidadSI(estado.potencia_entrante_poynting, "W", {
        mostrar_signo: true,
      }).texto,
      color_token: "verde",
    },
  ];

  return {
    caso_id: "caso_a_capacitor",
    titulo: "Caso A — Capacitor Circular de Placas Paralelas",
    referencia_fiuba:
      _parametros.modo === "transitorio_rc"
        ? "Cap. 5, Prob. 5.4 y Ej. 5-9"
        : sigma > 0
          ? "Cap. 5, Prob. 5.8 y Ej. 5-9"
          : "Cap. 5, Ej. 5-9",
    resumen_magnitudes,
    pasos,
    verificacion_invariante: {
      cumple:
        estado.superficie_s1.es_consistente &&
        estado.superficie_s2.es_consistente &&
        estado.superficie_entrehierro.es_consistente,
      etiqueta: "∮ H·dl = I_c + I_d idéntico en S₁, S₂ y S_entrehierro",
      error_relativo: Math.max(
        estado.superficie_s1.residuo_relativo,
        estado.superficie_s2.residuo_relativo,
        estado.superficie_entrehierro.residuo_relativo,
      ),
    },
    alertas,
  };
}

export function resolverCasoBConductor(
  _parametros: ParametrosCasoBConductor,
): ResultadoCalculadora {
  const a = Math.max(_parametros.radio_interior, 1e-6);
  const b = Math.max(_parametros.radio_medio, a + 1e-6);
  const c = Math.max(_parametros.radio_exterior, b + 1e-6);
  const rho = Math.max(_parametros.radio_evaluacion, 1e-6);
  const mu_r = Math.max(_parametros.permeabilidad_relativa_nucleo, 1);

  const resultado = calcularGeometriaAmpere({
    tipo: _parametros.tipo,
    corriente: _parametros.corriente,
    radio_interior: a,
    radio_medio: b,
    radio_exterior: c,
    factor_retorno_coaxial: _parametros.factor_retorno_coaxial,
    espiras_por_metro: 1000,
    numero_espiras_total: 200,
    longitud_solenoide: 0.4,
    usar_solenoide_finito: false,
    largo_lazo_rectangular: 0.1,
    radio_lazo: rho,
    radio_lazo_secundario: a * 1.5,
    permeabilidad_relativa_nucleo: mu_r,
  });

  const es_coaxial = _parametros.tipo === "cable_coaxial";
  let expr_ienc = "";
  let mu_local_latex = "\\naranja{\\mu_0}";

  if (!es_coaxial) {
    if (rho <= a) {
      expr_ienc = `I_{\\text{enc}}(\\rho) = I\\frac{\\rho^2}{a^2} = \\azul{${formatearNumeroLatex(resultado.corriente_encerrada, "A", { mostrar_signo: true })}}`;
      mu_local_latex = mu_r > 1 ? "\\naranja{\\mu_0}\\,\\morado{\\mu_r}" : "\\naranja{\\mu_0}";
    } else {
      expr_ienc = `I_{\\text{enc}}(\\rho) = I = \\azul{${formatearNumeroLatex(resultado.corriente_encerrada, "A", { mostrar_signo: true })}}`;
    }
  } else {
    if (rho <= a) {
      expr_ienc = `I_{\\text{enc}}(\\rho) = I\\frac{\\rho^2}{a^2} = \\azul{${formatearNumeroLatex(resultado.corriente_encerrada, "A", { mostrar_signo: true })}}`;
      mu_local_latex = mu_r > 1 ? "\\naranja{\\mu_0}\\,\\morado{\\mu_r}" : "\\naranja{\\mu_0}";
    } else if (rho < b) {
      expr_ienc = `I_{\\text{enc}}(\\rho) = I = \\azul{${formatearNumeroLatex(resultado.corriente_encerrada, "A", { mostrar_signo: true })}}`;
    } else if (rho <= c) {
      expr_ienc = `I_{\\text{enc}}(\\rho) = I\\left(1 - \\alpha\\frac{\\rho^2 - b^2}{c^2 - b^2}\\right) = \\azul{${formatearNumeroLatex(resultado.corriente_encerrada, "A", { mostrar_signo: true })}}`;
    } else {
      expr_ienc =
        resultado.esta_apantallado
          ? `I_{\\text{enc}}(\\rho) = I - I = \\rojo{0\\,\\text{A}}`
          : `I_{\\text{enc}}(\\rho) = (1 - \\alpha) I = \\azul{${formatearNumeroLatex(resultado.corriente_encerrada, "A", { mostrar_signo: true })}}`;
    }
  }

  const pasos: PasoAnalitico[] = [
    {
      numero: 1,
      titulo: "Identificación de simetría cilíndrica y región de evaluación",
      expresion_latex:
        `\\oint_C \\vec{H}\\cdot d\\vec{l} = H_\\varphi(\\rho)\\,(2\\pi\\rho) = I_{\\text{enc}}(\\rho),\\quad ` +
        `\\morado{\\rho = ${formatearNumeroLatex(rho, "m")}}`,
      nota_conceptual: resultado.region_descripcion,
    },
    {
      numero: 2,
      titulo: "Cálculo de la corriente libre encerrada I_enc(ρ)",
      expresion_latex: expr_ienc,
    },
    {
      numero: 3,
      titulo: "Intensidad de campo magnético H_φ(ρ)",
      expresion_latex:
        `H_\\varphi(\\rho) = \\frac{I_{\\text{enc}}(\\rho)}{2\\pi\\rho} = ` +
        `\\frac{${formatearNumeroLatex(resultado.corriente_encerrada, "A", { mostrar_signo: true })}}{2\\pi\\,(${formatearNumeroLatex(rho, "m")})} = ` +
        `\\verde{${formatearNumeroLatex(resultado.campo_h, "\\text{A}/\\text{m}", { mostrar_signo: true })}}`,
      verificacion_dimensional:
        "\\frac{[\\text{A}]}{[\\text{m}]} = \\text{A}/\\text{m}",
    },
    {
      numero: 4,
      titulo: "Inducción magnética B_φ(ρ) = μ H_φ(ρ)",
      expresion_latex:
        `B_\\varphi(\\rho) = ${mu_local_latex}\\,H_\\varphi(\\rho) = \\destacar{${formatearNumeroLatex(resultado.campo_b, "T", { mostrar_signo: true })}}`,
      nota_conceptual:
        mu_r > 1 && rho <= a
          ? "H es continuo en ρ = a, pero B salta un factor μ_r por la magnetización del núcleo"
          : resultado.esta_apantallado
            ? "Apantallamiento perfecto: las corrientes opuestas anulan el campo exterior"
            : undefined,
    },
  ];

  const alertas: string[] = [];
  if (es_coaxial && rho > c && !resultado.esta_apantallado) {
    alertas.push(
      `Retorno desbalanceado (α = ${_parametros.factor_retorno_coaxial.toFixed(2)} < 1): existe campo magnético de fuga en el exterior.`,
    );
  }
  if (!es_coaxial && mu_r > 1) {
    const b_int = resultado.evaluarEnRadio(a).campo_b;
    const b_ext = PERMEABILIDAD_VACIO * resultado.evaluarEnRadio(a).campo_h;
    alertas.push(
      `Discontinuidad en ρ = a: B(a⁻) = ${formatearUnidadSI(b_int, "T").texto} vs B(a⁺) = ${formatearUnidadSI(b_ext, "T").texto} (relación μ_r = ${mu_r}).`,
    );
  }

  return {
    caso_id: "caso_b_conductor",
    titulo: es_coaxial
      ? "Caso B — Cable Coaxial y Apantallamiento (Ej. 3-20)"
      : "Caso B — Conductor Cilíndrico Largo (Ej. 3-18 / 3-19)",
    referencia_fiuba: es_coaxial ? "Cap. 3, Ej. 3-20" : "Cap. 3, Ej. 3-18 y 3-19",
    resumen_magnitudes: [
      {
        etiqueta: "Corriente encerrada",
        simbolo_latex: "I_{\\text{enc}}",
        valor_formateado: formatearUnidadSI(resultado.corriente_encerrada, "A", {
          mostrar_signo: true,
        }).texto,
        color_token: "ambar",
      },
      {
        etiqueta: "Campo H(ρ)",
        simbolo_latex: "H_\\varphi(\\rho)",
        valor_formateado: formatearUnidadSI(resultado.campo_h, "A/m", {
          mostrar_signo: true,
        }).texto,
        color_token: "azul",
      },
      {
        etiqueta: "Inducción B(ρ)",
        simbolo_latex: "B_\\varphi(\\rho)",
        valor_formateado: formatearUnidadSI(resultado.campo_b, "T", {
          mostrar_signo: true,
        }).texto,
        color_token: "rojo",
      },
      {
        etiqueta: "Circulación ∮H·dl",
        simbolo_latex: "\\oint \\vec{H}\\cdot d\\vec{l}",
        valor_formateado: formatearUnidadSI(resultado.circulacion_h, "A", {
          mostrar_signo: true,
        }).texto,
        color_token: "verde",
      },
    ],
    pasos,
    verificacion_invariante: {
      cumple: resultado.es_consistente,
      etiqueta: "∮ H·dl = I_enc (Ley circuital de Ampère)",
      error_relativo: resultado.residuo_relativo,
    },
    alertas,
  };
}

export function resolverCasoCArmonico(
  _parametros: ParametrosCasoCArmonico,
): ResultadoCalculadora {
  const f = Math.max(_parametros.frecuencia, 1e-3);
  const omega = DOS_PI * f;
  const fase = omega * _parametros.tiempo_s;

  const reg = calcularRegimenConduccion({
    amplitud_e0: _parametros.amplitud_e0,
    frecuencia: f,
    conductividad_s_m: _parametros.conductividad_s_m,
    permitividad_relativa: _parametros.permitividad_relativa,
    permeabilidad_relativa: _parametros.permeabilidad_relativa,
    radio_evaluacion: _parametros.radio_evaluacion,
    dimension_caracteristica: _parametros.dimension_caracteristica,
    fase_omega_t: fase,
  });

  const etiqueta_regimen =
    reg.regimen === "buen_conductor"
      ? "Buen conductor (σ ≫ ωε)"
      : reg.regimen === "buen_dielectrico"
        ? "Buen dieléctrico (ωε ≫ σ)"
        : "Régimen de transición (σ ~ ωε)";

  const j0_krho = evaluarBesselJ0(reg.argumento_bessel_krho);
  const j1_krho = evaluarBesselJ1(reg.argumento_bessel_krho);

  const pasos: PasoAnalitico[] = [
    {
      numero: 1,
      titulo: "Campo eléctrico armónico y densidades J_c y J_d",
      expresion_latex:
        `\\vec{E}(t) = E_0\\sin(2\\pi f t)\\,\\hat{\\vec{z}},\\quad \\omega = 2\\pi f = \\azul{${formatearNumeroLatex(omega, "\\text{rad}/\\text{s}")}}\\\\[4pt]` +
        `|J_c| = \\sigma E_0 = \\morado{${formatearNumeroLatex(Math.abs(reg.fasor.jc_real), "\\text{A}/\\text{m}^2")}},\\quad ` +
        `|J_d| = \\omega\\varepsilon E_0 = \\verde{${formatearNumeroLatex(Math.abs(reg.fasor.jd_imaginario), "\\text{A}/\\text{m}^2")}}`,
      nota_conceptual: "J_d adelanta 90° respecto a J_c (cuadratura fasorial, Prob. 5.8)",
      verificacion_dimensional:
        "[\\text{s}^{-1}]\\cdot\\left[\\frac{\\text{F}}{\\text{m}}\\right]\\cdot\\left[\\frac{\\text{V}}{\\text{m}}\\right] = \\frac{\\text{A}}{\\text{m}^2}",
    },
    {
      numero: 2,
      titulo: "Conductividad y permitividad complejas equivalentes",
      expresion_latex:
        `\\sigma_{\\text{eq}} = \\sigma + i\\omega\\varepsilon = ${formatearNumeroLatex(reg.conductividad_equivalente.real, "\\text{S}/\\text{m}")} + i\\,(${formatearNumeroLatex(reg.conductividad_equivalente.imaginario, "\\text{S}/\\text{m}")})\\\\[4pt]` +
        `\\varepsilon_{\\text{eq}} = \\varepsilon - i\\frac{\\sigma}{\\omega},\\quad \\tau_r = \\frac{\\varepsilon}{\\sigma} = \\naranja{${formatearNumeroLatex(reg.tiempo_relajacion, "s")}}`,
      nota_conceptual: "Formulación fasorial exp(+iωt) de Juan C. Fernández (Cap. 3, Ej. 3-7)",
    },
    {
      numero: 3,
      titulo: "Frecuencia de cruce f_c y tangente de pérdidas",
      expresion_latex:
        `f_c = \\frac{\\sigma}{2\\pi\\varepsilon} = \\destacar{${formatearNumeroLatex(reg.frecuencia_cruce, "Hz")}},\\quad ` +
        `\\tan\\delta = \\frac{|J_c|}{|J_d|} = \\frac{\\sigma}{\\omega\\varepsilon} = \\azul{${formatearAdimensionalLatex(reg.tangente_perdidas, 4)}},\\quad ` +
        `\\delta_d = ${formatearGrados(reg.angulo_fase_jd_rad, 1)}`,
      nota_conceptual: etiqueta_regimen,
    },
    {
      numero: 4,
      titulo: "Criterio cuasi-estático (Cap. 1) y parámetro de Bessel kρ",
      expresion_latex:
        `\\lambda = \\frac{v}{f} = \\azul{${formatearNumeroLatex(reg.longitud_onda, "m")}},\\quad ` +
        `\\frac{\\lambda}{D} = ${reg.razon_longitud_onda_dimension.toFixed(2)}\\ ${reg.es_cuasiestatico_valido ? "\\ge" : "<"}\\ ${UMBRAL_CUASIESTATICO_FIUBA},\\quad ` +
        `k\\rho = \\morado{${reg.argumento_bessel_krho.toFixed(4)}}`,
      nota_conceptual: reg.es_cuasiestatico_valido
        ? "Régimen cuasi-estático válido (λ ≥ 10 D)"
        : "Ruptura del régimen cuasi-estático: se requiere acoplamiento completo (Ej. 5-10)",
    },
    {
      numero: 5,
      titulo: "Comparación de inducción B(ρ): cuasi-estático vs. Bessel exacto",
      expresion_latex:
        `J_0(k\\rho) = ${j0_krho.toFixed(5)},\\quad J_1(k\\rho) = ${j1_krho.toFixed(5)}\\\\[4pt]` +
        `B_{\\text{cuasi}} = \\frac{1}{2}\\mu\\varepsilon\\omega E_0\\rho = ${formatearNumeroLatex(reg.campo_b_cuasiestatico_pico, "T")},\\quad ` +
        `B_{\\text{Bessel}} = \\frac{E_0}{v}|J_1(k\\rho)| = \\destacar{${formatearNumeroLatex(reg.campo_b_bessel_pico, "T")}}`,
      verificacion_dimensional:
        "\\left[\\frac{\\text{V}/\\text{m}}{\\text{m}/\\text{s}}\\right] = \\frac{\\text{V}\\cdot\\text{s}}{\\text{m}^2} = \\text{T}",
    },
  ];

  const error_identidad_compleja =
    Math.hypot(
      reg.conductividad_equivalente.real -
        -omega * reg.permitividad_equivalente.imaginario,
      reg.conductividad_equivalente.imaginario -
        omega * reg.permitividad_equivalente.real,
    ) / Math.max(reg.conductividad_equivalente.modulo, 1e-18);

  const alertas: string[] = [];
  if (!reg.es_cuasiestatico_valido) {
    alertas.push(
      `Desviación de Bessel en ρ: error en E_z = ${(reg.error_relativo_cuasiestatico_e * 100).toFixed(2)}%, error en B_φ = ${(reg.error_relativo_cuasiestatico_b * 100).toFixed(2)}%.`,
    );
  }

  return {
    caso_id: "caso_c_armonico",
    titulo: "Caso C — Campo Armónico, Pérdidas (σ vs ωε) y Criterio Bessel",
    referencia_fiuba: "Cap. 1, Cap. 3 (Ej. 3-7) y Cap. 5 (Ej. 5-10, Prob. 5.8)",
    resumen_magnitudes: [
      {
        etiqueta: "Frecuencia de cruce",
        simbolo_latex: "f_c",
        valor_formateado: formatearUnidadSI(reg.frecuencia_cruce, "Hz").texto,
        color_token: "ambar",
      },
      {
        etiqueta: "Razón |J_c|/|J_d| (adim.)",
        simbolo_latex: "\\tan\\delta",
        valor_formateado: formatearAdimensional(reg.tangente_perdidas, 4),
        color_token: "morado",
      },
      {
        etiqueta: "Parámetro Bessel",
        simbolo_latex: "k\\rho",
        valor_formateado: reg.argumento_bessel_krho.toFixed(4),
        color_token: "azul",
      },
      {
        etiqueta: "B exacto (Bessel)",
        simbolo_latex: "B_{\\text{Bessel}}",
        valor_formateado: formatearUnidadSI(reg.campo_b_bessel_pico, "T").texto,
        color_token: "verde",
      },
    ],
    pasos,
    verificacion_invariante: {
      cumple: error_identidad_compleja < 1e-12,
      etiqueta: "σ_eq ≡ iω ε_eq (identidad fasorial exp(+iωt))",
      error_relativo: error_identidad_compleja,
    },
    alertas,
  };
}
