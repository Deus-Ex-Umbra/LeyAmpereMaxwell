import type {
  ParametrosGeometriaAmpere,
  PuntoPerfilGeometria,
  ResultadoGeometriaAmpere,
} from "../../tipos/fisica";
import { DOS_PI, PERMEABILIDAD_VACIO } from "./constantes";

const ESCALA_MIN = 1e-15;
const TOLERANCIA_AMP = 1e-10;

export function calcularGeometriaAmpere(
  _parametros: ParametrosGeometriaAmpere,
): ResultadoGeometriaAmpere {
  const corriente = _parametros.corriente;
  const a = Math.max(_parametros.radio_interior, 1e-6);
  const b = Math.max(_parametros.radio_medio, a + 1e-6);
  const c = Math.max(_parametros.radio_exterior, b + 1e-6);
  const alfa = Math.min(1, Math.max(0, _parametros.factor_retorno_coaxial));
  const mu_r = Math.max(_parametros.permeabilidad_relativa_nucleo, 1);
  const mu_nucleo = PERMEABILIDAD_VACIO * mu_r;
  const rho = Math.max(_parametros.radio_lazo, 1e-6);

  if (_parametros.tipo === "conductor_cilindrico") {
    const evaluarEnRadio = (_r: number) => {
      const r = Math.max(_r, 0);
      if (r <= a) {
        const i_enc = corriente * ((r * r) / (a * a));
        const h = r === 0 ? 0 : (corriente * r) / (DOS_PI * a * a);
        return {
          campo_h: h,
          campo_b: mu_nucleo * h,
          corriente_encerrada: i_enc,
        };
      }
      const h = corriente / (DOS_PI * r);
      return {
        campo_h: h,
        campo_b: PERMEABILIDAD_VACIO * h,
        corriente_encerrada: corriente,
      };
    };

    const actual = evaluarEnRadio(rho);
    const circulacion_h = DOS_PI * rho * actual.campo_h;
    const residuo =
      Math.abs(circulacion_h - actual.corriente_encerrada) /
      Math.max(Math.abs(corriente), ESCALA_MIN);

    return {
      tipo: "conductor_cilindrico",
      region_descripcion:
        rho <= a
          ? "Interior del conductor (ρ ≤ a): campo lineal"
          : "Exterior del conductor (ρ > a): decaimiento 1/ρ",
      corriente_encerrada: actual.corriente_encerrada,
      campo_h: actual.campo_h,
      campo_b: actual.campo_b,
      campo_b_solenoide_ideal: 0,
      circulacion_h,
      circulacion_b: DOS_PI * rho * actual.campo_b,
      residuo_relativo: residuo,
      es_consistente: residuo <= TOLERANCIA_AMP,
      esta_apantallado: false,
      evaluarEnRadio,
    };
  }

  if (_parametros.tipo === "cable_coaxial") {
    const area_malla = c * c - b * b;

    const evaluarEnRadio = (_r: number) => {
      const r = Math.max(_r, 0);
      if (r <= a) {
        const i_enc = corriente * ((r * r) / (a * a));
        const h = r === 0 ? 0 : (corriente * r) / (DOS_PI * a * a);
        return {
          campo_h: h,
          campo_b: mu_nucleo * h,
          corriente_encerrada: i_enc,
        };
      }
      if (r < b) {
        const h = corriente / (DOS_PI * r);
        return {
          campo_h: h,
          campo_b: PERMEABILIDAD_VACIO * h,
          corriente_encerrada: corriente,
        };
      }
      if (r <= c) {
        const fraccion_retorno = (r * r - b * b) / area_malla;
        const i_enc = corriente * (1 - alfa * fraccion_retorno);
        const h = i_enc / (DOS_PI * r);
        return {
          campo_h: h,
          campo_b: PERMEABILIDAD_VACIO * h,
          corriente_encerrada: i_enc,
        };
      }
      const i_enc = corriente * (1 - alfa);
      const h = i_enc / (DOS_PI * r);
      return {
        campo_h: h,
        campo_b: PERMEABILIDAD_VACIO * h,
        corriente_encerrada: i_enc,
      };
    };

    const actual = evaluarEnRadio(rho);
    const circulacion_h = DOS_PI * rho * actual.campo_h;
    const residuo =
      Math.abs(circulacion_h - actual.corriente_encerrada) /
      Math.max(Math.abs(corriente), ESCALA_MIN);

    let region_descripcion = "Exterior apantallado (ρ > c)";
    if (rho <= a) {
      region_descripcion = "Núcleo conductor interno (0 ≤ ρ ≤ a)";
    } else if (rho < b) {
      region_descripcion = "Dieléctrico entre conductores (a < ρ < b)";
    } else if (rho <= c) {
      region_descripcion = "Malla conductora de retorno (b ≤ ρ ≤ c)";
    }

    return {
      tipo: "cable_coaxial",
      region_descripcion,
      corriente_encerrada: actual.corriente_encerrada,
      campo_h: actual.campo_h,
      campo_b: actual.campo_b,
      campo_b_solenoide_ideal: 0,
      circulacion_h,
      circulacion_b: DOS_PI * rho * actual.campo_b,
      residuo_relativo: residuo,
      es_consistente: residuo <= TOLERANCIA_AMP,
      esta_apantallado: rho > c && Math.abs(1 - alfa) < 1e-12,
      evaluarEnRadio,
    };
  }

  if (_parametros.tipo === "solenoide_largo") {
    const n_esp = Math.max(_parametros.espiras_por_metro, 1);
    const radio_sol = a;
    const longitud_sol = Math.max(_parametros.longitud_solenoide, 1e-3);
    const largo_lazo = Math.max(_parametros.largo_lazo_rectangular, 1e-4);
    const rho_1 = Math.max(_parametros.radio_lazo, 0);
    const rho_2 = Math.max(_parametros.radio_lazo_secundario, 0);

    const factor_finito = _parametros.usar_solenoide_finito
      ? longitud_sol / Math.hypot(longitud_sol, 2 * radio_sol)
      : 1;
    const h_ideal = n_esp * corriente;
    const h_interior = h_ideal * factor_finito;

    const evaluarEnRadio = (_r: number) => {
      const dentro = _r < radio_sol;
      const h = dentro ? h_interior : 0;
      return {
        campo_h: h,
        campo_b: dentro ? mu_nucleo * h : 0,
        corriente_encerrada: dentro ? n_esp * largo_lazo * corriente : 0,
      };
    };

    const lado_1_dentro = rho_1 < radio_sol;
    const lado_2_dentro = rho_2 < radio_sol;
    const cruza_bobinado = lado_1_dentro !== lado_2_dentro;
    const signo_lazo = lado_1_dentro && !lado_2_dentro ? 1 : !lado_1_dentro && lado_2_dentro ? -1 : 0;

    const corriente_encerrada = cruza_bobinado
      ? signo_lazo * n_esp * largo_lazo * corriente
      : 0;
    const circulacion_h_ideal =
      ((lado_1_dentro ? h_ideal : 0) - (lado_2_dentro ? h_ideal : 0)) *
      largo_lazo;
    const circulacion_h =
      ((lado_1_dentro ? h_interior : 0) - (lado_2_dentro ? h_interior : 0)) *
      largo_lazo;

    const residuo =
      Math.abs(circulacion_h_ideal - corriente_encerrada) /
      Math.max(Math.abs(n_esp * largo_lazo * corriente), ESCALA_MIN);

    const region_descripcion = cruza_bobinado
      ? "Lazo rectangular cruzando el bobinado (I_enc = n·L·I)"
      : lado_1_dentro
        ? "Ambos lados dentro del núcleo (I_enc = 0 ⇒ campo uniforme)"
        : "Ambos lados en el exterior (I_enc = 0 ⇒ H = 0)";

    return {
      tipo: "solenoide_largo",
      region_descripcion,
      corriente_encerrada,
      campo_h: h_interior,
      campo_b: mu_nucleo * h_interior,
      campo_b_solenoide_ideal: mu_nucleo * h_ideal,
      circulacion_h,
      circulacion_b: mu_nucleo * circulacion_h,
      residuo_relativo: residuo,
      es_consistente: residuo <= TOLERANCIA_AMP,
      esta_apantallado: !lado_1_dentro && !lado_2_dentro,
      evaluarEnRadio,
    };
  }

  // Toroide (Prob. 3.11)
  const n_total = Math.max(_parametros.numero_espiras_total, 1);
  const r_int = a;
  const r_ext = b;

  const evaluarEnRadio = (_r: number) => {
    const r = Math.max(_r, 0);
    if (r < r_int || r > r_ext || r === 0) {
      return { campo_h: 0, campo_b: 0, corriente_encerrada: 0 };
    }
    const i_enc = n_total * corriente;
    const h = i_enc / (DOS_PI * r);
    return {
      campo_h: h,
      campo_b: mu_nucleo * h,
      corriente_encerrada: i_enc,
    };
  };

  const actual = evaluarEnRadio(rho);
  const circulacion_h = DOS_PI * rho * actual.campo_h;
  const residuo =
    Math.abs(circulacion_h - actual.corriente_encerrada) /
    Math.max(Math.abs(n_total * corriente), ESCALA_MIN);

  let region_descripcion = "Núcleo toroidal (R_int ≤ ρ ≤ R_ext): H ∝ 1/ρ";
  if (rho < r_int) {
    region_descripcion = "Hueco central (ρ < R_int): I_enc = 0 ⇒ H = 0";
  } else if (rho > r_ext) {
    region_descripcion = "Exterior del toroide (ρ > R_ext): I_enc = NI - NI = 0";
  }

  return {
    tipo: "toroide",
    region_descripcion,
    corriente_encerrada: actual.corriente_encerrada,
    campo_h: actual.campo_h,
    campo_b: actual.campo_b,
    campo_b_solenoide_ideal: 0,
    circulacion_h,
    circulacion_b: DOS_PI * rho * actual.campo_b,
    residuo_relativo: residuo,
    es_consistente: residuo <= TOLERANCIA_AMP,
    esta_apantallado: rho < r_int || rho > r_ext,
    evaluarEnRadio,
  };
}

export function generarPerfilGeometriaAmpere(
  _parametros: ParametrosGeometriaAmpere,
  _num_puntos: number = 120,
): PuntoPerfilGeometria[] {
  const resultado = calcularGeometriaAmpere(_parametros);
  const total = Math.max(24, Math.floor(_num_puntos));
  const a = Math.max(_parametros.radio_interior, 1e-6);
  const b = Math.max(_parametros.radio_medio, a + 1e-6);
  const c = Math.max(_parametros.radio_exterior, b + 1e-6);

  let r_max = a * 3.5;
  if (_parametros.tipo === "cable_coaxial") {
    r_max = c * 1.8;
  } else if (_parametros.tipo === "toroide") {
    r_max = b * 1.6;
  } else if (_parametros.tipo === "solenoide_largo") {
    r_max = a * 2.2;
  }

  const puntos: PuntoPerfilGeometria[] = [];

  for (let i = 0; i <= total; i += 1) {
    const radio = (i / total) * r_max;
    const eval_r = resultado.evaluarEnRadio(radio);

    let region = "Exterior";
    if (_parametros.tipo === "conductor_cilindrico") {
      region = radio <= a ? "Interior" : "Exterior";
    } else if (_parametros.tipo === "cable_coaxial") {
      if (radio <= a) {
        region = "Núcleo";
      } else if (radio < b) {
        region = "Dieléctrico";
      } else if (radio <= c) {
        region = "Malla";
      } else {
        region = "Exterior";
      }
    } else if (_parametros.tipo === "solenoide_largo") {
      region = radio < a ? "Núcleo" : "Exterior";
    } else {
      if (radio < a) {
        region = "Hueco";
      } else if (radio <= b) {
        region = "Núcleo";
      } else {
        region = "Exterior";
      }
    }

    const punto: PuntoPerfilGeometria = {
      radio,
      campo_h: eval_r.campo_h,
      campo_b: eval_r.campo_b,
      region,
    };

    if (_parametros.tipo === "conductor_cilindrico" && radio >= 0.25 * a) {
      punto.campo_h_hilo_fino = _parametros.corriente / (DOS_PI * radio);
    }

    puntos.push(punto);
  }

  return puntos;
}
