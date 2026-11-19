import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import katex from "katex";

const MACROS_DEUS_KATEX: Record<string, string> = {
  "\\azul": "\\textcolor{##38bdf8}{#1}",
  "\\rojo": "\\textcolor{##f87171}{#1}",
  "\\verde": "\\textcolor{##34d399}{#1}",
  "\\morado": "\\textcolor{##c084fc}{#1}",
  "\\naranja": "\\textcolor{##fb923c}{#1}",
  "\\destacar": "\\fcolorbox{##d97706}{##292008}{$\\textcolor{##fde68a}{#1}$}",
  "\\tachar": "\\textcolor{##f87171}{\\cancel{#1}}",
  "\\vec": "\\mathbf{#1}",
};

// Resuelve imports relativos sin extensión (.ts) de Next.js/bundler en Node 22 nativo.
registerHooks({
  resolve(_especificador, _contexto, _siguiente) {
    if (
      (_especificador.startsWith("./") || _especificador.startsWith("../")) &&
      !_especificador.endsWith(".ts") &&
      !_especificador.endsWith(".mts") &&
      !_especificador.endsWith(".js") &&
      _contexto.parentURL
    ) {
      const ruta_base = dirname(fileURLToPath(_contexto.parentURL));
      const candidato_ts = resolve(ruta_base, `${_especificador}.ts`);
      if (existsSync(candidato_ts)) {
        return {
          url: pathToFileURL(candidato_ts).href,
          shortCircuit: true,
        };
      }
      const candidato_indice = resolve(ruta_base, _especificador, "index.ts");
      if (existsSync(candidato_indice)) {
        return {
          url: pathToFileURL(candidato_indice).href,
          shortCircuit: true,
        };
      }
    }
    return _siguiente(_especificador, _contexto);
  },
});

const fisica = await import("../src/lib/fisica/index");

function verificarCercano(
  _actual: number,
  _esperado: number,
  _tol_rel: number,
  _etiqueta: string,
): void {
  const escala = Math.max(Math.abs(_esperado), 1e-15);
  const err = Math.abs(_actual - _esperado) / escala;
  assert.ok(
    err <= _tol_rel,
    `${_etiqueta}: actual=${_actual}, esperado=${_esperado}, err_rel=${err} > ${_tol_rel}`,
  );
}

function verificarKatexSinErrores(
  _latex: string,
  _contexto: string,
): void {
  try {
    const html = katex.renderToString(_latex, {
      displayMode: true,
      throwOnError: true,
      strict: false,
      macros: { ...MACROS_DEUS_KATEX },
    });
    assert.ok(html.length > 0, `KaTeX vacío en ${_contexto}`);
  } catch (_error) {
    throw new Error(
      `Error KaTeX en ${_contexto}: ${String(_error)}\nExpresión: ${_latex}`,
    );
  }
}

let pruebas_pasadas = 0;
function ejecutarPrueba(_nombre: string, _fn: () => void): void {
  _fn();
  pruebas_pasadas += 1;
  console.log(`  [OK] ${_nombre}`);
}

console.log("=== Verificación del Motor Físico-Matemático (Ley de Ampère-Maxwell) ===");

ejecutarPrueba("Constantes SI exactas (c = 1/√(μ₀ε₀), η₀ = √(μ₀/ε₀))", () => {
  const c_calc =
    1 / Math.sqrt(fisica.PERMEABILIDAD_VACIO * fisica.PERMITIVIDAD_VACIO);
  const eta_calc = Math.sqrt(
    fisica.PERMEABILIDAD_VACIO / fisica.PERMITIVIDAD_VACIO,
  );
  verificarCercano(c_calc, fisica.VELOCIDAD_LUZ, 1e-14, "Velocidad luz");
  verificarCercano(eta_calc, fisica.IMPEDANCIA_VACIO, 1e-14, "Impedancia vacío");
});

ejecutarPrueba("Funciones de Bessel J₀/J₁ y cuadratura Gauss-Legendre 16", () => {
  assert.equal(fisica.evaluarBesselJ0(0), 1);
  assert.equal(fisica.evaluarBesselJ1(0), 0);
  verificarCercano(fisica.evaluarBesselJ0(1), 0.7651976865579666, 1e-13, "J0(1)");
  verificarCercano(fisica.evaluarBesselJ1(1), 0.4400505857449335, 1e-13, "J1(1)");
  verificarCercano(fisica.evaluarBesselJ0(10), -0.2459357644513483, 1e-11, "J0(10)");
  verificarCercano(fisica.evaluarBesselJ1(10), 0.0434727461688614, 1e-11, "J1(10)");
  verificarCercano(fisica.evaluarBesselJ0(20), 0.1670246643405832, 1e-11, "J0(20)");
  verificarCercano(fisica.evaluarBesselJ1(20), 0.0668331241758500, 1e-11, "J1(20)");
  assert.ok(Math.abs(fisica.evaluarBesselJ0(fisica.CEROS_BESSEL_J0[0])) < 1e-12);
  assert.ok(Math.abs(fisica.evaluarBesselJ0(fisica.CEROS_BESSEL_J0[1])) < 1e-12);
  assert.ok(Math.abs(fisica.evaluarBesselJ1(fisica.CEROS_BESSEL_J1[0])) < 1e-12);

  // Paridad y continuidad en el umbral x = 14 (serie <-> Hankel).
  verificarCercano(
    fisica.evaluarBesselJ0(-3.5),
    fisica.evaluarBesselJ0(3.5),
    1e-15,
    "Paridad J0",
  );
  verificarCercano(
    fisica.evaluarBesselJ1(-3.5),
    -fisica.evaluarBesselJ1(3.5),
    1e-15,
    "Imparidad J1",
  );
  const salto_j0 = Math.abs(
    fisica.evaluarBesselJ0(14.000001) - fisica.evaluarBesselJ0(13.999999),
  );
  assert.ok(salto_j0 < 1e-5, `Continuidad J0 en x=14: salto=${salto_j0}`);

  const int_pol = fisica.integrarGaussLegendre16((_x) => Math.pow(_x, 30), 0, 1);
  verificarCercano(int_pol, 1 / 31, 1e-13, "GL16 x^30");

  for (const x_lim of [0.8, 2.4048255577, 4.5, 7.0]) {
    const num = fisica.integrarGaussLegendre16(
      (_u) => _u * fisica.evaluarBesselJ0(_u),
      0,
      x_lim,
    );
    const exacto = x_lim * fisica.evaluarBesselJ1(x_lim);
    verificarCercano(num, exacto, 1e-11, `∫u J0(u)du en ${x_lim}`);
  }
});

ejecutarPrueba("Marcos ortonormales dextrógiros 3D (det = +1)", () => {
  const reporte = fisica.verificarMarcosCoordenadas();
  assert.ok(reporte.todos_validos, JSON.stringify(reporte.invariantes));
});

ejecutarPrueba("Formateador SI, adimensional y LaTeX sin artefactos", () => {
  assert.equal(fisica.formatearUnidadSI(0.01245, "A", { mostrar_signo: true }).texto, "+12.45 mA");
  assert.equal(fisica.formatearUnidadSI(899e6, "Hz", { decimales: 0 }).texto, "899 MHz");
  assert.equal(fisica.formatearUnidadSI(1e-12, "F").texto, "1.00 pF");
  assert.equal(fisica.formatearUnidadSI(0, "T").texto, "0.00 T");
  // Razones adimensionales nunca deben llevar prefijo métrico ("999.73 m").
  assert.equal(fisica.formatearUnidadSI(0.99973, "", { decimales: 4 }).texto, "0.9997");
  assert.equal(fisica.formatearAdimensional(0.99973, 4), "0.9997");
  assert.ok(!fisica.formatearUnidadSI(0.99973, "").texto.includes("m"));
  verificarKatexSinErrores(
    fisica.formatearNumeroLatex(3.45e-6, "\\text{A}/\\text{m}^2", { mostrar_signo: true }),
    "formatearNumeroLatex compuesto",
  );
  verificarKatexSinErrores(
    fisica.formatearAdimensionalLatex(0.99973, 4),
    "formatearAdimensionalLatex",
  );
});

ejecutarPrueba("Capacitor Modo AC Cuasi-estático (Ej. 5-9): paradoja S₁ vs S₂ y Poynting", () => {
  const params_on = { ...fisica.PARAMETROS_CAPACITOR_INICIAL, incluir_maxwell: true };
  const rep_on = fisica.verificarInvariantesCapacitor(params_on);
  assert.ok(rep_on.todos_validos, JSON.stringify(rep_on.invariantes));

  const params_off = { ...params_on, incluir_maxwell: false };
  const snap_off = fisica.calcularCapacitor(params_off);
  const rep_off = fisica.verificarInvariantesCapacitor(params_off);
  assert.ok(snap_off.hay_paradoja, "Debe detectar paradoja S1 ≠ S2 sin Maxwell");
  assert.ok(rep_off.todos_validos, JSON.stringify(rep_off.invariantes));

  const perfil = fisica.generarPerfilRadialCapacitor(params_on, 64);
  const serie = fisica.generarSerieTemporalCapacitor(params_on, 48);
  assert.equal(perfil.length, 65);
  assert.equal(serie.length, 49);
});

ejecutarPrueba("Capacitor Modo Transitorio RC (Prob. 5.4): carga, descarga y pico Poynting", () => {
  for (const direccion_rc of ["carga", "descarga"] as const) {
    const params = {
      ...fisica.PARAMETROS_CAPACITOR_INICIAL,
      modo: "transitorio_rc" as const,
      direccion_rc,
      fase_o_tiempo_norm: Math.LN2,
      incluir_maxwell: true,
    };
    const rep = fisica.verificarInvariantesCapacitor(params);
    assert.ok(rep.todos_validos, JSON.stringify(rep.invariantes));
    const snap = fisica.calcularCapacitor(params);
    if (direccion_rc === "carga") {
      assert.ok(snap.potencia_entrante_poynting > 0, "En carga Poynting debe entrar");
      assert.ok(snap.poynting_borde < 0, "N_ρ debe ser negativo (radial entrante)");
    } else {
      assert.ok(snap.potencia_entrante_poynting < 0, "En descarga Poynting debe salir");
      assert.ok(snap.poynting_borde > 0, "N_ρ debe ser positivo (radial saliente)");
    }
  }
});

ejecutarPrueba("Capacitor Dieléctrico con Pérdidas (Prob. 5.8): cuadratura 90° y ruptura", () => {
  const sigma = 1e-3;
  const eps_r = 10;
  const f_cruce = sigma / (fisica.DOS_PI * fisica.PERMITIVIDAD_VACIO * eps_r);
  const params = {
    ...fisica.PARAMETROS_CAPACITOR_INICIAL,
    modo: "ac_cuasiestatico" as const,
    conductividad_s_m: sigma,
    permitividad_relativa: eps_r,
    frecuencia: f_cruce,
    fase_o_tiempo_norm: Math.PI / 4,
    incluir_maxwell: true,
  };
  const snap = fisica.calcularCapacitor(params);
  const rep = fisica.verificarInvariantesCapacitor(params);
  assert.ok(rep.todos_validos, JSON.stringify(rep.invariantes));
  verificarCercano(
    Math.abs(snap.corriente_conduccion_entrehierro),
    Math.abs(snap.corriente_desplazamiento_entrehierro),
    1e-12,
    "En f=f_c y θ=π/4: |I_c| === |I_d|",
  );

  // Alerta de ruptura dieléctrica en aire (E_r = 3 MV/m) con 40 kV en 1 cm (4 MV/m).
  const snap_ruptura = fisica.calcularCapacitor({
    ...fisica.PARAMETROS_CAPACITOR_INICIAL,
    tension_pico: 40_000,
    separacion_placas: 0.01,
    campo_ruptura_v_m: 3e6,
  });
  assert.ok(snap_ruptura.hay_ruptura_dielectrica, "Debe alertar ruptura en Aire > 3 MV/m");
});

ejecutarPrueba("Capacitor Alta Frecuencia Bessel (Ej. 5-10): Gauss-Legendre 16 y Poynting Lommel", () => {
  const a = 0.05;
  const v_aire = fisica.VELOCIDAD_LUZ / Math.sqrt(1.0006);
  for (const ka_objetivo of [0.25, fisica.CEROS_BESSEL_J0[0], fisica.CEROS_BESSEL_J1[0], 5.52]) {
    const f = (ka_objetivo * v_aire) / (fisica.DOS_PI * a);
    const params = {
      ...fisica.PARAMETROS_CAPACITOR_INICIAL,
      modo: "alta_frecuencia_bessel" as const,
      frecuencia: f,
      radio_lazo: 0.037,
      fase_o_tiempo_norm: 0.9,
      incluir_maxwell: true,
    };
    const rep = fisica.verificarInvariantesCapacitor(params);
    assert.ok(rep.todos_validos, `ka=${ka_objetivo}: ${JSON.stringify(rep.invariantes)}`);
  }

  // En el primer cero de J₁, la corriente neta en el borde debe anularse.
  const f_j1 = (fisica.CEROS_BESSEL_J1[0] * v_aire) / (fisica.DOS_PI * a);
  const snap_j1 = fisica.calcularCapacitor({
    ...fisica.PARAMETROS_CAPACITOR_INICIAL,
    modo: "alta_frecuencia_bessel",
    frecuencia: f_j1,
    fase_o_tiempo_norm: Math.PI / 2,
  });
  assert.ok(Math.abs(snap_j1.corriente_cable) < 1e-12, "En J1(ka)=0, I_cable=0");
});

ejecutarPrueba("Geometrías Clásicas de Ampère (Ej. 3-16, 3-18, 3-19, 3-20, Prob. 3.11)", () => {
  const casos = [
    { ...fisica.PARAMETROS_GEOMETRIA_INICIAL, tipo: "conductor_cilindrico" as const, permeabilidad_relativa_nucleo: 50 },
    { ...fisica.PARAMETROS_GEOMETRIA_INICIAL, tipo: "cable_coaxial" as const, radio_lazo: 0.04, factor_retorno_coaxial: 1 },
    { ...fisica.PARAMETROS_GEOMETRIA_INICIAL, tipo: "solenoide_largo" as const, radio_lazo: 0.005, radio_lazo_secundario: 0.02 },
    { ...fisica.PARAMETROS_GEOMETRIA_INICIAL, tipo: "toroide" as const, radio_lazo: 0.018 },
  ];

  for (const caso of casos) {
    const rep = fisica.verificarInvariantesGeometria(caso);
    assert.ok(rep.todos_validos, `${caso.tipo}: ${JSON.stringify(rep.invariantes)}`);
    const perfil = fisica.generarPerfilGeometriaAmpere(caso, 60);
    assert.equal(perfil.length, 61);
  }

  // Solenoide: ambos lados interiores => I_enc = 0 (demuestra uniformidad).
  const sol_interno = fisica.calcularGeometriaAmpere({
    ...fisica.PARAMETROS_GEOMETRIA_INICIAL,
    tipo: "solenoide_largo",
    radio_interior: 0.02,
    radio_lazo: 0.005,
    radio_lazo_secundario: 0.015,
  });
  assert.equal(sol_interno.corriente_encerrada, 0);
  assert.equal(sol_interno.circulacion_h, 0);
});

ejecutarPrueba("Régimen Conducción vs Desplazamiento (Ej. 3-7 Agua de Mar)", () => {
  const agua_mar = fisica.obtenerMedioPorId("agua_mar");
  const f_c = agua_mar.conductividad_s_m / (fisica.DOS_PI * fisica.PERMITIVIDAD_VACIO * agua_mar.permitividad_relativa);
  verificarCercano(f_c, 8.98755e8, 1e-3, "f_c agua de mar (~899 MHz)");

  const en_cruce = fisica.calcularRegimenConduccion({
    amplitud_e0: 100,
    frecuencia: f_c,
    conductividad_s_m: agua_mar.conductividad_s_m,
    permitividad_relativa: agua_mar.permitividad_relativa,
    permeabilidad_relativa: 1,
    radio_evaluacion: 0.02,
    dimension_caracteristica: 0.1,
    fase_omega_t: 0.5,
  });
  verificarCercano(en_cruce.tangente_perdidas, 1, 1e-12, "tan δ = 1 en f_c");
  verificarCercano(en_cruce.angulo_fase_jd_grados, 45, 1e-12, "δ_d = 45° en f_c");

  const rep = fisica.verificarInvariantesRegimen({
    amplitud_e0: 100,
    frecuencia: f_c,
    conductividad_s_m: agua_mar.conductividad_s_m,
    permitividad_relativa: agua_mar.permitividad_relativa,
    permeabilidad_relativa: 1,
    radio_evaluacion: 0.02,
    dimension_caracteristica: 0.1,
    fase_omega_t: 0.5,
  });
  assert.ok(rep.todos_validos, JSON.stringify(rep.invariantes));

  const bode = fisica.generarCurvaFrecuenciaRegimen(agua_mar.conductividad_s_m, agua_mar.permitividad_relativa);
  assert.equal(bode.length, 101);
});

ejecutarPrueba("Onda Electromagnética (Vacío, Vidrio, Medio con pérdidas y Maxwell OFF)", () => {
  const onda_vacio = fisica.calcularOndaElectromagnetica(fisica.PARAMETROS_ONDA_INICIAL);
  verificarCercano(onda_vacio.velocidad_fase, fisica.VELOCIDAD_LUZ, 1e-13, "v_p vacío === c");
  verificarCercano(onda_vacio.impedancia_intrinseca.modulo, fisica.IMPEDANCIA_VACIO, 1e-13, "η vacío === η₀");

  const onda_vidrio = fisica.calcularOndaElectromagnetica({
    ...fisica.PARAMETROS_ONDA_INICIAL,
    permitividad_relativa: 4,
  });
  verificarCercano(onda_vidrio.velocidad_fase, fisica.VELOCIDAD_LUZ / 2, 1e-13, "Vidrio v = c/2");
  verificarCercano(onda_vidrio.indice_refraccion, 2, 1e-13, "Vidrio n = 2");

  const params_perdidas = {
    ...fisica.PARAMETROS_ONDA_INICIAL,
    permitividad_relativa: 15,
    conductividad_s_m: 0.05,
    polarizacion: "circular_derecha" as const,
  };
  const rep_perdidas = fisica.verificarInvariantesOnda(params_perdidas);
  assert.ok(rep_perdidas.todos_validos, JSON.stringify(rep_perdidas.invariantes));

  const onda_sin_maxwell = fisica.calcularOndaElectromagnetica({
    ...fisica.PARAMETROS_ONDA_INICIAL,
    incluir_maxwell: false,
  });
  assert.equal(onda_sin_maxwell.propagacion_activa, false);
  assert.equal(onda_sin_maxwell.poynting_promedio_origen, 0);
});

ejecutarPrueba("Los 9 presets FIUBA son consistentes y completos", () => {
  assert.equal(fisica.PRESETS_FIUBA.length, 9);
  for (const preset of fisica.PRESETS_FIUBA) {
    assert.ok(fisica.obtenerPresetPorId(preset.id), `Preset ${preset.id}`);
    if (preset.parametros_capacitor) {
      const rep = fisica.verificarInvariantesCapacitor({
        ...fisica.PARAMETROS_CAPACITOR_INICIAL,
        ...preset.parametros_capacitor,
      });
      assert.ok(rep.todos_validos, `Preset ${preset.id}`);
    }
    if (preset.parametros_geometria) {
      const rep = fisica.verificarInvariantesGeometria({
        ...fisica.PARAMETROS_GEOMETRIA_INICIAL,
        ...preset.parametros_geometria,
      });
      assert.ok(rep.todos_validos, `Preset ${preset.id}`);
    }
    if (preset.parametros_onda) {
      const rep = fisica.verificarInvariantesOnda({
        ...fisica.PARAMETROS_ONDA_INICIAL,
        ...preset.parametros_onda,
      });
      assert.ok(rep.todos_validos, `Preset ${preset.id}`);
    }
    if (preset.parametros_regimen) {
      const rep = fisica.verificarInvariantesRegimen({
        ...fisica.PARAMETROS_REGIMEN_INICIAL,
        ...preset.parametros_regimen,
      });
      assert.ok(rep.todos_validos, `Preset ${preset.id}`);
    }
  }
});

ejecutarPrueba("Calculadora Analítica (Casos A, B, C): invariantes y KaTeX sin errores", () => {
  const resultados = [
    fisica.resolverCasoACapacitor({
      modo: "ac_cuasiestatico",
      radio_placa: 0.05,
      separacion_placas: 0.01,
      tension_pico: 100,
      frecuencia: 1e6,
      permitividad_relativa: 4,
      conductividad_s_m: 1e-3,
      campo_ruptura_v_m: 30e6,
      resistencia_ohm: 1000,
      direccion_rc: "carga",
      tiempo_normalizado_rc: 0.5,
      fase_rad: 0.7,
      radio_evaluacion: 0.03,
    }),
    fisica.resolverCasoACapacitor({
      modo: "transitorio_rc",
      radio_placa: 0.05,
      separacion_placas: 0.005,
      tension_pico: 12,
      frecuencia: 1e6,
      permitividad_relativa: 2100,
      conductividad_s_m: 0,
      campo_ruptura_v_m: 10e6,
      resistencia_ohm: 1000,
      direccion_rc: "carga",
      tiempo_normalizado_rc: 0.693,
      fase_rad: 0,
      radio_evaluacion: 0.06,
    }),
    fisica.resolverCasoBConductor({
      tipo: "conductor_cilindrico",
      corriente: 20,
      radio_interior: 0.01,
      radio_medio: 0.02,
      radio_exterior: 0.03,
      factor_retorno_coaxial: 1,
      permeabilidad_relativa_nucleo: 50,
      radio_evaluacion: 0.005,
    }),
    fisica.resolverCasoBConductor({
      tipo: "cable_coaxial",
      corriente: 10,
      radio_interior: 0.004,
      radio_medio: 0.012,
      radio_exterior: 0.016,
      factor_retorno_coaxial: 1,
      permeabilidad_relativa_nucleo: 1,
      radio_evaluacion: 0.02,
    }),
    fisica.resolverCasoCArmonico({
      amplitud_e0: 100,
      frecuencia: 8.99e8,
      permitividad_relativa: 80,
      permeabilidad_relativa: 1,
      conductividad_s_m: 4,
      radio_evaluacion: 0.03,
      dimension_caracteristica: 0.1,
      tiempo_s: 1e-10,
    }),
  ];

  for (const res of resultados) {
    assert.ok(
      res.verificacion_invariante.cumple,
      `Invariante fallido en ${res.titulo}`,
    );
    assert.ok(res.pasos.length >= 4, `Muy pocos pasos en ${res.titulo}`);
    for (const paso of res.pasos) {
      verificarKatexSinErrores(
        paso.expresion_latex,
        `${res.caso_id} paso ${paso.numero}`,
      );
      if (paso.verificacion_dimensional) {
        verificarKatexSinErrores(
          paso.verificacion_dimensional,
          `${res.caso_id} paso ${paso.numero} (dim)`,
        );
      }
    }
    for (const mag of res.resumen_magnitudes) {
      verificarKatexSinErrores(mag.simbolo_latex, `${res.caso_id} resumen`);
    }
  }
});

console.log(`\n✓ Todas las verificaciones físicas y KaTeX pasaron (${pruebas_pasadas} suites).`);
