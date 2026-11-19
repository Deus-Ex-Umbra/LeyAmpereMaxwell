import type { PasoAnalitico } from "@/tipos/calculadora";
import type { EscenarioLaboratorio } from "@/tipos/simulacion";

export type ClaveTerminoEcuacion =
  | "rotacional_h"
  | "corriente_conduccion"
  | "corriente_desplazamiento"
  | "campo_electrico"
  | "flujo_electrico"
  | "constantes_vacio"
  | "poynting";

export type IdentificadorFormulacion =
  | "integral_medios"
  | "integral_vacio"
  | "diferencial_medios"
  | "diferencial_vacio"
  | "fasorial";

export interface DetalleTerminoEcuacion {
  id: ClaveTerminoEcuacion;
  etiqueta_corta: string;
  simbolo_corto_latex: string;
  simbolo_latex: string;
  nombre: string;
  unidades_si: string;
  color_hex: string;
  significado_fisico: string;
  analogia_intuitiva: string;
  rol_en_simulador: string;
  nota_historica: string;
}

export interface FormulacionAmpereMaxwell {
  id: IdentificadorFormulacion;
  etiqueta_corta: string;
  titulo: string;
  dominio: string;
  referencia_fiuba: string;
  latex_interactivo: string;
  terminos_incluidos: readonly ClaveTerminoEcuacion[];
  resumen_aplicacion: string;
}

export interface CasoPoyntingFIUBA {
  id: string;
  titulo: string;
  referencia_fiuba: string;
  ecuacion_latex: string;
  interpretacion: string;
  preset_relacionado_id?: string;
}

export interface EntornoModelacionCap1 {
  id: string;
  nombre: string;
  criterio_latex: string;
  ecuaciones_clave_latex: string;
  aplicaciones: string;
  preset_relacionado_id?: string;
}

export interface HitoHistoricoMaxwell {
  id: string;
  anio: string;
  cientifico: string;
  titulo: string;
  ecuacion_latex: string;
  aporte_clave: string;
  brecha_o_sintesis: string;
  escenario_vinculado: EscenarioLaboratorio;
  preset_relacionado_id: string;
}

export const TERMINOS_ECUACION_MAXWELL: Record<
  ClaveTerminoEcuacion,
  DetalleTerminoEcuacion
> = {
  rotacional_h: {
    id: "rotacional_h",
    etiqueta_corta: "Circulación / Rotacional",
    simbolo_corto_latex: "\\nabla\\times\\vec{H}",
    simbolo_latex: "\\oint_C \\vec{H}\\cdot d\\vec{l} \\;\\;/\\;\\; \\nabla\\times\\vec{H}",
    nombre: "Circulación y rotacional del campo magnético",
    unidades_si: "A (integral) · A/m² (rotacional)",
    color_hex: "#fb7185",
    significado_fisico:
      "Mide la intensidad con que las líneas de campo magnético H (o B) se cierran alrededor de la trayectoria amperiana C o en torno a un punto local.",
    analogia_intuitiva:
      "Equivale a la vorticidad en mecánica de fluidos: cuantifica el giro neto del campo alrededor de las fuentes de corriente.",
    rol_en_simulador:
      "Controlado por el anillo amarillo C y los anillos azimutales de B/H; su circulación debe mantenerse invariante al alternar entre S₁ y S₂.",
    nota_historica:
      "Formulado integralmente por Ampère (1826) y expresado en forma rotacional por Maxwell y Heaviside.",
  },
  corriente_conduccion: {
    id: "corriente_conduccion",
    etiqueta_corta: "Conducción",
    simbolo_corto_latex: "I_c,\\,\\vec{j}",
    simbolo_latex: "I_c \\;\\;/\\;\\; \\vec{j} = \\sigma\\vec{E}",
    nombre: "Corriente libre de conducción",
    unidades_si: "A (corriente) · A/m² (densidad)",
    color_hex: "#fbbf24",
    significado_fisico:
      "Transporte efectivo de portadores libres (electrones o iones) impulsados por el campo eléctrico en conductores o dieléctricos con pérdidas.",
    analogia_intuitiva:
      "Flujo real de materia cargada atravesando la superficie S₁ sobre el conductor o filtrándose en un dieléctrico conductor.",
    rol_en_simulador:
      "Representada en ámbar en los cables axiales (S₁) y en el entrehierro cuando σ > 0 (Prob. 5.8).",
    nota_historica:
      "Única fuente considerada por la ley magnetostática de Ampère (1826); insuficiente en circuitos con capacitores.",
  },
  corriente_desplazamiento: {
    id: "corriente_desplazamiento",
    etiqueta_corta: "Desplazamiento",
    simbolo_corto_latex: "\\partial\\vec{D}/\\partial t",
    simbolo_latex: "I_d = \\frac{d\\Phi_D}{dt} \\;\\;/\\;\\; \\frac{\\partial\\vec{D}}{\\partial t}",
    nombre: "Corriente de desplazamiento de Maxwell",
    unidades_si: "A (corriente) · A/m² (densidad)",
    color_hex: "#a855f7",
    significado_fisico:
      "Tasa temporal de variación del vector desplazamiento eléctrico D = ε₀E + P. Genera campo magnético exactamente igual que una corriente de conducción, incluso en el vacío.",
    analogia_intuitiva:
      "Completa el circuito magnético a través del entrehierro del capacitor donde no cruzan electrones, preservando la continuidad total.",
    rol_en_simulador:
      "Vectores violeta entre las placas (S₂). Al desactivar el interruptor de Maxwell aparece la contradicción S₁ ≠ S₂ y colapsan las ondas EM.",
    nota_historica:
      "Introducida por James Clerk Maxwell (1861–1864) para reconciliar Ampère con la conservación de la carga.",
  },
  campo_electrico: {
    id: "campo_electrico",
    etiqueta_corta: "Campo eléctrico",
    simbolo_corto_latex: "\\vec{E},\\,\\vec{D}",
    simbolo_latex: "\\vec{E} \\;\\;/\\;\\; \\vec{D} = \\varepsilon_0\\varepsilon_r\\vec{E}",
    nombre: "Campo eléctrico y vector desplazamiento",
    unidades_si: "V/m (E) · C/m² (D)",
    color_hex: "#38bdf8",
    significado_fisico:
      "E define la fuerza por unidad de carga; D = ε₀E + P incorpora la respuesta de polarización ligada del dieléctrico y vincula su divergencia con la carga libre ρ.",
    analogia_intuitiva:
      "En un capacitor de placas paralelas, E = V/d establece la tensión aplicada y su variación temporal impulsa la corriente de desplazamiento.",
    rol_en_simulador:
      "Vectores celestes en el entrehierro; en modo Bessel (Ej. 5-10) siguen J₀(kρ) e invierten signo tras el primer anillo nodal ka = 2.405.",
    nota_historica:
      "Faraday introdujo el concepto de líneas de fuerza y desplazamiento dieléctrico; Maxwell lo formalizó como campo vectorial.",
  },
  flujo_electrico: {
    id: "flujo_electrico",
    etiqueta_corta: "Flujo eléctrico",
    simbolo_corto_latex: "\\Phi_E",
    simbolo_latex: "\\Phi_E = \\iint_S \\vec{E}\\cdot d\\vec{S}",
    nombre: "Flujo del campo eléctrico",
    unidades_si: "V·m (N·m²/C)",
    color_hex: "#60a5fa",
    significado_fisico:
      "Integral de superficie de la componente normal de E a través de la superficie abierta S apoyada en la curva cerrada C.",
    analogia_intuitiva:
      "Proporcional al número neto de líneas de campo eléctrico que perforan la bolsa S₂ entre las placas del capacitor.",
    rol_en_simulador:
      "La variación temporal dΦ_E/dt multiplicada por ε₀ε_r entrega exactamente I_d en S₂ y coincide con I_c en S₁.",
    nota_historica:
      "Permitió expresar la forma integral de Ampère-Maxwell en el vacío mediante el Teorema de Stokes.",
  },
  constantes_vacio: {
    id: "constantes_vacio",
    etiqueta_corta: "Constantes del vacío",
    simbolo_corto_latex: "\\mu_0,\\,\\varepsilon_0",
    simbolo_latex: "\\mu_0,\\; \\varepsilon_0 \\;\\;\\Rightarrow\\;\\; c = \\frac{1}{\\sqrt{\\mu_0\\varepsilon_0}}",
    nombre: "Constantes constitutivas del vacío",
    unidades_si: "μ₀ [H/m] · ε₀ [F/m] · c [m/s]",
    color_hex: "#fb923c",
    significado_fisico:
      "μ₀ = 4π×10⁻⁷ H/m y ε₀ ≈ 8.854×10⁻¹² F/m fijan la respuesta magnética y eléctrica del espacio libre y determinan la velocidad de propagación de las ondas EM.",
    analogia_intuitiva:
      "Cumplen un papel análogo a la densidad y la elasticidad en una cuerda tensa: fijan la velocidad c y la impedancia η₀ ≈ 376.7 Ω del vacío.",
    rol_en_simulador:
      "Al multiplicar por ε_r y μ_r de la tabla FIUBA Cap. 2, reducen la velocidad de fase a v = c/√(μ_r ε_r) y escalan C y B.",
    nota_historica:
      "En 1864 Maxwell calculó 1/√(μ₀ε₀) a partir de medidas puramente eléctricas (Weber–Kohlrausch) y obtuvo la velocidad de la luz de Fizeau.",
  },
  poynting: {
    id: "poynting",
    etiqueta_corta: "Vector de Poynting",
    simbolo_corto_latex: "\\vec{N} = \\vec{E}\\times\\vec{H}",
    simbolo_latex: "\\vec{N} = \\vec{E}\\times\\vec{H}",
    nombre: "Vector de Poynting (densidad de flujo de potencia)",
    unidades_si: "W/m²",
    color_hex: "#10b981",
    significado_fisico:
      "Indica la dirección y magnitud de la transferencia de energía electromagnética por unidad de área y tiempo a través del espacio.",
    analogia_intuitiva:
      "En un capacitor en carga, la energía no viaja dentro del metal de los cables sino que ingresa radialmente por el borde del entrehierro.",
    rol_en_simulador:
      "Flechas verde esmeralda entrando radialmente al capacitor durante la carga, saliendo en descarga y avanzando en +x en la onda EM.",
    nota_historica:
      "Formulado por John Henry Poynting (1884) y Oliver Heaviside como consecuencia directa de las ecuaciones de Maxwell.",
  },
};

export const FORMULACIONES_AMPERE_MAXWELL: readonly FormulacionAmpereMaxwell[] =
  [
    {
      id: "integral_medios",
      etiqueta_corta: "Integral (Medios)",
      titulo: "Forma Integral General en Medios Materiales",
      dominio: "Dominio temporal · Teorema de Stokes",
      referencia_fiuba: "Cap. 1 y Cap. 5 (p. 5-18)",
      latex_interactivo:
        "\\htmlData{termino=rotacional_h}{\\htmlClass{katex-termino-interactivo}{\\azul{\\oint_C \\vec{H}\\cdot d\\vec{l}}}} = " +
        "\\htmlData{termino=corriente_conduccion}{\\htmlClass{katex-termino-interactivo}{\\naranja{I_c}}} + " +
        "\\htmlData{termino=corriente_desplazamiento}{\\htmlClass{katex-termino-interactivo}{\\morado{\\iint_S \\frac{\\partial \\vec{D}}{\\partial t}\\cdot d\\vec{S}}}}",
      terminos_incluidos: [
        "rotacional_h",
        "corriente_conduccion",
        "corriente_desplazamiento",
        "campo_electrico",
      ],
      resumen_aplicacion:
        "Ideal para geometrías simétricas (capacitor Ej. 5-9, conductor Ej. 3-19, coaxial Ej. 3-20) porque elimina explícitamente las corrientes ligadas de magnetización.",
    },
    {
      id: "integral_vacio",
      etiqueta_corta: "Integral (Vacío)",
      titulo: "Forma Integral en el Vacío (B y E)",
      dominio: "Dominio temporal · Espacio libre (ε_r = 1, μ_r = 1)",
      referencia_fiuba: "Cap. 5 (p. 5-18)",
      latex_interactivo:
        "\\htmlData{termino=rotacional_h}{\\htmlClass{katex-termino-interactivo}{\\azul{\\oint_C \\vec{B}\\cdot d\\vec{l}}}} = " +
        "\\htmlData{termino=constantes_vacio}{\\htmlClass{katex-termino-interactivo}{\\naranja{\\mu_0}}} " +
        "\\htmlData{termino=corriente_conduccion}{\\htmlClass{katex-termino-interactivo}{\\destacar{I_c}}} + " +
        "\\htmlData{termino=constantes_vacio}{\\htmlClass{katex-termino-interactivo}{\\naranja{\\mu_0\\varepsilon_0}}} " +
        "\\htmlData{termino=flujo_electrico}{\\htmlClass{katex-termino-interactivo}{\\morado{\\frac{d\\Phi_E}{dt}}}}",
      terminos_incluidos: [
        "rotacional_h",
        "constantes_vacio",
        "corriente_conduccion",
        "flujo_electrico",
        "corriente_desplazamiento",
      ],
      resumen_aplicacion:
        "Muestra explícitamente el factor μ₀ε₀ = 1/c² que acopla la variación del flujo eléctrico Φ_E con la circulación de la inducción magnética B.",
    },
    {
      id: "diferencial_medios",
      etiqueta_corta: "Diferencial (Medios)",
      titulo: "Forma Diferencial (Local) en Medios Materiales",
      dominio: "Dominio temporal · Punto a punto",
      referencia_fiuba: "Cap. 1 y Cap. 5 (p. 5-18)",
      latex_interactivo:
        "\\htmlData{termino=rotacional_h}{\\htmlClass{katex-termino-interactivo}{\\azul{\\nabla\\times\\vec{H}}}} = " +
        "\\htmlData{termino=corriente_conduccion}{\\htmlClass{katex-termino-interactivo}{\\naranja{\\vec{j}}}} + " +
        "\\htmlData{termino=corriente_desplazamiento}{\\htmlClass{katex-termino-interactivo}{\\morado{\\frac{\\partial \\vec{D}}{\\partial t}}}}",
      terminos_incluidos: [
        "rotacional_h",
        "corriente_conduccion",
        "corriente_desplazamiento",
        "campo_electrico",
        "poynting",
      ],
      resumen_aplicacion:
        "Punto de partida para deducir la conservación de la carga, el Teorema de Poynting y las ecuaciones de onda y Bessel (Ej. 5-10).",
    },
    {
      id: "diferencial_vacio",
      etiqueta_corta: "Diferencial (Vacío)",
      titulo: "Forma Diferencial en el Vacío",
      dominio: "Dominio temporal · Relaciones B = μ₀H, D = ε₀E",
      referencia_fiuba: "Cap. 1 y Cap. 5",
      latex_interactivo:
        "\\htmlData{termino=rotacional_h}{\\htmlClass{katex-termino-interactivo}{\\azul{\\nabla\\times\\vec{B}}}} = " +
        "\\htmlData{termino=constantes_vacio}{\\htmlClass{katex-termino-interactivo}{\\naranja{\\mu_0}}} " +
        "\\htmlData{termino=corriente_conduccion}{\\htmlClass{katex-termino-interactivo}{\\destacar{\\vec{j}}}} + " +
        "\\htmlData{termino=constantes_vacio}{\\htmlClass{katex-termino-interactivo}{\\naranja{\\mu_0\\varepsilon_0}}} " +
        "\\htmlData{termino=campo_electrico}{\\htmlClass{katex-termino-interactivo}{\\morado{\\frac{\\partial \\vec{E}}{\\partial t}}}}",
      terminos_incluidos: [
        "rotacional_h",
        "constantes_vacio",
        "corriente_conduccion",
        "campo_electrico",
        "corriente_desplazamiento",
      ],
      resumen_aplicacion:
        "Cuando j = 0 en el vacío, su acoplamiento con la ley de Faraday produce directamente la ecuación de ondas a velocidad c.",
    },
    {
      id: "fasorial",
      etiqueta_corta: "Fasorial (ω)",
      titulo: "Forma Fasorial en Régimen Armónico (convención exp(+iωt))",
      dominio: "Dominio de frecuencia · Medios lineales (D = εE, j = σE)",
      referencia_fiuba: "Cap. 1 y Cap. 3 (Ej. 3-7)",
      latex_interactivo:
        "\\htmlData{termino=rotacional_h}{\\htmlClass{katex-termino-interactivo}{\\azul{\\nabla\\times\\tilde{\\vec{H}}}}} = " +
        "\\left(" +
        "\\htmlData{termino=corriente_conduccion}{\\htmlClass{katex-termino-interactivo}{\\naranja{\\sigma}}} + " +
        "\\htmlData{termino=corriente_desplazamiento}{\\htmlClass{katex-termino-interactivo}{\\morado{i\\omega\\varepsilon}}}" +
        "\\right)" +
        "\\htmlData{termino=campo_electrico}{\\htmlClass{katex-termino-interactivo}{\\verde{\\tilde{\\vec{E}}}}} = " +
        "\\sigma_{\\text{eq}}\\,\\tilde{\\vec{E}}",
      terminos_incluidos: [
        "rotacional_h",
        "corriente_conduccion",
        "corriente_desplazamiento",
        "campo_electrico",
      ],
      resumen_aplicacion:
        "Unifica conducción y desplazamiento en σ_eq = σ + iωε = iωε_eq. Define la frecuencia de cruce f_c = σ/(2πε) entre buen conductor y dieléctrico.",
    },
  ] as const;

export const DERIVACION_CONTINUIDAD_PASOS: readonly PasoAnalitico[] = [
  {
    numero: 1,
    titulo: "Divergencia de la ley magnetostática de Ampère",
    expresion_latex:
      "\\nabla\\times\\vec{H} = \\vec{j} \\quad\\Longrightarrow\\quad \\azul{\\nabla\\cdot(\\nabla\\times\\vec{H})} \\equiv \\rojo{0} \\quad\\Longrightarrow\\quad \\nabla\\cdot\\vec{j} = \\rojo{0}",
    nota_conceptual: "Identidad vectorial: la divergencia de todo rotacional es idénticamente nula",
  },
  {
    numero: 2,
    titulo: "Contradicción con la ecuación de continuidad de carga",
    expresion_latex:
      "\\nabla\\cdot\\vec{j} + \\frac{\\partial \\rho}{\\partial t} = 0 \\quad\\Longrightarrow\\quad \\nabla\\cdot\\vec{j} = \\rojo{-\\frac{\\partial \\rho}{\\partial t} \\neq 0}",
    nota_conceptual: "Conservación de carga (Cap. 1 y Cap. 3): falla en un capacitor en carga",
  },
  {
    numero: 3,
    titulo: "Sustitución de la Ley de Gauss eléctrica (∇·D = ρ)",
    expresion_latex:
      "\\nabla\\cdot\\vec{j} + \\frac{\\partial}{\\partial t}\\left(\\azul{\\nabla\\cdot\\vec{D}}\\right) = 0 \\quad\\Longrightarrow\\quad \\nabla\\cdot\\left(\\vec{j} + \\morado{\\frac{\\partial \\vec{D}}{\\partial t}}\\right) = 0",
    verificacion_dimensional:
      "\\left[\\frac{\\partial\\vec{D}}{\\partial t}\\right] = \\frac{\\text{C}/\\text{m}^2}{\\text{s}} = \\frac{\\text{A}}{\\text{m}^2} = [\\vec{j}]",
  },
  {
    numero: 4,
    titulo: "Ley completa de Ampère-Maxwell (diferencial e integral)",
    expresion_latex:
      "\\destacar{\\nabla\\times\\vec{H} = \\vec{j} + \\frac{\\partial \\vec{D}}{\\partial t}} \\quad\\Longleftrightarrow\\quad \\destacar{\\oint_C \\vec{H}\\cdot d\\vec{l} = I_c + \\iint_S \\frac{\\partial \\vec{D}}{\\partial t}\\cdot d\\vec{S}}",
    nota_conceptual: "Teorema de Stokes: elimina la ambigüedad entre S₁ y S₂ (FIUBA p. 5-18)",
  },
] as const;

export const TEOREMA_POYNTING_PASOS: readonly PasoAnalitico[] = [
  {
    numero: 1,
    titulo: "Identidad de divergencia aplicada a E × H",
    expresion_latex:
      "\\nabla\\cdot(\\vec{E}\\times\\vec{H}) = \\vec{H}\\cdot(\\nabla\\times\\vec{E}) - \\vec{E}\\cdot(\\nabla\\times\\vec{H})",
  },
  {
    numero: 2,
    titulo: "Sustitución de Faraday y Ampère-Maxwell",
    expresion_latex:
      "\\nabla\\cdot\\verde{\\vec{N}} = -\\vec{H}\\cdot\\frac{\\partial\\vec{B}}{\\partial t} - \\vec{E}\\cdot\\vec{j} - \\vec{E}\\cdot\\frac{\\partial\\vec{D}}{\\partial t}",
    nota_conceptual: "N = E × H representa la densidad de flujo de potencia [W/m²] (pp. 5-19–5-20)",
  },
  {
    numero: 3,
    titulo: "Balance energético integral en un volumen V cerrado por S",
    expresion_latex:
      "\\destacar{-\\oint_S \\vec{N}\\cdot d\\vec{S} = \\int_V \\vec{j}\\cdot\\vec{E}\\,dV + \\frac{d}{dt}\\int_V \\left(\\frac{1}{2}\\vec{D}\\cdot\\vec{E} + \\frac{1}{2}\\vec{B}\\cdot\\vec{H}\\right)dV}",
    nota_conceptual: "Potencia entrante = disipación Joule + variación de energía almacenada",
  },
] as const;

export const CASOS_POYNTING_FIUBA: readonly CasoPoyntingFIUBA[] = [
  {
    id: "poynting-resistor",
    titulo: "Resistor cilíndrico estacionario (Ej. 5-8)",
    referencia_fiuba: "Cap. 5, Ej. 5-8 (p. 5-20)",
    ecuacion_latex:
      "\\vec{N}(a) = -\\frac{I^2}{2\\pi^2 a^3 \\sigma}\\,\\hat{\\boldsymbol{\\rho}},\\quad P_{\\text{ent}} = -\\oint \\vec{N}\\cdot d\\vec{S} = \\destacar{I^2 R}",
    interpretacion:
      "El campo E axial y el campo H azimutal hacen que el vector N apunte radialmente hacia adentro de la superficie cilíndrica: el calor de Joule proviene del campo electromagnético exterior.",
    preset_relacionado_id: "fiuba-ej-3-19-conductor-ferro",
  },
  {
    id: "poynting-capacitor",
    titulo: "Capacitor circular en carga (Ej. 5-9)",
    referencia_fiuba: "Cap. 5, Ej. 5-9 (pp. 5-21–5-22)",
    ecuacion_latex:
      "\\vec{N}(\\rho) = -\\frac{\\Delta V\\,I\\,\\rho}{2\\pi a^2 d}\\,\\hat{\\boldsymbol{\\rho}},\\quad P_{\\text{ent}} = \\Delta V\\,I = \\destacar{\\frac{d}{dt}\\left(\\frac{1}{2}C\\,\\Delta V^2\\right)}",
    interpretacion:
      "La energía eléctrica almacenada entre placas no entra a través de los conductores axiales, sino radialmente desde el espacio lateral que rodea el entrehierro.",
    preset_relacionado_id: "fiuba-ej-5-9-poynting",
  },
] as const;

export const DEDUCCION_ONDA_C_PASOS: readonly PasoAnalitico[] = [
  {
    numero: 1,
    titulo: "Ecuaciones acopladas en espacio libre de fuentes (ρ = 0, j = 0)",
    expresion_latex:
      "\\nabla\\times\\vec{E} = -\\naranja{\\mu_0}\\frac{\\partial\\vec{H}}{\\partial t},\\qquad \\nabla\\times\\vec{H} = \\naranja{\\varepsilon_0}\\frac{\\partial\\vec{E}}{\\partial t}",
    nota_conceptual: "Sin ∂D/∂t el sistema se desacopla y desaparece la solución ondulatoria",
  },
  {
    numero: 2,
    titulo: "Rotacional de la Ley de Faraday y sustitución de Ampère-Maxwell",
    expresion_latex:
      "\\nabla\\times(\\nabla\\times\\vec{E}) = -\\mu_0\\frac{\\partial}{\\partial t}(\\nabla\\times\\vec{H}) = -\\naranja{\\mu_0\\varepsilon_0}\\frac{\\partial^2\\vec{E}}{\\partial t^2}",
  },
  {
    numero: 3,
    titulo: "Ecuación de onda tridimensional (usando ∇·E = 0)",
    expresion_latex:
      "\\nabla(\\tachar{\\nabla\\cdot\\vec{E}}) - \\nabla^2\\vec{E} = -\\mu_0\\varepsilon_0\\frac{\\partial^2\\vec{E}}{\\partial t^2} \\quad\\Longrightarrow\\quad \\azul{\\nabla^2\\vec{E} = \\mu_0\\varepsilon_0\\frac{\\partial^2\\vec{E}}{\\partial t^2}}",
  },
  {
    numero: 4,
    titulo: "Identificación de la velocidad de la luz c (y velocidad v en medios)",
    expresion_latex:
      "\\destacar{c = \\frac{1}{\\sqrt{\\mu_0\\varepsilon_0}} = 299\\,792\\,458\\,\\text{m/s}},\\qquad v = \\frac{1}{\\sqrt{\\mu\\varepsilon}} = \\frac{c}{\\sqrt{\\mu_r\\varepsilon_r}}",
    nota_conceptual: "Unificación de electromagnetismo y óptica (Maxwell, 1864)",
    verificacion_dimensional:
      "\\left([\\text{H/m}]\\cdot[\\text{F/m}]\\right)^{-1/2} = \\left[\\frac{\\text{s}^2}{\\text{m}^2}\\right]^{-1/2} = \\frac{\\text{m}}{\\text{s}}",
  },
] as const;

export const ENTORNOS_MODELACION_CAP1: readonly EntornoModelacionCap1[] = [
  {
    id: "cuasiestatico",
    nombre: "1. Régimen Cuasi-Estático (Parámetros Concentrados)",
    criterio_latex: "\\lambda_{\\min} \\ge 10\\,D \\quad (ka \\lesssim 0.31)",
    ecuaciones_clave_latex: "V = I R,\\quad I = C\\frac{dV}{dt},\\quad V = L\\frac{dI}{dt}",
    aplicaciones:
      "Circuitos eléctricos convencionales, capacitores e inductores en baja y media frecuencia (Ej. 5-9, Prob. 5.4).",
    preset_relacionado_id: "fiuba-ej-5-9-paradoja",
  },
  {
    id: "distribuido",
    nombre: "2. Régimen de Parámetros Distribuidos",
    criterio_latex: "D \\lesssim \\lambda_{\\min} < 10\\,D",
    ecuaciones_clave_latex: "\\frac{\\partial V}{\\partial z} = -Z' I,\\quad \\frac{\\partial I}{\\partial z} = -Y' V",
    aplicaciones:
      "Líneas de transmisión, cables coaxiales largos de RF, pistas de alta velocidad donde el retardo de fase es apreciable.",
    preset_relacionado_id: "fiuba-ej-3-20-coaxial",
  },
  {
    id: "campo_completo",
    nombre: "3. Modelo de Campos Completo (Electrodinámica)",
    criterio_latex: "\\lambda_{\\min} < D \\quad (ka \\gtrsim 1)",
    ecuaciones_clave_latex: "E_z(\\rho) \\propto J_0(k\\rho),\\quad B_\\varphi(\\rho) \\propto J_1(k\\rho)",
    aplicaciones:
      "Guías de onda, cavidades resonantes, antenas, radiación óptica y capacitores en microondas (Ej. 5-10, Ondas EM).",
    preset_relacionado_id: "fiuba-ej-5-10-bessel",
  },
] as const;

export const LINEA_HISTORICA_MAXWELL: readonly HitoHistoricoMaxwell[] = [
  {
    id: "oersted-1820",
    anio: "1820",
    cientifico: "Hans Christian Oersted",
    titulo: "Desviación magnética por corriente eléctrica",
    ecuacion_latex: "I_{\\text{constante}} \\;\\longrightarrow\\; \\vec{B}\\text{ circular}",
    aporte_clave:
      "Demostró experimentalmente que una corriente eléctrica estacionaria desvía una aguja imantada perpendicularmente al conductor.",
    brecha_o_sintesis:
      "Abrió la investigación cuantitativa de la interacción entre electricidad y magnetismo, hasta entonces tratados como fenómenos independientes.",
    escenario_vinculado: "geometrias_ampere",
    preset_relacionado_id: "fiuba-ej-3-19-conductor-ferro",
  },
  {
    id: "biot-savart-1820",
    anio: "1820",
    cientifico: "Jean-Baptiste Biot y Félix Savart",
    titulo: "Ley diferencial del campo magnetostático",
    ecuacion_latex:
      "d\\vec{B} = \\frac{\\naranja{\\mu_0}\\,I}{4\\pi}\\frac{d\\vec{l}\\times\\hat{\\vec{r}}}{r^2}",
    aporte_clave:
      "Cuantificaron la dependencia 1/ρ del campo alrededor de un conductor rectilíneo largo y la contribución elemental de cada segmento de corriente.",
    brecha_o_sintesis:
      "Válida exclusivamente para corrientes estacionarias (∇·j = 0); su evaluación directa resulta laboriosa sin simetría simple.",
    escenario_vinculado: "geometrias_ampere",
    preset_relacionado_id: "fiuba-ej-3-19-conductor-ferro",
  },
  {
    id: "ampere-1820-1826",
    anio: "1820–1826",
    cientifico: "André-Marie Ampère",
    titulo: "Ley circuital magnetostática",
    ecuacion_latex:
      "\\oint_C \\vec{H}\\cdot d\\vec{l} = I_{\\text{enc}},\\qquad \\nabla\\times\\vec{H} = \\vec{j}",
    aporte_clave:
      "Formuló la electrodinámica de corrientes estacionarias y la relación integral entre la circulación magnética y la corriente enlazada.",
    brecha_o_sintesis:
      "Incompleta en regímenes variables: falla al aplicarse a superficies que cruzan el entrehierro de un capacitor en carga (paradoja S₁ vs S₂).",
    escenario_vinculado: "geometrias_ampere",
    preset_relacionado_id: "fiuba-ej-3-20-coaxial",
  },
  {
    id: "faraday-1831",
    anio: "1831",
    cientifico: "Michael Faraday",
    titulo: "Ley de inducción electromagnética",
    ecuacion_latex:
      "\\oint_C \\vec{E}\\cdot d\\vec{l} = -\\frac{d\\Phi_B}{dt},\\qquad \\nabla\\times\\vec{E} = -\\frac{\\partial\\vec{B}}{\\partial t}",
    aporte_clave:
      "Descubrió que un flujo magnético variable en el tiempo induce un campo eléctrico rotacional, introduciendo el concepto físico de campo.",
    brecha_o_sintesis:
      "Aportó la primera mitad del acoplamiento dinámico; faltaba el mecanismo recíproco mediante el cual un campo eléctrico variable generara campo magnético.",
    escenario_vinculado: "onda_electromagnetica",
    preset_relacionado_id: "fiuba-cap-5-onda-em",
  },
  {
    id: "maxwell-1855-1873",
    anio: "1855 · 1861–64 · 1873",
    cientifico: "James Clerk Maxwell",
    titulo: "Corriente de desplazamiento y teoría electromagnética de la luz",
    ecuacion_latex:
      "\\destacar{\\nabla\\times\\vec{H} = \\vec{j} + \\frac{\\partial\\vec{D}}{\\partial t}} \\;\\Longrightarrow\\; c = \\frac{1}{\\sqrt{\\mu_0\\varepsilon_0}}",
    aporte_clave:
      "Introdujo ∂D/∂t (1861–62), consolidó las ecuaciones del campo dinámico (1864) y su Tratado (1873), resolviendo la conservación de la carga y prediciendo ondas transversales a velocidad c.",
    brecha_o_sintesis:
      "Unificó electricidad, magnetismo y óptica bajo cuatro ecuaciones consistentes; restaba su confirmación experimental directa en laboratorio.",
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-ej-5-9-paradoja",
  },
  {
    id: "hertz-1887-1888",
    anio: "1887–1888",
    cientifico: "Heinrich Hertz",
    titulo: "Generación y detección experimental de ondas electromagnéticas",
    ecuacion_latex:
      "v_{\\text{exp}} = \\lambda f \\approx c,\\qquad \\vec{E}\\perp\\vec{H}\\perp\\hat{\\vec{k}}",
    aporte_clave:
      "Construyó el primer oscilador dipolar y resonador de chispa, midiendo ondas estacionarias, reflexión, refracción, polarización y velocidad igual a c.",
    brecha_o_sintesis:
      "Confirmó experimentalmente la existencia física de la corriente de desplazamiento e inauguró las radiocomunicaciones modernas.",
    escenario_vinculado: "onda_electromagnetica",
    preset_relacionado_id: "fiuba-cap-5-onda-em",
  },
] as const;
