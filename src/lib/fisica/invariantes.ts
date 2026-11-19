import type {
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ParametrosOndaEM,
  ParametrosRegimenConduccion,
  ReporteInvariantes,
  ResultadoInvariante,
} from "../../tipos/fisica";
import { evaluarBesselJ0, evaluarBesselJ1, integrarGaussLegendre16 } from "./bessel";
import { calcularCapacitor } from "./capacitor";
import { DOS_PI } from "./constantes";
import {
  determinanteMarco,
  MARCO_EJE_HORIZONTAL,
  MARCO_EJE_VERTICAL,
  MARCO_ONDA_PLANA,
  productoCruz,
  productoPunto,
  vectorUnitarioAzimutal,
  vectorUnitarioRadial,
} from "./coordenadas";
import { calcularGeometriaAmpere } from "./geometrias-ampere";
import { calcularOndaElectromagnetica } from "./onda-electromagnetica";
import { calcularRegimenConduccion } from "./regimen-conduccion";

const ESCALA_MIN = 1e-15;

export function verificarInvariantesCapacitor(
  _parametros: ParametrosCapacitor,
): ReporteInvariantes {
  const estado = calcularCapacitor(_parametros);
  const invariantes: ResultadoInvariante[] = [];

  if (_parametros.incluir_maxwell) {
    const error_circ = Math.max(
      estado.superficie_s1.residuo_relativo,
      estado.superficie_s2.residuo_relativo,
      estado.superficie_entrehierro.residuo_relativo,
    );
    invariantes.push({
      id: "ampere_maxwell_circulacion",
      nombre: "Ley de Ampère-Maxwell ∮ H·dl = I_c + I_d",
      cumple: error_circ < 1e-10,
      error_relativo: error_circ,
      tolerancia: 1e-10,
      detalle: "Verifica S₁, S₂ y lazo interior S_entrehierro simultáneamente.",
    });

    const escala_i = Math.max(Math.abs(estado.corriente_cable), ESCALA_MIN);
    const error_paradoja = estado.diferencia_paradoja / escala_i;
    invariantes.push({
      id: "independencia_superficie",
      nombre: "Independencia de superficie (S₁ ≡ S₂)",
      cumple: error_paradoja < 1e-11,
      error_relativo: error_paradoja,
      tolerancia: 1e-11,
      detalle: "Garantiza resolución exacta de la paradoja del capacitor.",
    });
  } else {
    const espera_paradoja =
      Math.abs(estado.corriente_desplazamiento_entrehierro) > 1e-14;
    const error_delta =
      Math.abs(
        estado.diferencia_paradoja -
          Math.abs(estado.corriente_desplazamiento_entrehierro),
      ) /
      Math.max(
        Math.abs(estado.corriente_desplazamiento_entrehierro),
        ESCALA_MIN,
      );
    invariantes.push({
      id: "deteccion_paradoja_sin_maxwell",
      nombre: "Detección de contradicción S₁ ≠ S₂ sin ∂D/∂t",
      cumple: !espera_paradoja || (estado.hay_paradoja && error_delta < 1e-11),
      error_relativo: error_delta,
      tolerancia: 1e-11,
      detalle: "Sin término de desplazamiento la diferencia iguala |I_d|.",
    });
  }

  if (_parametros.modo !== "alta_frecuencia_bessel") {
    const balance_rhs = estado.potencia_joule + estado.tasa_energia_electrica;
    const escala_p = Math.max(
      Math.abs(estado.potencia_entrante_poynting),
      Math.abs(estado.potencia_joule) + Math.abs(estado.tasa_energia_electrica),
      ESCALA_MIN,
    );
    const error_poynting =
      Math.abs(estado.potencia_entrante_poynting - balance_rhs) / escala_p;
    invariantes.push({
      id: "balance_poynting_cuasiestatico",
      nombre: "Teorema de Poynting (P_ent = P_Joule + dU_e/dt)",
      cumple: error_poynting < 1e-10,
      error_relativo: error_poynting,
      tolerancia: 1e-10,
      detalle: "Flujo lateral de N = E × H frente a potencia disipada y almacenada.",
    });
  } else {
    const r_test = Math.min(
      Math.max(_parametros.radio_lazo, 1e-6),
      Math.max(_parametros.radio_placa, 1e-6),
    );
    const flujo_num = integrarGaussLegendre16(
      (_r) => DOS_PI * _r * estado.evaluarEnRadio(_r).densidad_jd_z,
      0,
      r_test,
    );
    const circulacion_exacta =
      DOS_PI * r_test * estado.evaluarEnRadio(r_test).campo_h_phi;
    const escala = Math.max(
      Math.abs(circulacion_exacta),
      Math.abs(flujo_num),
      ESCALA_MIN,
    );
    const error_cuadratura =
      Math.abs(flujo_num - circulacion_exacta) / escala;

    invariantes.push({
      id: "bessel_cuadratura_ampere",
      nombre: "Bessel exacto: ∫ J_d dS (Gauss-Legendre 16) ≡ ∮ H·dl",
      cumple: error_cuadratura < 1e-10,
      error_relativo: error_cuadratura,
      tolerancia: 1e-10,
      detalle: "Integración numérica independiente frente a solución cerrada J₁(kρ).",
    });

    // Balance global de Poynting en régimen Bessel: P_ent = dU_e/dt + dU_m/dt (identidad de Lommel).
    const ka = estado.argumento_bessel_borde;
    const j0_a = evaluarBesselJ0(ka);
    const j1_a = evaluarBesselJ1(ka);
    const omega = DOS_PI * Math.max(_parametros.frecuencia, 1e-3);
    const factor_um =
      ka > 1e-12
        ? j0_a * j0_a + j1_a * j1_a - (2 * j0_a * j1_a) / ka
        : 0;
    const d_um_dt =
      0.5 *
      estado.capacitancia *
      _parametros.tension_pico *
      _parametros.tension_pico *
      factor_um *
      omega *
      Math.sin(2 * _parametros.fase_o_tiempo_norm);
    const balance_bessel = estado.tasa_energia_electrica + d_um_dt;
    const escala_p = Math.max(
      Math.abs(estado.potencia_entrante_poynting),
      Math.abs(estado.tasa_energia_electrica) + Math.abs(d_um_dt),
      ESCALA_MIN,
    );
    const error_poynting_bessel =
      Math.abs(estado.potencia_entrante_poynting - balance_bessel) / escala_p;

    invariantes.push({
      id: "balance_poynting_bessel",
      nombre: "Teorema de Poynting dinámico Bessel (P_ent = dU_e/dt + dU_m/dt)",
      cumple: error_poynting_bessel < 1e-10,
      error_relativo: error_poynting_bessel,
      tolerancia: 1e-10,
      detalle: "Incluye energía magnética U_m mediante integrales de Lommel.",
    });
  }

  return {
    todos_validos: invariantes.every((_inv) => _inv.cumple),
    invariantes,
  };
}

export function verificarInvariantesGeometria(
  _parametros: ParametrosGeometriaAmpere,
): ReporteInvariantes {
  const res = calcularGeometriaAmpere(_parametros);
  const invariantes: ResultadoInvariante[] = [
    {
      id: "ampere_magnetostatica",
      nombre: "Ley circuital de Ampère ∮ H·dl = I_enc",
      cumple: res.es_consistente,
      error_relativo: res.residuo_relativo,
      tolerancia: 1e-10,
      detalle: res.region_descripcion,
    },
  ];

  if (
    _parametros.tipo === "cable_coaxial" &&
    Math.abs(1 - _parametros.factor_retorno_coaxial) < 1e-12
  ) {
    const exterior = res.evaluarEnRadio(_parametros.radio_exterior * 1.25);
    const error_ext = Math.abs(exterior.campo_h);
    invariantes.push({
      id: "apantallamiento_coaxial",
      nombre: "Apantallamiento coaxial exterior (H = 0 para ρ > c)",
      cumple: error_ext < 1e-14,
      error_relativo: error_ext,
      tolerancia: 1e-14,
      detalle: "Con retorno equilibrado -I el campo externo se anula exactamente.",
    });
  }

  if (
    _parametros.tipo === "conductor_cilindrico" &&
    _parametros.permeabilidad_relativa_nucleo > 1
  ) {
    const a = _parametros.radio_interior;
    const h_int = res.evaluarEnRadio(a * (1 - 1e-9)).campo_h;
    const h_ext = res.evaluarEnRadio(a * (1 + 1e-9)).campo_h;
    const b_int = res.evaluarEnRadio(a * (1 - 1e-9)).campo_b;
    const b_ext = res.evaluarEnRadio(a * (1 + 1e-9)).campo_b;

    const err_cont_h =
      Math.abs(h_int - h_ext) / Math.max(Math.abs(h_ext), ESCALA_MIN);
    const razon_b = b_int / (Math.abs(b_ext) > ESCALA_MIN ? b_ext : 1);
    const err_salto_b =
      Math.abs(razon_b - _parametros.permeabilidad_relativa_nucleo) /
      _parametros.permeabilidad_relativa_nucleo;

    invariantes.push({
      id: "continuidad_h_salto_b",
      nombre: "Continuidad de H y salto μ_r de B en ρ = a",
      cumple: err_cont_h < 1e-7 && err_salto_b < 1e-7,
      error_relativo: Math.max(err_cont_h, err_salto_b),
      tolerancia: 1e-7,
      detalle: "Verifica condiciones de contorno tangenciales en medio lineal.",
    });
  }

  return {
    todos_validos: invariantes.every((_inv) => _inv.cumple),
    invariantes,
  };
}

export function verificarInvariantesRegimen(
  _parametros: ParametrosRegimenConduccion,
): ReporteInvariantes {
  const reg = calcularRegimenConduccion(_parametros);
  const omega = reg.frecuencia_angular;

  // iω ε_eq = iω (ε - iσ/ω) = σ + iωε === σ_eq.
  const re_iw_eps = -omega * reg.permitividad_equivalente.imaginario;
  const im_iw_eps = omega * reg.permitividad_equivalente.real;
  const error_complejo =
    Math.hypot(
      reg.conductividad_equivalente.real - re_iw_eps,
      reg.conductividad_equivalente.imaginario - im_iw_eps,
    ) / Math.max(reg.conductividad_equivalente.modulo, ESCALA_MIN);

  const invariantes: ResultadoInvariante[] = [
    {
      id: "equivalencia_sigma_epsilon",
      nombre: "Identidad fasorial σ_eq ≡ iω ε_eq",
      cumple: error_complejo < 1e-13,
      error_relativo: error_complejo,
      tolerancia: 1e-13,
      detalle: "Consistencia algebraica de Cap. 3 (Ej. 3-7) en convención exp(+iωt).",
    },
  ];

  return {
    todos_validos: invariantes.every((_inv) => _inv.cumple),
    invariantes,
  };
}

export function verificarInvariantesOnda(
  _parametros: ParametrosOndaEM,
): ReporteInvariantes {
  const onda = calcularOndaElectromagnetica(_parametros);
  const alfa = onda.constante_atenuacion_alfa;
  const beta = onda.constante_fase_beta;
  const gamma2_re = alfa * alfa - beta * beta;
  const gamma2_im = 2 * alfa * beta;

  const esp = onda.constante_propagacion_cuadrada_esperada;
  const error_dispersion =
    Math.hypot(gamma2_re - esp.real, gamma2_im - esp.imaginario) /
    Math.max(esp.modulo, ESCALA_MIN);

  const x_prueba = 0.37 * onda.longitud_onda;
  const muestra = onda.evaluarEnPosicion(x_prueba, 0.8);
  const producto_e_h = productoPunto(muestra.campo_e, muestra.campo_h);
  const escala_eh = Math.max(
    (Math.abs(_parametros.amplitud_e0 * _parametros.amplitud_e0) /
      onda.impedancia_intrinseca.modulo) *
      muestra.factor_atenuacion *
      muestra.factor_atenuacion,
    ESCALA_MIN,
  );
  // En polarización circular con pérdidas, H atrasa θ_η respecto de E ⇒ E·H = (E₀²/|η|)e^{-2αx} sin(θ_η).
  const esperado_producto_e_h =
    _parametros.incluir_maxwell &&
    _parametros.polarizacion === "circular_derecha"
      ? escala_eh * Math.sin(onda.desfasaje_h_atraso_rad)
      : 0;
  const error_transversal = Math.max(
    Math.abs(muestra.campo_e.x) / Math.max(Math.abs(_parametros.amplitud_e0), ESCALA_MIN),
    Math.abs(muestra.campo_h.x) / Math.max(Math.abs(_parametros.amplitud_e0) / onda.impedancia_intrinseca.modulo, ESCALA_MIN),
    Math.abs(producto_e_h - esperado_producto_e_h) / escala_eh,
  );

  const invariantes: ResultadoInvariante[] = [
    {
      id: "dispersion_gamma_cuadrada",
      nombre: "Relación de dispersión γ² = iωμ(σ + iωε)",
      cumple: error_dispersion < 1e-12,
      error_relativo: error_dispersion,
      tolerancia: 1e-12,
      detalle: "Verifica α y β frente a la ecuación de Helmholtz con pérdidas.",
    },
    {
      id: "transversalidad_tem",
      nombre: "Estructura TEM y relación de fase E·H",
      cumple: error_transversal < 1e-12,
      error_relativo: error_transversal,
      tolerancia: 1e-12,
      detalle: "Campos transversales (E_x = H_x = 0) y desfasaje θ_η exacto.",
    },
  ];

  return {
    todos_validos: invariantes.every((_inv) => _inv.cumple),
    invariantes,
  };
}

export function verificarMarcosCoordenadas(): ReporteInvariantes {
  const marcos = [
    MARCO_EJE_HORIZONTAL,
    MARCO_EJE_VERTICAL,
    MARCO_ONDA_PLANA,
  ];
  const invariantes: ResultadoInvariante[] = marcos.map((_marco) => {
    const det = determinanteMarco(_marco);
    const r_hat = vectorUnitarioRadial(_marco, 0.73);
    const phi_hat = vectorUnitarioAzimutal(_marco, 0.73);
    const cruz = productoCruz(r_hat, phi_hat);
    const err_cruz = Math.hypot(
      cruz.x - _marco.eje_z_fisico.x,
      cruz.y - _marco.eje_z_fisico.y,
      cruz.z - _marco.eje_z_fisico.z,
    );
    const error = Math.max(Math.abs(det - 1), err_cruz);

    return {
      id: `marco_${_marco.nombre}`,
      nombre: `Base ortonormal dextrógira (${_marco.nombre})`,
      cumple: error < 1e-14,
      error_relativo: error,
      tolerancia: 1e-14,
      detalle: "Garantiza det = +1 y ρ̂ × φ̂ = ẑ en Three.js.",
    };
  });

  return {
    todos_validos: invariantes.every((_inv) => _inv.cumple),
    invariantes,
  };
}
