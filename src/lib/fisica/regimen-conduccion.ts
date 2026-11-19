import type {
  ParametrosRegimenConduccion,
  PuntoBarridoBode,
  RegimenConduccion,
  ResultadoRegimenConduccion,
} from "../../tipos/fisica";
import {
  errorRelativoCuasiestaticoB,
  errorRelativoCuasiestaticoE,
  evaluarBesselJ1,
} from "./bessel";
import {
  DOS_PI,
  PERMEABILIDAD_VACIO,
  PERMITIVIDAD_VACIO,
  UMBRAL_CUASIESTATICO_FIUBA,
} from "./constantes";

export function clasificarRegimenConduccion(
  _tangente_perdidas: number,
): RegimenConduccion {
  if (_tangente_perdidas > 10) {
    return "buen_conductor";
  }
  if (_tangente_perdidas < 0.1) {
    return "buen_dielectrico";
  }
  return "transicion";
}

export function calcularRegimenConduccion(
  _parametros: ParametrosRegimenConduccion,
): ResultadoRegimenConduccion {
  const e0 = _parametros.amplitud_e0;
  const f = Math.max(_parametros.frecuencia, 1e-6);
  const sigma = Math.max(_parametros.conductividad_s_m, 0);
  const eps_r = Math.max(_parametros.permitividad_relativa, 1);
  const mu_r = Math.max(_parametros.permeabilidad_relativa, 1);
  const rho = Math.max(_parametros.radio_evaluacion, 0);
  const dimension = Math.max(_parametros.dimension_caracteristica, 1e-6);
  const fase = _parametros.fase_omega_t;

  const omega = DOS_PI * f;
  const epsilon = PERMITIVIDAD_VACIO * eps_r;
  const mu = PERMEABILIDAD_VACIO * mu_r;
  const omega_epsilon = omega * epsilon;

  const sigma_eq_mod = Math.hypot(sigma, omega_epsilon);
  const sigma_eq_fase = Math.atan2(omega_epsilon, sigma);

  const eps_eq_im = -sigma / omega;
  const eps_eq_mod = Math.hypot(epsilon, eps_eq_im);
  const eps_eq_fase = Math.atan2(eps_eq_im, epsilon);

  const tiempo_relajacion =
    sigma > 0 ? epsilon / sigma : Number.POSITIVE_INFINITY;
  const frecuencia_cruce = sigma > 0 ? sigma / (DOS_PI * epsilon) : 0;
  const tangente_perdidas = sigma / omega_epsilon;
  const angulo_fase_jd_rad = Math.atan2(omega_epsilon, sigma);
  const angulo_fase_jd_grados = (angulo_fase_jd_rad * 180) / Math.PI;
  const regimen = clasificarRegimenConduccion(tangente_perdidas);

  // Para E(t) = E₀ sin(ωt): J_c = σ E₀ sin(ωt), J_d = ωε E₀ cos(ωt) (+90° en cuadratura).
  const campo_e_instantaneo = e0 * Math.sin(fase);
  const jc_real = sigma * e0;
  const jd_imaginario = omega_epsilon * e0;
  const j_total_modulo = Math.hypot(jc_real, jd_imaginario);
  const jc_instantaneo = jc_real * Math.sin(fase);
  const jd_instantaneo = jd_imaginario * Math.cos(fase);

  const velocidad_fase = 1 / Math.sqrt(mu * epsilon);
  const numero_onda_k = omega / velocidad_fase;
  const longitud_onda = velocidad_fase / f;
  const argumento_bessel_krho = numero_onda_k * rho;
  const razon_longitud_onda_dimension = longitud_onda / dimension;
  const es_cuasiestatico_valido =
    razon_longitud_onda_dimension >= UMBRAL_CUASIESTATICO_FIUBA;

  const campo_b_cuasiestatico_pico =
    0.5 * mu * epsilon * omega * Math.abs(e0) * rho;
  const campo_b_bessel_pico =
    (Math.abs(e0) / velocidad_fase) *
    Math.abs(evaluarBesselJ1(argumento_bessel_krho));

  return {
    frecuencia_angular: omega,
    permitividad: epsilon,
    permeabilidad: mu,
    conductividad_equivalente: {
      real: sigma,
      imaginario: omega_epsilon,
      modulo: sigma_eq_mod,
      fase_rad: sigma_eq_fase,
    },
    permitividad_equivalente: {
      real: epsilon,
      imaginario: eps_eq_im,
      modulo: eps_eq_mod,
      fase_rad: eps_eq_fase,
    },
    tiempo_relajacion,
    frecuencia_cruce,
    tangente_perdidas,
    razon_jc_sobre_jd: tangente_perdidas,
    angulo_fase_jd_rad,
    angulo_fase_jd_grados,
    regimen,
    fasor: {
      jc_real,
      jd_imaginario,
      j_total_modulo,
      j_total_angulo_rad: angulo_fase_jd_rad,
      jc_instantaneo,
      jd_instantaneo,
      j_total_instantaneo: jc_instantaneo + jd_instantaneo,
      campo_e_instantaneo,
    },
    numero_onda_k,
    longitud_onda,
    argumento_bessel_krho,
    razon_longitud_onda_dimension,
    es_cuasiestatico_valido,
    campo_b_cuasiestatico_pico,
    campo_b_bessel_pico,
    error_relativo_cuasiestatico_e:
      errorRelativoCuasiestaticoE(argumento_bessel_krho),
    error_relativo_cuasiestatico_b:
      errorRelativoCuasiestaticoB(argumento_bessel_krho),
  };
}

export function generarCurvaFrecuenciaRegimen(
  _conductividad_s_m: number,
  _permitividad_relativa: number,
  _log10_f_min: number = 0,
  _log10_f_max: number = 14,
  _num_puntos: number = 100,
): PuntoBarridoBode[] {
  const sigma = Math.max(_conductividad_s_m, 0);
  const epsilon = PERMITIVIDAD_VACIO * Math.max(_permitividad_relativa, 1);
  const total = Math.max(16, Math.floor(_num_puntos));
  const puntos: PuntoBarridoBode[] = [];

  for (let i = 0; i <= total; i += 1) {
    const log10_f =
      _log10_f_min + (i / total) * (_log10_f_max - _log10_f_min);
    const frecuencia = Math.pow(10, log10_f);
    const omega_epsilon = DOS_PI * frecuencia * epsilon;
    const tangente = sigma / omega_epsilon;

    puntos.push({
      frecuencia,
      log10_frecuencia: log10_f,
      modulo_sigma: sigma,
      modulo_omega_epsilon: omega_epsilon,
      tangente_perdidas: tangente,
      regimen: clasificarRegimenConduccion(tangente),
    });
  }

  return puntos;
}
