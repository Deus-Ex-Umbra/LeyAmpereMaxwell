export const VELOCIDAD_LUZ = 299_792_458;

export const PERMEABILIDAD_VACIO = 4 * Math.PI * 1e-7;

// Derivada exactamente de c y μ₀ para garantizar 1 / √(μ₀ ε₀) === c en IEEE-754.
export const PERMITIVIDAD_VACIO =
  1 / (PERMEABILIDAD_VACIO * VELOCIDAD_LUZ * VELOCIDAD_LUZ);

export const IMPEDANCIA_VACIO = PERMEABILIDAD_VACIO * VELOCIDAD_LUZ;

export const DOS_PI = 2 * Math.PI;

export const UMBRAL_CUASIESTATICO_FIUBA = 10;

export const CEROS_BESSEL_J0 = [
  2.4048255576957728,
  5.5200781102863106,
  8.6537279129110122,
] as const;

export const CEROS_BESSEL_J1 = [
  3.8317059702075123,
  7.0155866698156188,
  10.173468135062722,
] as const;

export const COLORES_VECTORES = {
  e: "#38bdf8",
  d: "#60a5fa",
  b: "#f43f5e",
  h: "#fb7185",
  jc: "#fbbf24",
  jd: "#a855f7",
  n: "#10b981",
  lazo: "#facc15",
  s1: "#f59e0b",
  s2: "#a855f7",
} as const;

export const COLORES_DEUS = {
  azul_activo: "#38bdf8",
  rojo_anulado: "#f87171",
  verde_inducido: "#34d399",
  morado_frontera: "#c084fc",
  naranja_constante: "#fb923c",
  ambar_destacar: "#fbbf24",
} as const;
