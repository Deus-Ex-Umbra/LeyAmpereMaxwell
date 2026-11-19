import type {
  MuestraEspacialOnda,
  ParametrosOndaEM,
  RegimenModelado,
  ResultadoOndaEM,
} from "../../tipos/fisica";
import {
  DOS_PI,
  PERMEABILIDAD_VACIO,
  PERMITIVIDAD_VACIO,
  UMBRAL_CUASIESTATICO_FIUBA,
  VELOCIDAD_LUZ,
} from "./constantes";

function clasificarRegimenModelado(
  _longitud_onda: number,
  _dimension: number,
): RegimenModelado {
  const razon = _longitud_onda / _dimension;
  if (razon >= UMBRAL_CUASIESTATICO_FIUBA) {
    return "cuasiestatico";
  }
  if (razon >= 1) {
    return "distribuido";
  }
  return "campo_completo";
}

export function calcularOndaElectromagnetica(
  _parametros: ParametrosOndaEM,
): ResultadoOndaEM {
  const e0 = _parametros.amplitud_e0;
  const f = Math.max(_parametros.frecuencia, 1e-3);
  const eps_r = Math.max(_parametros.permitividad_relativa, 1);
  const mu_r = Math.max(_parametros.permeabilidad_relativa, 1);
  const sigma = Math.max(_parametros.conductividad_s_m, 0);
  const dimension = Math.max(_parametros.dimension_caracteristica, 1e-6);

  const omega = DOS_PI * f;
  const epsilon = PERMITIVIDAD_VACIO * eps_r;
  const mu = PERMEABILIDAD_VACIO * mu_r;
  const tangente_perdidas = sigma / (omega * epsilon);
  const raiz_perdidas = Math.hypot(1, tangente_perdidas);

  // Convención e^{+iωt - γx} con γ² = iωμ(σ + iωε) = -ω²με + iωμσ.
  const constante_atenuacion_alfa =
    omega * Math.sqrt(0.5 * mu * epsilon * Math.max(0, raiz_perdidas - 1));
  const constante_fase_beta =
    omega * Math.sqrt(0.5 * mu * epsilon * (raiz_perdidas + 1));

  const impedancia_sin_perdidas = Math.sqrt(mu / epsilon);
  const modulo_eta =
    impedancia_sin_perdidas / Math.sqrt(raiz_perdidas);
  const desfasaje_h_atraso_rad = 0.5 * Math.atan(tangente_perdidas);
  const desfasaje_h_atraso_grados =
    (desfasaje_h_atraso_rad * 180) / Math.PI;

  const velocidad_fase = omega / constante_fase_beta;
  const indice_refraccion = VELOCIDAD_LUZ / velocidad_fase;
  const longitud_onda = DOS_PI / constante_fase_beta;
  const profundidad_pelicular =
    constante_atenuacion_alfa > 1e-18
      ? 1 / constante_atenuacion_alfa
      : Number.POSITIVE_INFINITY;

  const propagacion_activa = _parametros.incluir_maxwell;
  const poynting_promedio_origen = propagacion_activa
    ? ((e0 * e0) / (2 * modulo_eta)) * Math.cos(desfasaje_h_atraso_rad)
    : 0;

  const razon_longitud_onda_dimension = longitud_onda / dimension;
  const regimen_modelado = clasificarRegimenModelado(longitud_onda, dimension);

  const evaluarEnPosicion = (
    _posicion_x: number,
    _fase_omega_t: number,
  ): MuestraEspacialOnda => {
    const x = Math.max(_posicion_x, 0);
    const posicion_normalizada = x / longitud_onda;

    if (!propagacion_activa) {
      const decaimiento_local = Math.exp(-3 * posicion_normalizada);
      const ey_estatico = e0 * decaimiento_local * Math.cos(_fase_omega_t);
      return {
        posicion_x: x,
        posicion_normalizada,
        campo_e: { x: 0, y: ey_estatico, z: 0 },
        campo_h: { x: 0, y: 0, z: 0 },
        campo_b: { x: 0, y: 0, z: 0 },
        poynting_n: { x: 0, y: 0, z: 0 },
        factor_atenuacion: decaimiento_local,
      };
    }

    const factor_atenuacion = Math.exp(-constante_atenuacion_alfa * x);
    const fase_e = _fase_omega_t - constante_fase_beta * x;
    const fase_h = fase_e - desfasaje_h_atraso_rad;

    if (_parametros.polarizacion === "circular_derecha") {
      const ey = e0 * factor_atenuacion * Math.cos(fase_e);
      const ez = e0 * factor_atenuacion * Math.sin(fase_e);
      const hy = -(e0 / modulo_eta) * factor_atenuacion * Math.sin(fase_h);
      const hz = (e0 / modulo_eta) * factor_atenuacion * Math.cos(fase_h);
      const nx = ey * hz - ez * hy;

      return {
        posicion_x: x,
        posicion_normalizada,
        campo_e: { x: 0, y: ey, z: ez },
        campo_h: { x: 0, y: hy, z: hz },
        campo_b: { x: 0, y: mu * hy, z: mu * hz },
        poynting_n: { x: nx, y: 0, z: 0 },
        factor_atenuacion,
      };
    }

    const ey = e0 * factor_atenuacion * Math.cos(fase_e);
    const hz = (e0 / modulo_eta) * factor_atenuacion * Math.cos(fase_h);
    const nx = ey * hz;

    return {
      posicion_x: x,
      posicion_normalizada,
      campo_e: { x: 0, y: ey, z: 0 },
      campo_h: { x: 0, y: 0, z: hz },
      campo_b: { x: 0, y: 0, z: mu * hz },
      poynting_n: { x: nx, y: 0, z: 0 },
      factor_atenuacion,
    };
  };

  const generarMuestrasEspaciales = (
    _num_puntos: number,
    _num_longitudes_onda: number,
    _fase_omega_t: number,
  ): MuestraEspacialOnda[] => {
    const total = Math.max(16, Math.floor(_num_puntos));
    const alcance = Math.max(_num_longitudes_onda, 0.5) * longitud_onda;
    const muestras: MuestraEspacialOnda[] = [];

    for (let i = 0; i <= total; i += 1) {
      const x = (i / total) * alcance;
      muestras.push(evaluarEnPosicion(x, _fase_omega_t));
    }

    return muestras;
  };

  return {
    frecuencia_angular: omega,
    constante_atenuacion_alfa,
    constante_fase_beta,
    constante_propagacion_cuadrada_esperada: {
      real: -omega * omega * mu * epsilon,
      imaginario: omega * mu * sigma,
      modulo: omega * mu * Math.hypot(sigma, omega * epsilon),
      fase_rad: Math.atan2(omega * mu * sigma, -omega * omega * mu * epsilon),
    },
    impedancia_intrinseca: {
      real: modulo_eta * Math.cos(desfasaje_h_atraso_rad),
      imaginario: modulo_eta * Math.sin(desfasaje_h_atraso_rad),
      modulo: modulo_eta,
      fase_rad: desfasaje_h_atraso_rad,
    },
    desfasaje_h_atraso_rad,
    desfasaje_h_atraso_grados,
    velocidad_fase,
    indice_refraccion,
    longitud_onda,
    profundidad_pelicular,
    poynting_promedio_origen,
    tangente_perdidas,
    razon_longitud_onda_dimension,
    regimen_modelado,
    propagacion_activa,
    evaluarEnPosicion,
    generarMuestrasEspaciales,
  };
}
