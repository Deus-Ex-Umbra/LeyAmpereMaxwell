import type { PasoAnalitico } from "@/tipos/calculadora";
import type {
  CategoriaEvaluacion,
  MisionVerificacion,
  OpcionPregunta,
  TipoPreguntaEvaluacion,
} from "@/tipos/evaluacion";
import type { EscenarioLaboratorio } from "@/tipos/simulacion";

export type NivelDificultadPregunta = "basica" | "intermedia" | "avanzada";

export interface ReactivoEvaluacion {
  id: string;
  numero: number;
  tipo: TipoPreguntaEvaluacion;
  dificultad: NivelDificultadPregunta;
  categoria: CategoriaEvaluacion;
  etiqueta_tema: string;
  referencia_fiuba: string;
  enunciado: string;
  enunciado_latex?: string;
  opciones: readonly OpcionPregunta[];
  id_opcion_correcta: string;
  pista: string;
  explicacion_resumen: string;
  demostracion_pasos: readonly PasoAnalitico[];
  escenario_vinculado: EscenarioLaboratorio;
  preset_relacionado_id: string;
}

export interface MisionInteractiva extends MisionVerificacion {
  preset_relacionado_id: string;
  paso_sugerido: string;
}

export const BANCO_PREGUNTAS_FIUBA: readonly ReactivoEvaluacion[] = [
  {
    id: "eval-01-paradoja-s2",
    numero: 1,
    tipo: "conceptual",
    dificultad: "basica",
    categoria: "paradoja_desplazamiento",
    etiqueta_tema: "Paradoja S₁ vs S₂",
    referencia_fiuba: "Cap. 5 · Ej. 5-9",
    enunciado:
      "Un capacitor circular sin pérdidas (σ = 0) se carga mediante un cable con corriente I(t). Se traza un lazo amperiano C alrededor del cable y se elige la superficie abombada S₂ que rodea una placa y atraviesa el entrehierro. ¿Qué valores toman I_c(S₂) e I_d(S₂)?",
    opciones: [
      { id: "a", texto: "I_c(S₂) = I(t) y I_d(S₂) = 0." },
      { id: "b", texto: "I_c(S₂) = 0 y I_d(S₂) = I(t)." },
      { id: "c", texto: "I_c(S₂) = I(t)/2 y I_d(S₂) = I(t)/2." },
      { id: "d", texto: "Ambas son nulas porque ningún conductor perfora S₂." },
    ],
    id_opcion_correcta: "b",
    pista:
      "Observá qué atraviesa S₂: ningún cable conductor cruza la bolsa, pero sí todas las líneas del campo eléctrico variable entre las placas.",
    explicacion_resumen:
      "Al no cortar el cable y ser σ = 0, I_c(S₂) = 0. Sin embargo, el flujo eléctrico variable aporta I_d(S₂) = dΦ_D/dt = I(t), garantizando la misma circulación ∮ H·dl que en S₁.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Evaluación de fuentes sobre S₂",
        expresion_latex:
          "I_c(S_2) = \\rojo{0},\\qquad \\Phi_D(S_2) = \\varepsilon E_z \\pi a^2 = Q(t)",
        nota_conceptual: "Ley de Gauss en la placa encerrada entre S₁ y S₂",
      },
      {
        numero: 2,
        titulo: "Corriente de desplazamiento y circulación resultante",
        expresion_latex:
          "I_d(S_2) = \\frac{d\\Phi_D}{dt} = \\frac{dQ}{dt} = \\destacar{I(t)} \\;\\Longrightarrow\\; \\oint_C \\vec{H}\\cdot d\\vec{l} = I(t)",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-ej-5-9-paradoja",
  },
  {
    id: "eval-02-numerico-b-capacitor",
    numero: 2,
    tipo: "numerica",
    dificultad: "intermedia",
    categoria: "paradoja_desplazamiento",
    etiqueta_tema: "Cálculo de I_d y B(ρ)",
    referencia_fiuba: "Cap. 5 · Ej. 5-9",
    enunciado:
      "Un capacitor circular en aire (μ_r = 1) de radio a = 5 cm se carga con corriente instantánea I = 2.0 A en régimen cuasi-estático. ¿Cuánto vale la inducción magnética |B_φ| a mitad de radio (ρ = 2.5 cm) y en el borde (ρ = 5.0 cm)?",
    enunciado_latex: "a = 5\\,\\text{cm},\\quad I_d = 2.0\\,\\text{A},\\quad \\mu_0 = 4\\pi\\times 10^{-7}\\,\\text{H/m}",
    opciones: [
      { id: "a", texto: "4.0 µT en ρ = 2.5 cm y 8.0 µT en ρ = 5.0 cm." },
      { id: "b", texto: "8.0 µT en ρ = 2.5 cm y 4.0 µT en ρ = 5.0 cm." },
      { id: "c", texto: "16.0 µT en ρ = 2.5 cm y 8.0 µT en ρ = 5.0 cm." },
      { id: "d", texto: "0 µT en el interior y 8.0 µT en el borde." },
    ],
    id_opcion_correcta: "a",
    pista:
      "Dentro del entrehierro (ρ ≤ a) la densidad J_d es uniforme, por lo que la corriente encerrada escala como (ρ/a)² y B crece linealmente con ρ.",
    explicacion_resumen:
      "Dentro de las placas B(ρ) = μ₀ I ρ / (2π a²) crece linealmente hasta su máximo en el borde ρ = a: B(a) = 8.0 µT y B(a/2) = 4.0 µT.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Inducción en el borde ρ = a",
        expresion_latex:
          "B_\\varphi(a) = \\frac{\\naranja{\\mu_0} I}{2\\pi a} = \\frac{4\\pi\\times 10^{-7}\\cdot 2.0}{2\\pi\\cdot 0.05} = \\destacar{8.0\\,\\mu\\text{T}}",
        nota_conceptual: "Lazo circular concéntrico encerrando toda la corriente I_d = I",
      },
      {
        numero: 2,
        titulo: "Inducción interior en ρ = a/2 = 2.5 cm",
        expresion_latex:
          "B_\\varphi\\!\\left(\\frac{a}{2}\\right) = \\frac{\\mu_0 I (a/2)}{2\\pi a^2} = \\frac{1}{2}B_\\varphi(a) = \\destacar{4.0\\,\\mu\\text{T}}",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-ej-5-9-paradoja",
  },
  {
    id: "eval-03-continuidad",
    numero: 3,
    tipo: "conceptual",
    dificultad: "basica",
    categoria: "paradoja_desplazamiento",
    etiqueta_tema: "Ecuación de continuidad",
    referencia_fiuba: "Cap. 1 y Cap. 5 (p. 5-18)",
    enunciado:
      "Al aplicar el operador divergencia a la ley magnetostática ∇×H = j se obtiene una contradicción en regímenes variables en el tiempo. ¿Cuál es la razón exacta?",
    opciones: [
      {
        id: "a",
        texto:
          "Porque ∇·(∇×H) ≡ 0 obliga a ∇·j = 0, contradiciendo la conservación de carga ∇·j + ∂ρ/∂t = 0 cuando ∂ρ/∂t ≠ 0.",
      },
      {
        id: "b",
        texto: "Porque ∇·H ≠ 0 en presencia de corrientes variables.",
      },
      {
        id: "c",
        texto: "Porque la ley de Ohm j = σE deja de ser lineal en corriente alterna.",
      },
      {
        id: "d",
        texto: "Porque el Teorema de Stokes no se aplica a superficies abiertas.",
      },
    ],
    id_opcion_correcta: "a",
    pista:
      "Recordá la identidad vectorial ∇·(∇×F) = 0 y comparala con la ecuación de continuidad de carga eléctrica.",
    explicacion_resumen:
      "La divergencia de un rotacional siempre es nula. Añadir ∂D/∂t hace que la fuente total j + ∂D/∂t tenga divergencia nula gracias a ∇·D = ρ.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Inconsistencia magnetostática",
        expresion_latex:
          "\\nabla\\cdot(\\nabla\\times\\vec{H}) = \\rojo{0} \\neq -\\frac{\\partial\\rho}{\\partial t} = \\nabla\\cdot\\vec{j}",
      },
      {
        numero: 2,
        titulo: "Corrección solenoidal de Maxwell",
        expresion_latex:
          "\\rho = \\nabla\\cdot\\vec{D} \\;\\Longrightarrow\\; \\nabla\\cdot\\left(\\vec{j} + \\morado{\\frac{\\partial\\vec{D}}{\\partial t}}\\right) = 0",
        nota_conceptual: "Conservación de la carga eléctrica (FIUBA p. 5-18)",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-prob-5-4-rc",
  },
  {
    id: "eval-04-poynting",
    numero: 4,
    tipo: "conceptual",
    dificultad: "intermedia",
    categoria: "poynting_energia",
    etiqueta_tema: "Teorema de Poynting",
    referencia_fiuba: "Cap. 5 · Ej. 5-9 (pp. 5-21–5-22)",
    enunciado:
      "Durante la carga de un capacitor circular de placas paralelas (V > 0, I > 0), ¿en qué dirección apunta el vector de Poynting N = E × H dentro del entrehierro?",
    opciones: [
      {
        id: "a",
        texto: "Axial (+ẑ), viajando de la placa positiva hacia la negativa.",
      },
      {
        id: "b",
        texto: "Azimutal (+φ̂), girando en paralelo al campo magnético H.",
      },
      {
        id: "c",
        texto: "Radialmente hacia adentro (-ρ̂), ingresando por el borde lateral.",
      },
      {
        id: "d",
        texto: "Radialmente hacia afuera (+ρ̂), saliendo desde el eje central.",
      },
    ],
    id_opcion_correcta: "c",
    pista:
      "Calculá el producto vectorial en coordenadas cilíndricas: E apunta en +ẑ y H apunta en +φ̂. ¿Cuánto vale ẑ × φ̂?",
    explicacion_resumen:
      "Como ẑ × φ̂ = -ρ̂, durante la carga N apunta radialmente hacia el centro del capacitor; su flujo a través del área lateral 2πad iguala exactamente V·I = dU_e/dt.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Producto vectorial en coordenadas cilíndricas",
        expresion_latex:
          "\\vec{N} = \\vec{E}\\times\\vec{H} = \\left(\\frac{\\Delta V}{d}\\hat{\\vec{z}}\\right)\\times\\left(\\frac{I\\rho}{2\\pi a^2}\\hat{\\boldsymbol{\\varphi}}\\right) = \\destacar{-\\frac{\\Delta V\\,I\\,\\rho}{2\\pi a^2 d}\\hat{\\boldsymbol{\\rho}}}",
        nota_conceptual: "ẑ × φ̂ = -ρ̂ (base cilíndrica dextrógira)",
      },
      {
        numero: 2,
        titulo: "Flujo total entrante por la pared lateral",
        expresion_latex:
          "P_{\\text{ent}} = \\iint_{\\rho=a} \\vec{N}\\cdot(-\\hat{\\boldsymbol{\\rho}})\\,dS = \\frac{\\Delta V\\,I}{2\\pi a d}(2\\pi a d) = \\verde{\\Delta V\\,I = \\frac{dU_e}{dt}}",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-ej-5-9-poynting",
  },
  {
    id: "eval-05-ruptura-dielectrica",
    numero: 5,
    tipo: "numerica",
    dificultad: "basica",
    categoria: "paradoja_desplazamiento",
    etiqueta_tema: "Dieléctricos y ruptura E_r",
    referencia_fiuba: "Cap. 2 · Tablas ε_r y E_r",
    enunciado:
      "Un capacitor plano tiene separación d = 2.0 mm. Según la tabla de rigidez dieléctrica FIUBA (aire: E_r = 3 MV/m; mica: E_r = 200 MV/m), ¿qué tensión máxima soporta con aire y con mica antes de la ruptura?",
    enunciado_latex: "d = 2.0\\,\\text{mm},\\quad E_{r,\\text{aire}} = 3\\,\\text{MV/m},\\quad E_{r,\\text{mica}} = 200\\,\\text{MV/m}",
    opciones: [
      { id: "a", texto: "6.0 kV con aire y 400 kV con mica." },
      { id: "b", texto: "1.5 kV con aire y 100 kV con mica." },
      { id: "c", texto: "60 kV con aire y 4000 kV con mica." },
      { id: "d", texto: "3.0 kV con aire y 200 kV con mica." },
    ],
    id_opcion_correcta: "a",
    pista:
      "Para campo uniforme entre placas paralelas, la tensión máxima de ruptura es V_máx = E_r · d.",
    explicacion_resumen:
      "Al multiplicar E_r por d = 2×10⁻³ m resultan 6.0 kV para aire seco y 400 kV para mica, además de aumentar la capacitancia por ε_r = 5.4.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Tensión límite en aire seco",
        expresion_latex:
          "V_{\\text{máx,aire}} = E_{r,\\text{aire}}\\,d = (3\\times 10^6\\,\\text{V/m})(2\\times 10^{-3}\\,\\text{m}) = \\destacar{6.0\\,\\text{kV}}",
      },
      {
        numero: 2,
        titulo: "Tensión límite en mica",
        expresion_latex:
          "V_{\\text{máx,mica}} = E_{r,\\text{mica}}\\,d = (200\\times 10^6\\,\\text{V/m})(2\\times 10^{-3}\\,\\text{m}) = \\destacar{400\\,\\text{kV}}",
        nota_conceptual: "La mica multiplica la rigidez dieléctrica por ~66.7× respecto del aire",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-ej-5-9-paradoja",
  },
  {
    id: "eval-06-numerico-agua-mar",
    numero: 6,
    tipo: "numerica",
    dificultad: "intermedia",
    categoria: "regimen_perdidas",
    etiqueta_tema: "Régimen σ vs ωε",
    referencia_fiuba: "Cap. 3 · Ej. 3-7 y Cap. 5 · Prob. 5.8",
    enunciado:
      "Para el agua de mar (σ = 4.0 S/m, ε_r = 80), ¿a qué frecuencia aproximada se igualan las amplitudes de las corrientes de conducción y desplazamiento (|J_c| = |J_d|), y cuál es su desfasaje temporal?",
    enunciado_latex: "\\sigma = 4.0\\,\\text{S/m},\\quad \\varepsilon_r = 80,\\quad \\varepsilon_0 \\approx 8.854\\times 10^{-12}\\,\\text{F/m}",
    opciones: [
      { id: "a", texto: "f_c ≈ 899 MHz, con J_d adelantada 90° respecto de J_c." },
      { id: "b", texto: "f_c ≈ 899 MHz, en fase (0°) entre sí." },
      { id: "c", texto: "f_c ≈ 5.65 GHz, con J_d atrasada 90° respecto de J_c." },
      { id: "d", texto: "f_c ≈ 11.2 MHz, con 45° entre J_c y J_d." },
    ],
    id_opcion_correcta: "a",
    pista:
      "Igualá |J_c| = σ E₀ con |J_d| = 2π f ε₀ ε_r E₀ para despejar f_c; recordá además que en σ_eq = σ + iωε el factor i equivale a +90°.",
    explicacion_resumen:
      "La frecuencia de transición resulta f_c = σ/(2πε) ≈ 899 MHz. Como J_d = iωε E en fasores exp(+iωt), J_d siempre adelanta exactamente 90° a J_c = σ E.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Permitividad absoluta del agua de mar",
        expresion_latex:
          "\\varepsilon = \\varepsilon_0\\varepsilon_r = (8.854\\times 10^{-12})(80) = \\azul{7.083\\times 10^{-10}\\,\\text{F/m}}",
      },
      {
        numero: 2,
        titulo: "Frecuencia de cruce f_c y cuadratura fasorial",
        expresion_latex:
          "f_c = \\frac{\\sigma}{2\\pi\\varepsilon} = \\frac{4.0}{2\\pi(7.083\\times 10^{-10})} \\approx \\destacar{899\\,\\text{MHz}},\\qquad \\angle(i\\omega\\varepsilon) - \\angle(\\sigma) = \\verde{+90^\\circ}",
        nota_conceptual: "Por debajo de f_c el agua de mar es buen conductor; por encima actúa como dieléctrico",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-prob-5-8-perdidas",
  },
  {
    id: "eval-07-coaxial",
    numero: 7,
    tipo: "conceptual",
    dificultad: "basica",
    categoria: "magnetostatica_ampere",
    etiqueta_tema: "Apantallamiento coaxial",
    referencia_fiuba: "Cap. 3 · Ej. 3-20",
    enunciado:
      "Un cable coaxial largo lleva corriente +I por el conductor interno (ρ ≤ a) y corriente de retorno equilibrada -I por la malla externa (b ≤ ρ ≤ c). ¿Qué valor adopta H_φ en el exterior (ρ > c)?",
    opciones: [
      { id: "a", texto: "H_φ = I / (2πρ), como un hilo rectilíneo." },
      { id: "b", texto: "H_φ = 2I / (2πρ), sumando ambas corrientes." },
      { id: "c", texto: "H_φ = 0 exactamente, por apantallamiento magnético." },
      { id: "d", texto: "H_φ = I / (2πc), constante en todo el exterior." },
    ],
    id_opcion_correcta: "c",
    pista:
      "Calculá la corriente neta I_enc que atraviesa un disco amperiano circular de radio ρ > c.",
    explicacion_resumen:
      "Un lazo concéntrico con ρ > c encierra tanto +I como -I, de modo que I_enc = 0 y por simetría cilíndrica H_φ = B_φ = 0 en todo el exterior.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Ley de Ampère para ρ > c",
        expresion_latex:
          "\\oint_C \\vec{H}\\cdot d\\vec{l} = H_\\varphi(2\\pi\\rho) = I_{\\text{enc}} = (+I) + (-I) = \\rojo{0}",
        nota_conceptual: "Simetría axial + corrientes de ida y retorno equilibradas (Ej. 3-20)",
      },
      {
        numero: 2,
        titulo: "Anulación del campo externo",
        expresion_latex: "\\destacar{H_\\varphi(\\rho) = 0,\\quad B_\\varphi(\\rho) = 0 \\quad (\\forall\\,\\rho > c)}",
      },
    ],
    escenario_vinculado: "geometrias_ampere",
    preset_relacionado_id: "fiuba-ej-3-20-coaxial",
  },
  {
    id: "eval-08-velocidad-luz-vidrio",
    numero: 8,
    tipo: "conceptual",
    dificultad: "intermedia",
    categoria: "ondas_em",
    etiqueta_tema: "Velocidad c y propagación",
    referencia_fiuba: "Cap. 5 · Ondas EM",
    enunciado:
      "Una onda electromagnética plana de frecuencia fija f pasa del vacío a un bloque de vidrio no magnético sin pérdidas (ε_r = 4, μ_r = 1). ¿Cómo cambian su velocidad de fase v_p y su longitud de onda λ?",
    opciones: [
      { id: "a", texto: "v_p se reduce a c/2 y λ se reduce a λ₀/2." },
      { id: "b", texto: "v_p se reduce a c/4 y λ se reduce a λ₀/4." },
      { id: "c", texto: "v_p permanece igual a c y solo cambia la impedancia η." },
      { id: "d", texto: "v_p aumenta a 2c y λ aumenta a 2λ₀." },
    ],
    id_opcion_correcta: "a",
    pista:
      "Recordá que v_p = 1/√(μ₀μ_r ε₀ε_r) = c / √(μ_r ε_r) y que λ = v_p / f.",
    explicacion_resumen:
      "El índice de refracción es n = √(μ_r ε_r) = √4 = 2, por lo cual tanto la velocidad de fase como la longitud de onda se dividen por 2.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Velocidad de fase e índice de refracción",
        expresion_latex:
          "v_p = \\frac{1}{\\sqrt{\\mu_0\\varepsilon_0\\varepsilon_r}} = \\frac{\\naranja{c}}{\\sqrt{4}} = \\destacar{\\frac{c}{2}}",
        nota_conceptual: "Acoplamiento Faraday + Ampère-Maxwell en medio dieléctrico lineal",
      },
      {
        numero: 2,
        titulo: "Longitud de onda a frecuencia constante",
        expresion_latex:
          "\\lambda = \\frac{v_p}{f} = \\frac{c}{2f} = \\destacar{\\frac{\\lambda_0}{2}}",
      },
    ],
    escenario_vinculado: "onda_electromagnetica",
    preset_relacionado_id: "fiuba-cap-5-onda-em",
  },
  {
    id: "eval-09-criterio-cuasiestatico",
    numero: 9,
    tipo: "conceptual",
    dificultad: "intermedia",
    categoria: "alta_frecuencia_bessel",
    etiqueta_tema: "Criterio cuasi-estático",
    referencia_fiuba: "Cap. 1 y Cap. 5 · Ej. 5-10",
    enunciado:
      "De acuerdo con la clasificación de entornos de modelado de Cap. 1 (FIUBA), ¿cuál es la condición que garantiza la validez de la aproximación cuasi-estática para un dispositivo de dimensión máxima D?",
    opciones: [
      { id: "a", texto: "λ_mín ≥ 10 D (dimensiones muy menores que la longitud de onda)." },
      { id: "b", texto: "λ_mín ≤ D / 10 (dimensiones mucho mayores que la longitud de onda)." },
      { id: "c", texto: "Que la corriente de desplazamiento sea nula en todo el volumen." },
      { id: "d", texto: "Que el medio tenga permitividad relativa ε_r = 1." },
    ],
    id_opcion_correcta: "a",
    pista:
      "Si el tamaño D del dispositivo es al menos diez veces menor que λ, el tiempo de propagación es despreciable frente al período T = 1/f.",
    explicacion_resumen:
      "Con λ_mín ≥ 10 D (equivalente a ka ≤ π/10 ≈ 0.314 para D = 2a), J₀(ka) ≈ 1 - (ka)²/4 difiere de 1 en menos de 2.5%, validando el campo uniforme.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Criterio geométrico de Cap. 1",
        expresion_latex:
          "\\destacar{\\lambda_{\\min} \\ge 10\\,D} \\;\\Longleftrightarrow\\; k a = \\frac{2\\pi a}{\\lambda} \\le \\frac{\\pi}{10} \\approx 0.314",
        nota_conceptual: "Límite superior de validez de parámetros concentrados",
      },
      {
        numero: 2,
        titulo: "Desviación de Bessel en el límite",
        expresion_latex:
          "J_0(ka) \\approx 1 - \\frac{(ka)^2}{4} \\approx 0.975 \\quad (\\text{error } \\approx 2.5\\%)",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-ej-5-10-bessel",
  },
  {
    id: "eval-10-numerico-bessel-cero",
    numero: 10,
    tipo: "numerica",
    dificultad: "avanzada",
    categoria: "alta_frecuencia_bessel",
    etiqueta_tema: "Modos de Bessel J₀/J₁",
    referencia_fiuba: "Cap. 5 · Ej. 5-10 (pp. 5-22–5-23)",
    enunciado:
      "En un capacitor circular de radio a = 5.0 cm con aire (v ≈ c), el campo eléctrico exacto en alta frecuencia obedece E_z(ρ,t) = (V₀/d) J₀(kρ) cos(ωt). ¿A qué frecuencia aproximada se anula por primera vez E_z en el borde ρ = a (primer cero x₀₁ ≈ 2.4048)?",
    enunciado_latex: "J_0(k a) = 0 \\;\\Longrightarrow\\; k a = \\frac{2\\pi f a}{c} \\approx 2.4048",
    opciones: [
      { id: "a", texto: "f ≈ 2.30 GHz." },
      { id: "b", texto: "f ≈ 230 MHz." },
      { id: "c", texto: "f ≈ 955 MHz." },
      { id: "d", texto: "f ≈ 4.59 GHz." },
    ],
    id_opcion_correcta: "a",
    pista:
      "Despejá f = (x₀₁ · c) / (2π a) con a = 0.05 m y c ≈ 3.00 × 10⁸ m/s.",
    explicacion_resumen:
      "A f ≈ 2.30 GHz (ka ≈ 2.405) aparece el primer anillo nodal exactamente en el borde del capacitor; superada esa frecuencia, el campo eléctrico invierte su sentido cerca del perímetro.",
    demostracion_pasos: [
      {
        numero: 1,
        titulo: "Condición del primer cero de J₀",
        expresion_latex:
          "k a = \\frac{2\\pi f a}{c} = x_{01} \\approx \\morado{2.4048}",
        nota_conceptual: "Acoplamiento completo Faraday + Ampère-Maxwell en simetría cilíndrica (Ej. 5-10)",
      },
      {
        numero: 2,
        titulo: "Despeje numérico de la frecuencia",
        expresion_latex:
          "f = \\frac{2.4048\\cdot (2.998\\times 10^8\\,\\text{m/s})}{2\\pi\\,(0.05\\,\\text{m})} \\approx \\destacar{2.30\\,\\text{GHz}}",
        verificacion_dimensional:
          "\\frac{[\\text{m}/\\text{s}]}{[\\text{m}]} = \\text{s}^{-1} = \\text{Hz}",
      },
    ],
    escenario_vinculado: "capacitor_paradoja",
    preset_relacionado_id: "fiuba-ej-5-10-bessel",
  },
] as const;

export const MISIONES_INTERACTIVAS: readonly MisionInteractiva[] = [
  {
    id: "mision-paradoja-s1-s2",
    titulo: "Provocar y resolver la paradoja S₁ vs S₂",
    descripcion:
      "Visualizá ambas superficies en el capacitor AC, desactivá ∂D/∂t para comprobar S₁ ≠ S₂ y volvé a activarlo para restaurar la consistencia.",
    referencia_fiuba: "Cap. 5 · Ej. 5-9",
    escenario: "capacitor_paradoja",
    criterio_texto: "Alternar Maxwell OFF → ON con ambas superficies activas",
    preset_relacionado_id: "fiuba-ej-5-9-paradoja",
    paso_sugerido: "Abrí el preset Ej. 5-9 y accioná el interruptor «Incluir término de Maxwell».",
  },
  {
    id: "mision-cero-bessel-j0",
    titulo: "Alcanzar el primer anillo nodal de Bessel J₀(ka) = 0",
    descripcion:
      "En modo Alta Frecuencia (Bessel), elevá la frecuencia hasta que el argumento ka alcance ~2.405 y observá la inversión de E_z en el borde.",
    referencia_fiuba: "Cap. 5 · Ej. 5-10",
    escenario: "capacitor_paradoja",
    criterio_texto: "Modo Bessel activo con |ka - 2.405| ≤ 0.15",
    preset_relacionado_id: "fiuba-ej-5-10-bessel",
    paso_sugerido: "Seleccioná modo Bessel y ajustá la frecuencia cerca de 2.30 GHz (a = 5 cm).",
  },
  {
    id: "mision-equilibrio-perdidas",
    titulo: "Equilibrar conducción y desplazamiento en f = f_c",
    descripcion:
      "En un capacitor con dieléctrico con pérdidas (σ > 0), sintonizá la frecuencia hasta lograr |J_c| ≈ |J_d| (desfasaje total de 45°).",
    referencia_fiuba: "Cap. 5 · Prob. 5.8",
    escenario: "capacitor_paradoja",
    criterio_texto: "σ > 0 y 0.85 ≤ σ/(ωε) ≤ 1.15",
    preset_relacionado_id: "fiuba-prob-5-8-perdidas",
    paso_sugerido: "Cargá el preset Prob. 5.8 y verificá las curvas J_c y J_d en el osciloscopio.",
  },
  {
    id: "mision-apantallamiento-coaxial",
    titulo: "Verificar el apantallamiento del cable coaxial",
    descripcion:
      "En Geometrías Clásicas (Cable coaxial), desplazá el lazo amperiano al exterior (ρ > c) con retorno equilibrado (α = 1) y comprobá H = 0.",
    referencia_fiuba: "Cap. 3 · Ej. 3-20",
    escenario: "geometrias_ampere",
    criterio_texto: "Cable coaxial con ρ > c, α = 1 y |H| = 0",
    preset_relacionado_id: "fiuba-ej-3-20-coaxial",
    paso_sugerido: "Cambiá a Geometrías de Ampère → Cable coaxial y llevá ρ más allá del radio exterior c.",
  },
  {
    id: "mision-ruptura-dielectrica",
    titulo: "Observar la ruptura dieléctrica en aire (E > 3 MV/m)",
    descripcion:
      "Incrementá la tensión o reducí la separación d en aire seco hasta disparar la alerta de ruptura dieléctrica (|E| > E_r) y luego reemplazá por mica.",
    referencia_fiuba: "Cap. 2 · Tabla E_r",
    escenario: "capacitor_paradoja",
    criterio_texto: "Activar alerta de ruptura dieléctrica (E/E_r > 1)",
    preset_relacionado_id: "fiuba-ej-5-9-paradoja",
    paso_sugerido: "Con aire seco, reducí d o subí V₀ hasta superar 3 MV/m.",
  },
] as const;
