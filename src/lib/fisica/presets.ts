import type {
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ParametrosOndaEM,
  ParametrosRegimenConduccion,
} from "../../tipos/fisica";
import type {
  CapasVisibles3D,
  PresetExperimentoFIUBA,
} from "../../tipos/simulacion";
import { CEROS_BESSEL_J0, DOS_PI, PERMITIVIDAD_VACIO, VELOCIDAD_LUZ } from "./constantes";

export const CAPAS_VISIBLES_INICIAL: CapasVisibles3D = {
  mostrar_e: true,
  mostrar_d: false,
  mostrar_b_h: true,
  mostrar_jc: true,
  mostrar_jd: true,
  mostrar_poynting: false,
  mostrar_cargas: true,
  mostrar_lazo_y_superficie: true,
  mostrar_rejilla_y_ejes: true,
};

export const PARAMETROS_CAPACITOR_INICIAL: ParametrosCapacitor = {
  modo: "ac_cuasiestatico",
  radio_placa: 0.05,
  separacion_placas: 0.01,
  tension_pico: 100,
  frecuencia: 1e6,
  permitividad_relativa: 1.0006,
  permeabilidad_relativa: 1,
  conductividad_s_m: 0,
  campo_ruptura_v_m: 3e6,
  resistencia_ohm: 1000,
  direccion_rc: "carga",
  radio_lazo: 0.065,
  superficie_activa: "ambas",
  incluir_maxwell: true,
  fase_o_tiempo_norm: Math.PI * 0.35,
};

export const PARAMETROS_GEOMETRIA_INICIAL: ParametrosGeometriaAmpere = {
  tipo: "conductor_cilindrico",
  corriente: 20,
  radio_interior: 0.01,
  radio_medio: 0.025,
  radio_exterior: 0.032,
  factor_retorno_coaxial: 1,
  espiras_por_metro: 1000,
  numero_espiras_total: 240,
  longitud_solenoide: 0.4,
  usar_solenoide_finito: false,
  largo_lazo_rectangular: 0.12,
  radio_lazo: 0.015,
  radio_lazo_secundario: 0.022,
  permeabilidad_relativa_nucleo: 1,
};

export const PARAMETROS_ONDA_INICIAL: ParametrosOndaEM = {
  amplitud_e0: 100,
  frecuencia: 1e8,
  permitividad_relativa: 1,
  permeabilidad_relativa: 1,
  conductividad_s_m: 0,
  dimension_caracteristica: 0.1,
  polarizacion: "lineal",
  incluir_maxwell: true,
};

export const PARAMETROS_REGIMEN_INICIAL: ParametrosRegimenConduccion = {
  amplitud_e0: 100,
  frecuencia: 8.99e8,
  conductividad_s_m: 4.0,
  permitividad_relativa: 80,
  permeabilidad_relativa: 1,
  radio_evaluacion: 0.02,
  dimension_caracteristica: 0.1,
  fase_omega_t: Math.PI * 0.25,
};

const FRECUENCIA_PRIMER_CERO_J0_AIRE =
  (CEROS_BESSEL_J0[0] * (VELOCIDAD_LUZ / Math.sqrt(1.0006))) / (DOS_PI * 0.05);

const FRECUENCIA_CRUCE_PROB_5_8 = 1e-3 / (DOS_PI * PERMITIVIDAD_VACIO * 10);

const FRECUENCIA_CRUCE_AGUA_MAR = 4.0 / (DOS_PI * PERMITIVIDAD_VACIO * 80);

export const PRESETS_FIUBA: readonly PresetExperimentoFIUBA[] = [
  {
    id: "fiuba-ej-5-9-paradoja",
    codigo_fiuba: "Cap. 5 · Ej. 5-9",
    titulo: "La Paradoja de Ampère-Maxwell (S₁ vs S₂)",
    subtitulo: "Capacitor circular en régimen AC cuasi-estático",
    escenario: "capacitor_paradoja",
    pestana_destino: "simulador",
    pregunta_guia:
      "Desactivá el término de Maxwell (∂D/∂t) con ambas superficies visibles: ¿por qué S₁ y S₂ arrojan resultados incompatibles para el mismo lazo C?",
    observacion_esperada:
      "Sin ∂D/∂t, S₁ mide I_c = I mientras S₂ mide 0. Al activar Maxwell, I_d(S₂) = dΦ_D/dt iguala exactamente a I_c(S₁) y restaura la independencia de superficie.",
    parametros_capacitor: {
      modo: "ac_cuasiestatico",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 100,
      frecuencia: 1e6,
      permitividad_relativa: 1.0006,
      conductividad_s_m: 0,
      campo_ruptura_v_m: 3e6,
      radio_lazo: 0.065,
      superficie_activa: "ambas",
      incluir_maxwell: true,
      fase_o_tiempo_norm: Math.PI * 0.35,
    },
    capas_sugeridas: {
      mostrar_e: true,
      mostrar_b_h: true,
      mostrar_jc: true,
      mostrar_jd: true,
      mostrar_poynting: false,
      mostrar_lazo_y_superficie: true,
    },
  },
  {
    id: "fiuba-ej-5-9-poynting",
    codigo_fiuba: "Cap. 5 · Ej. 5-9 (Poynting)",
    titulo: "¿Por dónde ingresa la energía al capacitor?",
    subtitulo: "Vector de Poynting N = E × H radialmente entrante",
    escenario: "capacitor_paradoja",
    pestana_destino: "simulador",
    pregunta_guia:
      "Observá las flechas verdes de N = E × H durante la carga y la descarga: ¿la energía viaja por los cables o entra por el borde lateral del entrehierro?",
    observacion_esperada:
      "Al cargarse (V·I > 0), N apunta radialmente hacia adentro (-ρ̂) entregando exactamente P_ent = V·I = dU_e/dt; al descargarse invierte su sentido hacia afuera.",
    parametros_capacitor: {
      modo: "ac_cuasiestatico",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 120,
      frecuencia: 1e6,
      permitividad_relativa: 4.0,
      conductividad_s_m: 0,
      campo_ruptura_v_m: 30e6,
      radio_lazo: 0.05,
      superficie_activa: "S_entrehierro",
      incluir_maxwell: true,
      fase_o_tiempo_norm: Math.PI * 1.75,
    },
    capas_sugeridas: {
      mostrar_e: true,
      mostrar_b_h: true,
      mostrar_jd: true,
      mostrar_poynting: true,
    },
  },
  {
    id: "fiuba-ej-5-10-bessel",
    codigo_fiuba: "Cap. 5 · Ej. 5-10",
    titulo: "Ruptura Cuasi-Estática: Primer Cero de Bessel",
    subtitulo: "Modos dinámicos exactos J₀(kρ) y J₁(kρ) a 2.30 GHz",
    escenario: "capacitor_paradoja",
    pestana_destino: "simulador",
    pregunta_guia:
      "Compará la curva exacta de Bessel con la línea punteada cuasi-estática en ka = 2.405 y luego subí la frecuencia hasta ka = 3.832: ¿qué pasa con E_z y H_φ en el borde?",
    observacion_esperada:
      "En ka = 2.405 el campo eléctrico se anula en el borde e invierte su signo más allá del anillo nodal; en ka = 3.832 se anula H_φ(a) y la corriente neta en el borde.",
    parametros_capacitor: {
      modo: "alta_frecuencia_bessel",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 100,
      frecuencia: FRECUENCIA_PRIMER_CERO_J0_AIRE,
      permitividad_relativa: 1.0006,
      conductividad_s_m: 0,
      campo_ruptura_v_m: 3e6,
      radio_lazo: 0.035,
      superficie_activa: "S_entrehierro",
      incluir_maxwell: true,
      fase_o_tiempo_norm: Math.PI * 0.25,
    },
    capas_sugeridas: {
      mostrar_e: true,
      mostrar_b_h: true,
      mostrar_jd: true,
      mostrar_poynting: true,
    },
  },
  {
    id: "fiuba-prob-5-4-rc",
    codigo_fiuba: "Cap. 5 · Prob. 5.4",
    titulo: "Transitorio RC de Carga",
    subtitulo: "Decaimiento exponencial de I_d(t) y H(ρ,t) hacia la electrostática",
    escenario: "capacitor_paradoja",
    pestana_destino: "simulador",
    pregunta_guia:
      "Deslizá el tiempo normalizado t/τ desde 0 hasta 5: ¿en qué instante alcanza su máximo el campo magnético H y en cuál la potencia entrante de Poynting?",
    observacion_esperada:
      "I_d y H son máximos en t = 0⁺ y caen como e^(-t/τ) hasta anularse (límite electrostático); la potencia de Poynting alcanza su máximo en t = τ ln(2) ≈ 0.693 τ.",
    parametros_capacitor: {
      modo: "transitorio_rc",
      radio_placa: 0.05,
      separacion_placas: 0.005,
      tension_pico: 12,
      permitividad_relativa: 2100,
      conductividad_s_m: 0,
      campo_ruptura_v_m: 10e6,
      resistencia_ohm: 1000,
      direccion_rc: "carga",
      radio_lazo: 0.05,
      superficie_activa: "S2",
      incluir_maxwell: true,
      fase_o_tiempo_norm: 0.693,
    },
    capas_sugeridas: {
      mostrar_e: true,
      mostrar_b_h: true,
      mostrar_jc: true,
      mostrar_jd: true,
      mostrar_poynting: true,
    },
  },
  {
    id: "fiuba-prob-5-8-perdidas",
    codigo_fiuba: "Cap. 5 · Prob. 5.8",
    titulo: "Dieléctrico con Pérdidas en Cuadratura (f = f_c)",
    subtitulo: "Coexistencia de J_c = σE y J_d = ωεE desfasadas 90°",
    escenario: "capacitor_paradoja",
    pestana_destino: "simulador",
    pregunta_guia:
      "Con el dieléctrico sintonizado en f = f_c, observá el osciloscopio y la superficie S₂: ¿qué fracciones aportan I_c e I_d dentro del entrehierro?",
    observacion_esperada:
      "Ambas corrientes tienen igual amplitud (|I_c| = |I_d|) pero 90° de desfasaje; S₂ atraviesa las dos y su suma instantánea coincide exactamente con I_cable en S₁.",
    parametros_capacitor: {
      modo: "ac_cuasiestatico",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 10,
      frecuencia: FRECUENCIA_CRUCE_PROB_5_8,
      permitividad_relativa: 10,
      conductividad_s_m: 1e-3,
      campo_ruptura_v_m: 20e6,
      radio_lazo: 0.06,
      superficie_activa: "ambas",
      incluir_maxwell: true,
      fase_o_tiempo_norm: Math.PI * 0.25,
    },
    capas_sugeridas: {
      mostrar_e: true,
      mostrar_b_h: true,
      mostrar_jc: true,
      mostrar_jd: true,
      mostrar_poynting: true,
    },
  },
  {
    id: "fiuba-ej-3-7-agua-mar",
    codigo_fiuba: "Cap. 3 · Ej. 3-7",
    titulo: "Agua de Mar: ¿Conductor o Dieléctrico?",
    subtitulo: "Transición de σ_eq = σ + iωε al cruzar f_c ≈ 899 MHz",
    escenario: "capacitor_paradoja",
    pestana_destino: "calculadora",
    pregunta_guia:
      "Compará el comportamiento del agua de mar (σ = 4 S/m, ε_r = 80) a 1 kHz (comunicaciones submarinas) frente a 10 GHz (microondas).",
    observacion_esperada:
      "A 1 kHz domina σ por seis órdenes de magnitud (buen conductor); por encima de f_c ≈ 899 MHz domina ωε y el medio actúa como dieléctrico.",
    parametros_capacitor: {
      modo: "ac_cuasiestatico",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 10,
      frecuencia: FRECUENCIA_CRUCE_AGUA_MAR,
      permitividad_relativa: 80,
      conductividad_s_m: 4.0,
      campo_ruptura_v_m: 65e6,
      radio_lazo: 0.06,
      superficie_activa: "ambas",
      incluir_maxwell: true,
      fase_o_tiempo_norm: Math.PI * 0.25,
    },
    capas_sugeridas: {
      mostrar_e: true,
      mostrar_b_h: true,
      mostrar_jc: true,
      mostrar_jd: true,
      mostrar_poynting: true,
    },
    parametros_regimen: {
      amplitud_e0: 100,
      frecuencia: FRECUENCIA_CRUCE_AGUA_MAR,
      conductividad_s_m: 4.0,
      permitividad_relativa: 80,
      permeabilidad_relativa: 1,
      radio_evaluacion: 0.02,
      dimension_caracteristica: 0.1,
      fase_omega_t: Math.PI * 0.25,
    },
  },
  {
    id: "fiuba-ej-3-19-conductor-ferro",
    codigo_fiuba: "Cap. 3 · Ej. 3-18 y 3-19",
    titulo: "Conductor Cilíndrico: H Continuo vs B Discontinuo",
    subtitulo: "Perfil lineal interior, 1/ρ exterior y salto por μ_r",
    escenario: "geometrias_ampere",
    pestana_destino: "simulador",
    pregunta_guia:
      "Arrastrá el lazo amperiano a través de ρ = a con μ_r = 50: ¿por qué H_φ varía de forma continua mientras B_φ sufre un salto brusco?",
    observacion_esperada:
      "∮ H·dl solo depende de la corriente libre encerrada (continua en ρ = a), mientras que B = μ₀ μ_r H amplifica el campo en el núcleo ferromagnético.",
    parametros_geometria: {
      tipo: "conductor_cilindrico",
      corriente: 20,
      radio_interior: 0.01,
      radio_lazo: 0.008,
      permeabilidad_relativa_nucleo: 50,
    },
  },
  {
    id: "fiuba-ej-3-20-coaxial",
    codigo_fiuba: "Cap. 3 · Ej. 3-20",
    titulo: "Apantallamiento del Cable Coaxial",
    subtitulo: "Anulación exacta del campo exterior con corriente de retorno -I",
    escenario: "geometrias_ampere",
    pestana_destino: "simulador",
    pregunta_guia:
      "Ubicá el lazo en ρ > c con retorno equilibrado (α = 1) y luego reducí α a 0.5: ¿qué ocurre con el campo magnético externo?",
    observacion_esperada:
      "Con α = 1, I_enc = I - I = 0 garantiza H = B = 0 en todo el exterior; cualquier desbalance de retorno produce radiación/fuga de campo 1/ρ.",
    parametros_geometria: {
      tipo: "cable_coaxial",
      corriente: 10,
      radio_interior: 0.004,
      radio_medio: 0.012,
      radio_exterior: 0.016,
      factor_retorno_coaxial: 1,
      radio_lazo: 0.022,
      permeabilidad_relativa_nucleo: 1,
    },
  },
  {
    id: "fiuba-cap-5-onda-em",
    codigo_fiuba: "Cap. 5 · Ondas EM",
    titulo: "Emergencia de la Luz y Refracción en Vidrio",
    subtitulo: "Acoplamiento Faraday + Ampère-Maxwell ⇒ v = 1/√(με)",
    escenario: "onda_electromagnetica",
    pestana_destino: "simulador",
    pregunta_guia:
      "Apagá el término ∂D/∂t para comprobar que la onda desaparece; luego cambiá del vacío al vidrio (ε_r = 4) y verificá v_p y λ.",
    observacion_esperada:
      "Sin ∂D/∂t no hay propagación ondulatoria. En vidrio (ε_r = 4, μ_r = 1), el índice es n = 2, por lo que v_p = c/2, λ = λ₀/2 y η = η₀/2.",
    parametros_onda: {
      amplitud_e0: 100,
      frecuencia: 1e8,
      permitividad_relativa: 4,
      permeabilidad_relativa: 1,
      conductividad_s_m: 0,
      dimension_caracteristica: 0.1,
      polarizacion: "lineal",
      incluir_maxwell: true,
    },
  },
] as const;

export function obtenerPresetPorId(
  _id: string,
): PresetExperimentoFIUBA | undefined {
  return PRESETS_FIUBA.find((_preset) => _preset.id === _id);
}
