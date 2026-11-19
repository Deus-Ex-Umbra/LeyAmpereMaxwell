import type {
  EvaluacionSuperficie,
  InstantaneaCapacitor,
  MuestraTemporalCapacitor,
  ParametrosCapacitor,
  PuntoCampoCapacitor,
  PuntoPerfilRadialCapacitor,
} from "../../tipos/fisica";
import { evaluarBesselJ0, evaluarBesselJ1 } from "./bessel";
import {
  DOS_PI,
  PERMEABILIDAD_VACIO,
  PERMITIVIDAD_VACIO,
  UMBRAL_CUASIESTATICO_FIUBA,
} from "./constantes";

const ESCALA_RESIDUO_MIN = 1e-15;
const TOLERANCIA_CONSISTENCIA = 1e-9;

function construirEvaluacionSuperficie(
  _id: "S1" | "S2" | "S_entrehierro",
  _corriente_conduccion: number,
  _corriente_desplazamiento: number,
  _circulacion_h: number,
  _mu: number,
  _incluir_maxwell: boolean,
): EvaluacionSuperficie {
  const corriente_efectiva =
    _corriente_conduccion +
    (_incluir_maxwell ? _corriente_desplazamiento : 0);
  const residuo_absoluto = Math.abs(_circulacion_h - corriente_efectiva);
  const escala = Math.max(
    Math.abs(_circulacion_h),
    Math.abs(_corriente_conduccion) + Math.abs(_corriente_desplazamiento),
    ESCALA_RESIDUO_MIN,
  );
  const residuo_relativo = residuo_absoluto / escala;

  return {
    id_superficie: _id,
    corriente_conduccion: _corriente_conduccion,
    corriente_desplazamiento: _corriente_desplazamiento,
    corriente_efectiva,
    circulacion_h: _circulacion_h,
    circulacion_b: _mu * _circulacion_h,
    residuo_absoluto,
    residuo_relativo,
    es_consistente: residuo_relativo <= TOLERANCIA_CONSISTENCIA,
  };
}

export function calcularCapacitor(
  _parametros: ParametrosCapacitor,
): InstantaneaCapacitor {
  const a = Math.max(_parametros.radio_placa, 1e-6);
  const d = Math.max(_parametros.separacion_placas, 1e-6);
  const v0 = _parametros.tension_pico;
  const f = Math.max(_parametros.frecuencia, 1e-3);
  const eps_r = Math.max(_parametros.permitividad_relativa, 1);
  const mu_r = Math.max(_parametros.permeabilidad_relativa, 1);
  const sigma = Math.max(_parametros.conductividad_s_m, 0);
  const r_serie = Math.max(_parametros.resistencia_ohm, 1e-3);
  const rho_lazo = Math.max(_parametros.radio_lazo, 1e-6);
  const campo_ruptura =
    _parametros.campo_ruptura_v_m > 0
      ? _parametros.campo_ruptura_v_m
      : Number.POSITIVE_INFINITY;

  const epsilon = PERMITIVIDAD_VACIO * eps_r;
  const mu = PERMEABILIDAD_VACIO * mu_r;
  const area_placa = Math.PI * a * a;
  const capacitancia = (epsilon * area_placa) / d;
  const conductancia =
    _parametros.modo === "ac_cuasiestatico" ? (sigma * area_placa) / d : 0;
  const constante_tiempo_rc = r_serie * capacitancia;
  const tiempo_relajacion =
    sigma > 0 ? epsilon / sigma : Number.POSITIVE_INFINITY;
  const frecuencia_cruce = sigma > 0 ? sigma / (DOS_PI * epsilon) : 0;

  const omega = DOS_PI * f;
  const velocidad_fase = 1 / Math.sqrt(mu * epsilon);
  const impedancia_medio = Math.sqrt(mu / epsilon);
  const numero_onda_k = omega / velocidad_fase;
  const argumento_bessel_borde = numero_onda_k * a;
  const longitud_onda = velocidad_fase / f;
  const razon_longitud_onda_diametro = longitud_onda / (2 * a);
  const es_cuasiestatico_valido =
    _parametros.modo === "transitorio_rc"
      ? true
      : razon_longitud_onda_diametro >= UMBRAL_CUASIESTATICO_FIUBA;

  let tension_instantanea = 0;
  let corriente_conduccion_entrehierro = 0;
  let corriente_desplazamiento_entrehierro = 0;
  let corriente_cable = 0;
  let campo_e_eje = 0;
  let densidad_jc_eje = 0;
  let densidad_jd_eje = 0;
  let flujo_electrico_total = 0;
  let energia_electrica = 0;
  let tasa_energia_electrica = 0;
  let potencia_joule = 0;
  let evaluarEnRadio: (_radio: number) => PuntoCampoCapacitor;

  if (_parametros.modo === "transitorio_rc") {
    const u = Math.max(0, _parametros.fase_o_tiempo_norm);
    const factor_exp = Math.exp(-u);

    if (_parametros.direccion_rc === "carga") {
      tension_instantanea = v0 * (1 - factor_exp);
      corriente_cable = (v0 / r_serie) * factor_exp;
    } else {
      tension_instantanea = v0 * factor_exp;
      corriente_cable = -(v0 / r_serie) * factor_exp;
    }

    corriente_conduccion_entrehierro = 0;
    corriente_desplazamiento_entrehierro = corriente_cable;
    campo_e_eje = tension_instantanea / d;
    densidad_jc_eje = 0;
    densidad_jd_eje = corriente_cable / area_placa;
    flujo_electrico_total = campo_e_eje * area_placa;
    energia_electrica =
      0.5 * capacitancia * tension_instantanea * tension_instantanea;
    tasa_energia_electrica = tension_instantanea * corriente_cable;
    potencia_joule = 0;

    evaluarEnRadio = (_radio: number): PuntoCampoCapacitor => {
      const r = Math.max(_radio, 0);
      const dentro = r <= a;
      const e_z = dentro ? campo_e_eje : 0;
      const d_z = epsilon * e_z;
      const jd_z = dentro ? densidad_jd_eje : 0;
      const h_phi =
        r === 0
          ? 0
          : dentro
            ? (corriente_cable * r) / (DOS_PI * a * a)
            : corriente_cable / (DOS_PI * r);
      const b_phi = mu * h_phi;
      const n_rho = dentro ? -e_z * h_phi : 0;

      return {
        radio: r,
        campo_e_z: e_z,
        desplazamiento_d_z: d_z,
        densidad_jc_z: 0,
        densidad_jd_z: jd_z,
        campo_h_phi: h_phi,
        campo_b_phi: b_phi,
        poynting_n_rho: n_rho,
      };
    };
  } else if (_parametros.modo === "ac_cuasiestatico") {
    const theta = _parametros.fase_o_tiempo_norm;
    const cos_t = Math.cos(theta);
    const sin_t = Math.sin(theta);

    tension_instantanea = v0 * cos_t;
    campo_e_eje = tension_instantanea / d;
    densidad_jc_eje = sigma * campo_e_eje;
    densidad_jd_eje = -omega * epsilon * (v0 / d) * sin_t;

    corriente_conduccion_entrehierro = conductancia * tension_instantanea;
    corriente_desplazamiento_entrehierro = -omega * capacitancia * v0 * sin_t;
    corriente_cable =
      corriente_conduccion_entrehierro + corriente_desplazamiento_entrehierro;
    flujo_electrico_total = campo_e_eje * area_placa;

    energia_electrica =
      0.5 * capacitancia * tension_instantanea * tension_instantanea;
    tasa_energia_electrica =
      tension_instantanea * corriente_desplazamiento_entrehierro;
    potencia_joule =
      conductancia * tension_instantanea * tension_instantanea;

    evaluarEnRadio = (_radio: number): PuntoCampoCapacitor => {
      const r = Math.max(_radio, 0);
      const dentro = r <= a;
      const e_z = dentro ? campo_e_eje : 0;
      const d_z = epsilon * e_z;
      const jc_z = dentro ? densidad_jc_eje : 0;
      const jd_z = dentro ? densidad_jd_eje : 0;
      const h_phi =
        r === 0
          ? 0
          : dentro
            ? (corriente_cable * r) / (DOS_PI * a * a)
            : corriente_cable / (DOS_PI * r);
      const b_phi = mu * h_phi;
      const n_rho = dentro ? -e_z * h_phi : 0;

      return {
        radio: r,
        campo_e_z: e_z,
        desplazamiento_d_z: d_z,
        densidad_jc_z: jc_z,
        densidad_jd_z: jd_z,
        campo_h_phi: h_phi,
        campo_b_phi: b_phi,
        poynting_n_rho: n_rho,
      };
    };
  } else {
    const theta = _parametros.fase_o_tiempo_norm;
    const cos_t = Math.cos(theta);
    const sin_t = Math.sin(theta);
    const ka = argumento_bessel_borde;
    const j0_a = evaluarBesselJ0(ka);
    const j1_a = evaluarBesselJ1(ka);

    tension_instantanea = v0 * cos_t;
    campo_e_eje = tension_instantanea / d;
    densidad_jc_eje = 0;
    densidad_jd_eje = -omega * epsilon * (v0 / d) * sin_t;

    // ∫₀ᵃ ρ J₀(kρ) dρ = (a / k) J₁(ka) -> relación exacta entre flujo eléctrico y J₁(ka).
    const factor_flujo = ka > 1e-12 ? (2 * j1_a) / ka : 1;
    flujo_electrico_total = campo_e_eje * area_placa * factor_flujo;

    corriente_conduccion_entrehierro = 0;
    corriente_desplazamiento_entrehierro =
      -DOS_PI * a * (v0 / (impedancia_medio * d)) * j1_a * sin_t;
    corriente_cable = corriente_desplazamiento_entrehierro;

    // Integral de Lommel exacta para energía eléctrica almacenada en el modo TM₀₁₀.
    const factor_lommel = j0_a * j0_a + j1_a * j1_a;
    energia_electrica =
      0.5 * capacitancia * v0 * v0 * factor_lommel * cos_t * cos_t;
    tasa_energia_electrica =
      -0.5 * capacitancia * v0 * v0 * factor_lommel * omega * Math.sin(2 * theta);
    potencia_joule = 0;

    evaluarEnRadio = (_radio: number): PuntoCampoCapacitor => {
      const r = Math.max(_radio, 0);
      const dentro = r <= a;
      if (dentro) {
        const kr = numero_onda_k * r;
        const j0_r = evaluarBesselJ0(kr);
        const j1_r = evaluarBesselJ1(kr);
        const e_z = (v0 / d) * j0_r * cos_t;
        const d_z = epsilon * e_z;
        const jd_z = -omega * epsilon * (v0 / d) * j0_r * sin_t;
        const h_phi = -(v0 / (impedancia_medio * d)) * j1_r * sin_t;
        const b_phi = mu * h_phi;
        const n_rho = -e_z * h_phi;

        return {
          radio: r,
          campo_e_z: e_z,
          desplazamiento_d_z: d_z,
          densidad_jc_z: 0,
          densidad_jd_z: jd_z,
          campo_h_phi: h_phi,
          campo_b_phi: b_phi,
          poynting_n_rho: n_rho,
        };
      }

      const h_phi = corriente_cable / (DOS_PI * r);
      return {
        radio: r,
        campo_e_z: 0,
        desplazamiento_d_z: 0,
        densidad_jc_z: 0,
        densidad_jd_z: 0,
        campo_h_phi: h_phi,
        campo_b_phi: mu * h_phi,
        poynting_n_rho: 0,
      };
    };
  }

  const punto_borde = evaluarEnRadio(a);
  const punto_lazo = evaluarEnRadio(rho_lazo);

  const desplazamiento_d_eje = epsilon * campo_e_eje;
  const polarizacion_p_eje = (eps_r - 1) * PERMITIVIDAD_VACIO * campo_e_eje;
  const flujo_desplazamiento_total = epsilon * flujo_electrico_total;
  const carga_placa = flujo_desplazamiento_total;
  const potencia_entrante_poynting =
    -punto_borde.poynting_n_rho * (DOS_PI * a * d);

  const campo_electrico_maximo = Math.abs(v0) / d;
  const razon_ruptura_dielectrica = Number.isFinite(campo_ruptura)
    ? campo_electrico_maximo / campo_ruptura
    : 0;

  const superficie_s1 = construirEvaluacionSuperficie(
    "S1",
    corriente_cable,
    0,
    corriente_cable,
    mu,
    _parametros.incluir_maxwell,
  );

  const superficie_s2 = construirEvaluacionSuperficie(
    "S2",
    corriente_conduccion_entrehierro,
    corriente_desplazamiento_entrehierro,
    corriente_cable,
    mu,
    _parametros.incluir_maxwell,
  );

  let ic_entrehierro_lazo = 0;
  let id_entrehierro_lazo = 0;
  if (_parametros.modo === "alta_frecuencia_bessel") {
    const r_ef = Math.min(rho_lazo, a);
    const theta = _parametros.fase_o_tiempo_norm;
    id_entrehierro_lazo =
      -DOS_PI *
      r_ef *
      (v0 / (impedancia_medio * d)) *
      evaluarBesselJ1(numero_onda_k * r_ef) *
      Math.sin(theta);
  } else {
    const fraccion_area = Math.min(1, (rho_lazo * rho_lazo) / (a * a));
    ic_entrehierro_lazo = corriente_conduccion_entrehierro * fraccion_area;
    id_entrehierro_lazo = corriente_desplazamiento_entrehierro * fraccion_area;
  }

  const circulacion_entrehierro = DOS_PI * rho_lazo * punto_lazo.campo_h_phi;
  const superficie_entrehierro = construirEvaluacionSuperficie(
    "S_entrehierro",
    ic_entrehierro_lazo,
    id_entrehierro_lazo,
    circulacion_entrehierro,
    mu,
    _parametros.incluir_maxwell,
  );

  const diferencia_paradoja = Math.abs(
    superficie_s1.corriente_efectiva - superficie_s2.corriente_efectiva,
  );
  const escala_corriente = Math.max(Math.abs(corriente_cable), ESCALA_RESIDUO_MIN);
  const hay_paradoja =
    !_parametros.incluir_maxwell &&
    diferencia_paradoja > TOLERANCIA_CONSISTENCIA * escala_corriente;

  return {
    capacitancia,
    conductancia,
    constante_tiempo_rc,
    tiempo_relajacion,
    frecuencia_cruce,
    numero_onda_k,
    argumento_bessel_borde,
    velocidad_fase,
    impedancia_medio,
    longitud_onda,
    razon_longitud_onda_diametro,
    es_cuasiestatico_valido,
    tension_instantanea,
    carga_placa,
    flujo_electrico_total,
    flujo_desplazamiento_total,
    corriente_cable,
    corriente_conduccion_entrehierro,
    corriente_desplazamiento_entrehierro,
    campo_e_eje,
    desplazamiento_d_eje,
    polarizacion_p_eje,
    densidad_jc_eje,
    densidad_jd_eje,
    campo_h_borde: punto_borde.campo_h_phi,
    campo_b_borde: punto_borde.campo_b_phi,
    campo_h_lazo: punto_lazo.campo_h_phi,
    campo_b_lazo: punto_lazo.campo_b_phi,
    poynting_borde: punto_borde.poynting_n_rho,
    potencia_entrante_poynting,
    potencia_joule,
    energia_electrica,
    tasa_energia_electrica,
    campo_electrico_maximo,
    razon_ruptura_dielectrica,
    hay_ruptura_dielectrica: razon_ruptura_dielectrica > 1,
    superficie_s1,
    superficie_s2,
    superficie_entrehierro,
    diferencia_paradoja,
    hay_paradoja,
    evaluarEnRadio,
  };
}

export function generarPerfilRadialCapacitor(
  _parametros: ParametrosCapacitor,
  _num_puntos: number = 96,
  _radio_max_multiplo: number = 2.5,
): PuntoPerfilRadialCapacitor[] {
  const a = Math.max(_parametros.radio_placa, 1e-6);
  const instantanea = calcularCapacitor(_parametros);
  const referencia_cuasi = calcularCapacitor({
    ..._parametros,
    modo:
      _parametros.modo === "alta_frecuencia_bessel"
        ? "ac_cuasiestatico"
        : _parametros.modo,
    conductividad_s_m:
      _parametros.modo === "alta_frecuencia_bessel"
        ? 0
        : _parametros.conductividad_s_m,
  });

  const total_puntos = Math.max(16, Math.floor(_num_puntos));
  const puntos: PuntoPerfilRadialCapacitor[] = [];

  for (let i = 0; i <= total_puntos; i += 1) {
    const r_norm = (i / total_puntos) * _radio_max_multiplo;
    const radio = r_norm * a;
    const actual = instantanea.evaluarEnRadio(radio);
    const cuasi = referencia_cuasi.evaluarEnRadio(radio);

    puntos.push({
      radio,
      radio_normalizado: r_norm,
      magnitud_b: Math.abs(actual.campo_b_phi),
      campo_b_phi: actual.campo_b_phi,
      magnitud_h: Math.abs(actual.campo_h_phi),
      campo_h_phi: actual.campo_h_phi,
      campo_e_z: actual.campo_e_z,
      magnitud_b_cuasiestatico: Math.abs(cuasi.campo_b_phi),
      campo_e_cuasiestatico: cuasi.campo_e_z,
    });
  }

  return puntos;
}

export function generarSerieTemporalCapacitor(
  _parametros: ParametrosCapacitor,
  _num_muestras: number = 120,
): MuestraTemporalCapacitor[] {
  const total = Math.max(24, Math.floor(_num_muestras));
  const muestras: MuestraTemporalCapacitor[] = [];
  const base = calcularCapacitor(_parametros);
  const periodo = 1 / Math.max(_parametros.frecuencia, 1e-3);

  for (let i = 0; i <= total; i += 1) {
    const fraccion = i / total;
    const fase_o_u =
      _parametros.modo === "transitorio_rc"
        ? fraccion * 5
        : fraccion * DOS_PI;
    const tiempo_s =
      _parametros.modo === "transitorio_rc"
        ? fase_o_u * base.constante_tiempo_rc
        : fraccion * periodo;

    const estado = calcularCapacitor({
      ..._parametros,
      fase_o_tiempo_norm: fase_o_u,
    });

    muestras.push({
      etiqueta_eje: fase_o_u,
      tiempo_s,
      tension_v: estado.tension_instantanea,
      corriente_conduccion: estado.corriente_conduccion_entrehierro,
      corriente_desplazamiento: estado.corriente_desplazamiento_entrehierro,
      corriente_total: estado.corriente_cable,
      campo_e_eje: estado.campo_e_eje,
      campo_b_lazo: estado.campo_b_lazo,
      potencia_entrante: estado.potencia_entrante_poynting,
    });
  }

  return muestras;
}
