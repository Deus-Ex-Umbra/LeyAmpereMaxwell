"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTemaLaboratorio, type TemaLaboratorio } from "@/contextos";
import { COLORES_VECTORES } from "@/lib/fisica";
import {
  calcularFactorResaltado,
  crearContextoEscenaWebGL,
  crearEtiquetaSprite,
  crearPoolFlechasInstanciadas,
  type ConfiguracionCamara,
  type ContextoEscenaWebGL,
  type PresetCamaraEscena,
  type TransformacionFlecha,
} from "@/lib/three";
import type {
  CapasVisibles3D,
  ParametrosOndaEM,
  ResultadoOndaEM,
} from "@/tipos";
import type { ComandoCamara3D } from "./visor-capacitor-3d";

export interface PropiedadesVisorOndaEM3D {
  parametros: ParametrosOndaEM;
  resultado: ResultadoOndaEM;
  capas_visibles: CapasVisibles3D;
  fase_animacion: number;
  en_reproduccion: boolean;
  termino_resaltado?: string | null;
  comando_camara?: ComandoCamara3D;
  alFallarWebGL?: () => void;
}

interface EstadoVivoOnda {
  parametros: ParametrosOndaEM;
  resultado: ResultadoOndaEM;
  capas_visibles: CapasVisibles3D;
  fase_animacion: number;
  en_reproduccion: boolean;
  termino_resaltado: string | null;
}

const PRESETS_CAMARA_ONDA: Record<
  Exclude<PresetCamaraEscena, "reiniciar">,
  ConfiguracionCamara
> = {
  perspectiva: { posicion: [4.8, 3.0, 6.2], objetivo: [0, 0, 0] },
  axial: { posicion: [7.6, 0.45, 0.45], objetivo: [0, 0, 0] },
  frontal: { posicion: [0, 0.3, 7.6], objetivo: [0, 0, 0] },
};

const X_INICIO_ONDA = -4.2;
const X_FIN_ONDA = 4.2;
const LONGITUD_VISUAL_ONDA = X_FIN_ONDA - X_INICIO_ONDA;
const AMPLITUD_VISUAL_CAMPO = 1.42;
const NUM_SEGMENTOS_CINTA = 140;
const NUM_FLECHAS_PEINE = 38;

const CLAVES_E = ["campo_electrico", "campo_e", "constantes_vacio"];
const CLAVES_BH = [
  "rotacional_h",
  "circulacion_h",
  "campo_magnetico",
  "campo_b",
  "campo_h",
  "constantes_vacio",
];
const CLAVES_MAXWELL = [
  "corriente_desplazamiento",
  "densidad_jd",
  "flujo_electrico",
  "constantes_vacio",
];
const CLAVES_POYNTING = ["poynting", "vector_n"];

function crearGeometriaCinta(_segmentos: number): {
  cinta_geo: THREE.BufferGeometry;
  curva_geo: THREE.BufferGeometry;
} {
  const num_vertices_cinta = (_segmentos + 1) * 2;
  const posiciones_cinta = new Float32Array(num_vertices_cinta * 3);
  const indices: number[] = [];

  for (let i = 0; i < _segmentos; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const cinta_geo = new THREE.BufferGeometry();
  cinta_geo.setAttribute(
    "position",
    new THREE.BufferAttribute(posiciones_cinta, 3),
  );
  cinta_geo.setIndex(indices);

  const posiciones_curva = new Float32Array((_segmentos + 1) * 3);
  const curva_geo = new THREE.BufferGeometry();
  curva_geo.setAttribute(
    "position",
    new THREE.BufferAttribute(posiciones_curva, 3),
  );

  return { cinta_geo, curva_geo };
}

function crearLazoRectanguloAcoplamiento(
  _ancho_x: number,
  _alto_transversal: number,
  _plano: "xy" | "xz",
  _color_hex: string,
): {
  grupo: THREE.Group;
  material_borde: THREE.MeshStandardMaterial;
  material_relleno: THREE.MeshBasicMaterial;
} {
  const mx = _ancho_x * 0.5;
  const mt = _alto_transversal * 0.5;
  const esquinas =
    _plano === "xy"
      ? [
          new THREE.Vector3(-mx, -mt, 0),
          new THREE.Vector3(mx, -mt, 0),
          new THREE.Vector3(mx, mt, 0),
          new THREE.Vector3(-mx, mt, 0),
        ]
      : [
          new THREE.Vector3(-mx, 0, -mt),
          new THREE.Vector3(mx, 0, -mt),
          new THREE.Vector3(mx, 0, mt),
          new THREE.Vector3(-mx, 0, mt),
        ];

  const ruta = new THREE.CurvePath<THREE.Vector3>();
  ruta.add(new THREE.LineCurve3(esquinas[0], esquinas[1]));
  ruta.add(new THREE.LineCurve3(esquinas[1], esquinas[2]));
  ruta.add(new THREE.LineCurve3(esquinas[2], esquinas[3]));
  ruta.add(new THREE.LineCurve3(esquinas[3], esquinas[0]));

  const material_borde = new THREE.MeshStandardMaterial({
    color: _color_hex,
    emissive: _color_hex,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const tubo = new THREE.Mesh(
    new THREE.TubeGeometry(ruta, 44, 0.022, 10, true),
    material_borde,
  );

  const material_relleno = new THREE.MeshBasicMaterial({
    color: _color_hex,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const plano = new THREE.Mesh(
    new THREE.PlaneGeometry(_ancho_x, _alto_transversal),
    material_relleno,
  );
  if (_plano === "xz") {
    plano.rotation.x = -Math.PI / 2;
  }

  const grupo = new THREE.Group();
  grupo.add(tubo, plano);
  return { grupo, material_borde, material_relleno };
}

interface InstanciaEscenaOnda {
  contexto: ContextoEscenaWebGL;
  aplicarTema: (_tema: TemaLaboratorio) => void;
  desmontar: () => void;
}

function montarEscenaOnda(
  _contenedor: HTMLDivElement,
  _estado_ref: { current: EstadoVivoOnda },
): InstanciaEscenaOnda | null {
  const contexto = crearContextoEscenaWebGL(
    _contenedor,
    PRESETS_CAMARA_ONDA.perspectiva,
    {
      tamano_rejilla: 13,
      altura_rejilla: -2.25,
      longitud_ejes: 1.2,
      origen_ejes: new THREE.Vector3(-4.6, -2.22, -3.2),
    },
  );
  if (!contexto) {
    return null;
  }
  const { escena, camara, renderizador, controles } = contexto;

  // Eje central de propagacion (+X) y punta direccional de k.
    const geo_eje_prop = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(X_INICIO_ONDA - 0.3, 0, 0),
      new THREE.Vector3(X_FIN_ONDA + 0.55, 0, 0),
    ]);
    const mat_eje_prop = new THREE.LineBasicMaterial({
      color: "#64748b",
      transparent: true,
      opacity: 0.65,
    });
    const linea_eje_prop = new THREE.Line(geo_eje_prop, mat_eje_prop);

    const material_punta_eje = new THREE.MeshStandardMaterial({
      color: "#94a3b8",
      emissive: "#38bdf8",
      emissiveIntensity: 0.28,
    });
    const geo_punta_eje = new THREE.ConeGeometry(0.065, 0.22, 12);
    const punta_eje_prop = new THREE.Mesh(geo_punta_eje, material_punta_eje);
    punta_eje_prop.rotation.z = -Math.PI / 2;
    punta_eje_prop.position.set(X_FIN_ONDA + 0.62, 0, 0);

    // Fuente emisora en x = X_INICIO_ONDA.
    const material_fuente_antena = new THREE.MeshStandardMaterial({
      color: "#cbd5e1",
      emissive: COLORES_VECTORES.e,
      emissiveIntensity: 0.35,
      metalness: 0.72,
      roughness: 0.24,
    });
    const geo_fuente_antena = new THREE.CylinderGeometry(0.036, 0.036, 2.9, 16);
    const fuente_antena = new THREE.Mesh(
      geo_fuente_antena,
      material_fuente_antena,
    );
    fuente_antena.position.set(X_INICIO_ONDA - 0.08, 0, 0);

    // Bloque translucido del medio dielectrico/conductor.
    const material_medio = new THREE.MeshPhysicalMaterial({
      color: "#0ea5e9",
      emissive: "#0369a1",
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.0,
      roughness: 0.22,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const geo_bloque_medio = new THREE.BoxGeometry(LONGITUD_VISUAL_ONDA, 3.3, 3.3);
    const bloque_medio = new THREE.Mesh(geo_bloque_medio, material_medio);
    bloque_medio.visible = false;

    escena.add(linea_eje_prop, punta_eje_prop, fuente_antena, bloque_medio);

    // Cintas translucidas + curvas envolventes actualizadas en el lugar (cero asignaciones GPU).
    const { cinta_geo: cinta_e_geo, curva_geo: curva_e_geo } =
      crearGeometriaCinta(NUM_SEGMENTOS_CINTA);
    const { cinta_geo: cinta_b_geo, curva_geo: curva_b_geo } =
      crearGeometriaCinta(NUM_SEGMENTOS_CINTA);

    const material_cinta_e = new THREE.MeshBasicMaterial({
      color: COLORES_VECTORES.e,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const material_curva_e = new THREE.LineBasicMaterial({
      color: COLORES_VECTORES.e,
      transparent: true,
      opacity: 0.96,
    });
    const malla_cinta_e = new THREE.Mesh(cinta_e_geo, material_cinta_e);
    const linea_curva_e = new THREE.Line(curva_e_geo, material_curva_e);

    const material_cinta_b = new THREE.MeshBasicMaterial({
      color: COLORES_VECTORES.b,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const material_curva_b = new THREE.LineBasicMaterial({
      color: COLORES_VECTORES.b,
      transparent: true,
      opacity: 0.96,
    });
    const malla_cinta_b = new THREE.Mesh(cinta_b_geo, material_cinta_b);
    const linea_curva_b = new THREE.Line(curva_b_geo, material_curva_b);

    // Envolvente exponencial e^{-αx} cuando el medio tiene perdidas.
    const pos_env_sup = new Float32Array((NUM_SEGMENTOS_CINTA + 1) * 3);
    const pos_env_inf = new Float32Array((NUM_SEGMENTOS_CINTA + 1) * 3);
    const geo_env_sup = new THREE.BufferGeometry();
    geo_env_sup.setAttribute("position", new THREE.BufferAttribute(pos_env_sup, 3));
    const geo_env_inf = new THREE.BufferGeometry();
    geo_env_inf.setAttribute("position", new THREE.BufferAttribute(pos_env_inf, 3));
    const mat_envolvente = new THREE.LineBasicMaterial({
      color: "#fbbf24",
      transparent: true,
      opacity: 0.52,
    });
    const linea_env_sup = new THREE.Line(geo_env_sup, mat_envolvente);
    const linea_env_inf = new THREE.Line(geo_env_inf, mat_envolvente);
    linea_env_sup.visible = false;
    linea_env_inf.visible = false;

    escena.add(
      malla_cinta_e,
      linea_curva_e,
      malla_cinta_b,
      linea_curva_b,
      linea_env_sup,
      linea_env_inf,
    );

    // Lazos entrelazados Faraday (XY) y Ampere-Maxwell (XZ).
    const lazo_faraday = crearLazoRectanguloAcoplamiento(
      1.05,
      1.75,
      "xy",
      COLORES_VECTORES.e,
    );
    lazo_faraday.grupo.position.set(-0.35, 0, 0);

    const lazo_maxwell = crearLazoRectanguloAcoplamiento(
      1.05,
      1.75,
      "xz",
      COLORES_VECTORES.jd,
    );
    lazo_maxwell.grupo.position.set(0.35, 0, 0);

    const grupo_lazos_acoplamiento = new THREE.Group();
    grupo_lazos_acoplamiento.add(lazo_faraday.grupo, lazo_maxwell.grupo);
    escena.add(grupo_lazos_acoplamiento);

    // Pools instanciados de flechas para E, B/H y vector de Poynting N.
    const pool_e = crearPoolFlechasInstanciadas(
      NUM_FLECHAS_PEINE + 2,
      COLORES_VECTORES.e,
      { radio_tallo: 0.018, radio_punta: 0.05 },
    );
    const pool_bh = crearPoolFlechasInstanciadas(
      NUM_FLECHAS_PEINE + 2,
      COLORES_VECTORES.b,
      { radio_tallo: 0.018, radio_punta: 0.05 },
    );
    const pool_poynting = crearPoolFlechasInstanciadas(14, COLORES_VECTORES.n, {
      radio_tallo: 0.024,
      radio_punta: 0.068,
      intensidad_emisiva: 0.56,
    });
    escena.add(pool_e.grupo, pool_bh.grupo, pool_poynting.grupo);

    const etiqueta_e = crearEtiquetaSprite({
      texto: "E",
      es_vector: true,
      color_texto: COLORES_VECTORES.e,
      escala_mundo: 0.34,
    });
    const etiqueta_bh = crearEtiquetaSprite({
      texto: "B",
      es_vector: true,
      color_texto: COLORES_VECTORES.b,
      escala_mundo: 0.34,
    });
    const etiqueta_n = crearEtiquetaSprite({
      texto: "N",
      es_vector: true,
      color_texto: COLORES_VECTORES.n,
      escala_mundo: 0.34,
    });
    const etiqueta_k = crearEtiquetaSprite({
      texto: "k (+X)",
      color_texto: "#cbd5e1",
      escala_mundo: 0.28,
    });
    etiqueta_k.sprite.position.set(X_FIN_ONDA + 0.65, 0.34, 0);

    const etiqueta_faraday = crearEtiquetaSprite({
      texto: "Faraday",
      color_texto: COLORES_VECTORES.e,
      escala_mundo: 0.26,
    });
    const etiqueta_maxwell = crearEtiquetaSprite({
      texto: "Maxwell",
      color_texto: COLORES_VECTORES.jd,
      escala_mundo: 0.26,
    });

    const todas_etiquetas = [
      etiqueta_e,
      etiqueta_bh,
      etiqueta_n,
      etiqueta_k,
      etiqueta_faraday,
      etiqueta_maxwell,
    ];
    for (const etq of todas_etiquetas) {
      escena.add(etq.sprite);
    }

    let tiempo_anterior_ms = performance.now();
    let pulso_interno = 0;
    let id_animacion = 0;

    const bucle = (_ahora_ms: number): void => {
      id_animacion = requestAnimationFrame(bucle);
      const delta_s = Math.min((_ahora_ms - tiempo_anterior_ms) / 1000, 0.1);
      tiempo_anterior_ms = _ahora_ms;
      pulso_interno += delta_s;

      const {
        parametros: param,
        resultado: res,
        capas_visibles: capas,
        fase_animacion: fase,
        termino_resaltado: resaltado,
      } = _estado_ref.current;

      contexto.grupo_referencia.visible = capas.mostrar_rejilla_y_ejes;

      const res_e = calcularFactorResaltado(resaltado, CLAVES_E);
      const res_bh = calcularFactorResaltado(resaltado, CLAVES_BH);
      const res_max = calcularFactorResaltado(resaltado, CLAVES_MAXWELL);
      const res_n = calcularFactorResaltado(resaltado, CLAVES_POYNTING);

      // Escala espacial proporcional al indice de refraccion para ver λ reducirse en dielectricos.
      const num_lambdas_vis = THREE.MathUtils.clamp(
        2.0 * Math.max(res.indice_refraccion, 1),
        1.5,
        5.2,
      );
      const muestras = res.generarMuestrasEspaciales(
        NUM_SEGMENTOS_CINTA,
        num_lambdas_vis,
        fase,
      );

      const e0 = Math.max(Math.abs(param.amplitud_e0), 1e-9);
      const h0 = Math.max(e0 / Math.max(res.impedancia_intrinseca.modulo, 1e-9), 1e-12);
      const n0 = Math.max(e0 * h0, 1e-12);

      // Bloque visual del medio (dielectrico o conductor con perdidas).
      const es_medio_material =
        param.permitividad_relativa > 1.05 || param.conductividad_s_m > 0;
      bloque_medio.visible = es_medio_material;
      if (es_medio_material) {
        const es_perdidas = param.conductividad_s_m > 0;
        material_medio.color.set(es_perdidas ? "#f59e0b" : "#0ea5e9");
        material_medio.emissive.set(es_perdidas ? "#b45309" : "#0369a1");
        material_medio.opacity = es_perdidas ? 0.08 : 0.07;
      }

      const pos_cinta_e = cinta_e_geo.getAttribute("position") as THREE.BufferAttribute;
      const pos_curva_e = curva_e_geo.getAttribute("position") as THREE.BufferAttribute;
      const pos_cinta_b = cinta_b_geo.getAttribute("position") as THREE.BufferAttribute;
      const pos_curva_b = curva_b_geo.getAttribute("position") as THREE.BufferAttribute;
      const attr_env_sup = geo_env_sup.getAttribute("position") as THREE.BufferAttribute;
      const attr_env_inf = geo_env_inf.getAttribute("position") as THREE.BufferAttribute;

      const tiene_atenuacion =
        param.incluir_maxwell && res.constante_atenuacion_alfa > 1e-12;

      for (let i = 0; i <= NUM_SEGMENTOS_CINTA; i += 1) {
        const m = muestras[i];
        const u = i / NUM_SEGMENTOS_CINTA;
        const x_vis = X_INICIO_ONDA + u * LONGITUD_VISUAL_ONDA;

        const ey = (m.campo_e.y / e0) * AMPLITUD_VISUAL_CAMPO;
        const ez = (m.campo_e.z / e0) * AMPLITUD_VISUAL_CAMPO;
        const hy = (m.campo_h.y / h0) * AMPLITUD_VISUAL_CAMPO;
        const hz = (m.campo_h.z / h0) * AMPLITUD_VISUAL_CAMPO;

        const idx_base = i * 2;
        pos_cinta_e.setXYZ(idx_base, x_vis, 0, 0);
        pos_cinta_e.setXYZ(idx_base + 1, x_vis, ey, ez);
        pos_curva_e.setXYZ(i, x_vis, ey, ez);

        pos_cinta_b.setXYZ(idx_base, x_vis, 0, 0);
        pos_cinta_b.setXYZ(idx_base + 1, x_vis, hy, hz);
        pos_curva_b.setXYZ(i, x_vis, hy, hz);

        const y_env = m.factor_atenuacion * AMPLITUD_VISUAL_CAMPO;
        attr_env_sup.setXYZ(i, x_vis, y_env, 0);
        attr_env_inf.setXYZ(i, x_vis, -y_env, 0);
      }

      pos_cinta_e.needsUpdate = true;
      pos_curva_e.needsUpdate = true;
      pos_cinta_b.needsUpdate = true;
      pos_curva_b.needsUpdate = true;
      attr_env_sup.needsUpdate = true;
      attr_env_inf.needsUpdate = true;

      malla_cinta_e.visible = capas.mostrar_e;
      linea_curva_e.visible = capas.mostrar_e;
      material_cinta_e.opacity = 0.2 * res_e.factor_opacidad;
      material_curva_e.opacity = 0.96 * res_e.factor_opacidad;

      const mostrar_bh_onda = capas.mostrar_b_h && param.incluir_maxwell;
      malla_cinta_b.visible = mostrar_bh_onda;
      linea_curva_b.visible = mostrar_bh_onda;
      material_cinta_b.opacity = 0.19 * res_bh.factor_opacidad;
      material_curva_b.opacity = 0.96 * res_bh.factor_opacidad;

      linea_env_sup.visible = tiene_atenuacion && capas.mostrar_e;
      linea_env_inf.visible = tiene_atenuacion && capas.mostrar_e;

      // Flechas de peine para E y B/H.
      const flechas_e: TransformacionFlecha[] = [];
      const flechas_bh: TransformacionFlecha[] = [];
      for (let k = 0; k < NUM_FLECHAS_PEINE; k += 1) {
        const u = k / (NUM_FLECHAS_PEINE - 1);
        const idx = Math.min(
          NUM_SEGMENTOS_CINTA,
          Math.round(u * NUM_SEGMENTOS_CINTA),
        );
        const m = muestras[idx];
        const x_vis = X_INICIO_ONDA + u * LONGITUD_VISUAL_ONDA;

        if (capas.mostrar_e) {
          const vec_e = new THREE.Vector3(
            0,
            (m.campo_e.y / e0) * AMPLITUD_VISUAL_CAMPO,
            (m.campo_e.z / e0) * AMPLITUD_VISUAL_CAMPO,
          );
          const largo_e = vec_e.length();
          if (largo_e > 0.04) {
            flechas_e.push({
              origen: new THREE.Vector3(x_vis, 0, 0),
              direccion: vec_e,
              longitud: largo_e,
              grosor: res_e.factor_escala,
            });
          }
        }

        if (mostrar_bh_onda) {
          const vec_h = new THREE.Vector3(
            0,
            (m.campo_h.y / h0) * AMPLITUD_VISUAL_CAMPO,
            (m.campo_h.z / h0) * AMPLITUD_VISUAL_CAMPO,
          );
          const largo_h = vec_h.length();
          if (largo_h > 0.04) {
            flechas_bh.push({
              origen: new THREE.Vector3(x_vis, 0, 0),
              direccion: vec_h,
              longitud: largo_h,
              grosor: res_bh.factor_escala,
            });
          }
        }
      }

      pool_e.grupo.visible = capas.mostrar_e;
      pool_e.definirEstilo(
        0.92 * res_e.factor_opacidad,
        res_e.intensidad_emisiva,
      );
      pool_e.actualizar(flechas_e);

      pool_bh.grupo.visible = mostrar_bh_onda;
      pool_bh.definirEstilo(
        0.92 * res_bh.factor_opacidad,
        res_bh.intensidad_emisiva,
      );
      pool_bh.actualizar(flechas_bh);

      // Vector de Poynting N = E x H a lo largo de +X.
      const flechas_n: TransformacionFlecha[] = [];
      if (capas.mostrar_poynting && param.incluir_maxwell) {
        const num_n = 9;
        for (let k = 0; k < num_n; k += 1) {
          const u = (k + 0.4) / num_n;
          const idx = Math.min(
            NUM_SEGMENTOS_CINTA,
            Math.round(u * NUM_SEGMENTOS_CINTA),
          );
          const m = muestras[idx];
          const frac_n = m.poynting_n.x / n0;
          const largo_n = THREE.MathUtils.clamp(Math.abs(frac_n) * 0.72, 0, 0.78);
          if (largo_n < 0.04) {
            continue;
          }
          const x_vis = X_INICIO_ONDA + u * LONGITUD_VISUAL_ONDA;
          flechas_n.push({
            origen: new THREE.Vector3(x_vis - largo_n * 0.5, -1.78, 0),
            direccion: new THREE.Vector3(frac_n >= 0 ? 1 : -1, 0, 0),
            longitud: largo_n,
            grosor: res_n.factor_escala,
          });
        }
      }
      pool_poynting.grupo.visible =
        capas.mostrar_poynting && param.incluir_maxwell;
      pool_poynting.definirEstilo(
        0.95 * res_n.factor_opacidad,
        res_n.intensidad_emisiva,
      );
      pool_poynting.actualizar(flechas_n);

      // Lazos de acoplamiento Faraday (XY) y Ampere-Maxwell (XZ).
      grupo_lazos_acoplamiento.visible = capas.mostrar_lazo_y_superficie;
      if (capas.mostrar_lazo_y_superficie) {
        lazo_faraday.material_borde.opacity = 0.88 * res_e.factor_opacidad;
        lazo_faraday.material_relleno.opacity = 0.11 * res_e.factor_opacidad;

        if (param.incluir_maxwell) {
          lazo_maxwell.material_borde.color.set(COLORES_VECTORES.jd);
          lazo_maxwell.material_borde.emissive.set(COLORES_VECTORES.jd);
          lazo_maxwell.material_borde.opacity = 0.9 * res_max.factor_opacidad;
          lazo_maxwell.material_relleno.color.set(COLORES_VECTORES.jd);
          lazo_maxwell.material_relleno.opacity = 0.12 * res_max.factor_opacidad;
        } else {
          const pulso = 0.45 + 0.55 * Math.sin(pulso_interno * 7);
          lazo_maxwell.material_borde.color.set("#f87171");
          lazo_maxwell.material_borde.emissive.set("#ef4444");
          lazo_maxwell.material_borde.opacity = 0.25 + 0.35 * pulso;
          lazo_maxwell.material_relleno.color.set("#f87171");
          lazo_maxwell.material_relleno.opacity = 0.05;
        }

        etiqueta_faraday.sprite.visible = true;
        etiqueta_faraday.sprite.position.set(-0.35, 1.15, 0.15);
        etiqueta_faraday.actualizarOpacidad(res_e.factor_opacidad);

        etiqueta_maxwell.sprite.visible = true;
        etiqueta_maxwell.sprite.position.set(0.35, 0.28, 1.18);
        etiqueta_maxwell.actualizarOpacidad(
          param.incluir_maxwell ? res_max.factor_opacidad : 0.65,
        );
      } else {
        etiqueta_faraday.sprite.visible = false;
        etiqueta_maxwell.sprite.visible = false;
      }

      etiqueta_e.sprite.visible = capas.mostrar_e;
      etiqueta_e.sprite.position.set(-2.6, 1.72, 0.1);
      etiqueta_e.actualizarOpacidad(res_e.factor_opacidad);

      etiqueta_bh.sprite.visible = mostrar_bh_onda;
      etiqueta_bh.sprite.position.set(-2.3, 0.22, 1.75);
      etiqueta_bh.actualizarOpacidad(res_bh.factor_opacidad);

      etiqueta_n.sprite.visible =
        capas.mostrar_poynting && param.incluir_maxwell && flechas_n.length > 0;
      etiqueta_n.sprite.position.set(1.8, -1.78, 0.38);
      etiqueta_n.actualizarOpacidad(res_n.factor_opacidad);

      contexto.actualizarTransicionCamara(delta_s);
      controles.update();
      renderizador.render(escena, camara);
    };

    id_animacion = requestAnimationFrame(bucle);

    const desmontar = (): void => {
      cancelAnimationFrame(id_animacion);
      geo_eje_prop.dispose();
      mat_eje_prop.dispose();
      geo_punta_eje.dispose();
      material_punta_eje.dispose();
      geo_fuente_antena.dispose();
      material_fuente_antena.dispose();
      geo_bloque_medio.dispose();
      material_medio.dispose();
      cinta_e_geo.dispose();
      curva_e_geo.dispose();
      cinta_b_geo.dispose();
      curva_b_geo.dispose();
      material_cinta_e.dispose();
      material_curva_e.dispose();
      material_cinta_b.dispose();
      material_curva_b.dispose();
      geo_env_sup.dispose();
      geo_env_inf.dispose();
      mat_envolvente.dispose();
      lazo_faraday.material_borde.dispose();
      lazo_faraday.material_relleno.dispose();
      lazo_maxwell.material_borde.dispose();
      lazo_maxwell.material_relleno.dispose();
      pool_e.liberar();
      pool_bh.liberar();
      pool_poynting.liberar();
      for (const etq of todas_etiquetas) {
        etq.liberar();
      }
      contexto.liberar();
    };

    const aplicarTema = (_tema: TemaLaboratorio): void => {
      contexto.aplicarTema(_tema);
      const es_claro = _tema === "claro";
      mat_eje_prop.color.set(es_claro ? "#475569" : "#64748b");
      material_punta_eje.color.set(es_claro ? "#475569" : "#94a3b8");
      material_fuente_antena.color.set(es_claro ? "#64748b" : "#cbd5e1");
      for (const etq of todas_etiquetas) {
        etq.aplicarTema(_tema);
      }
    };

    return { contexto, aplicarTema, desmontar };
}

export function VisorOndaEM3D(_propiedades: PropiedadesVisorOndaEM3D) {
  const {
    parametros,
    resultado,
    capas_visibles,
    fase_animacion,
    en_reproduccion,
    termino_resaltado = null,
    comando_camara,
    alFallarWebGL,
  } = _propiedades;

  const { tema } = useTemaLaboratorio();
  const tema_ref = useRef<TemaLaboratorio>(tema);
  const contenedor_ref = useRef<HTMLDivElement | null>(null);
  const contexto_ref = useRef<ContextoEscenaWebGL | null>(null);
  const instancia_ref = useRef<InstanciaEscenaOnda | null>(null);
  const al_fallar_ref = useRef(alFallarWebGL);
  const estado_ref = useRef<EstadoVivoOnda>({
    parametros,
    resultado,
    capas_visibles,
    fase_animacion,
    en_reproduccion,
    termino_resaltado,
  });

  useEffect(() => {
    tema_ref.current = tema;
    instancia_ref.current?.aplicarTema(tema);
  }, [tema]);

  useEffect(() => {
    al_fallar_ref.current = alFallarWebGL;
  }, [alFallarWebGL]);

  useEffect(() => {
    estado_ref.current = {
      parametros,
      resultado,
      capas_visibles,
      fase_animacion,
      en_reproduccion,
      termino_resaltado,
    };
  }, [
    parametros,
    resultado,
    capas_visibles,
    fase_animacion,
    en_reproduccion,
    termino_resaltado,
  ]);

  useEffect(() => {
    if (!comando_camara || !contexto_ref.current) {
      return;
    }
    contexto_ref.current.aplicarPresetCamara(
      comando_camara.preset,
      PRESETS_CAMARA_ONDA,
    );
  }, [comando_camara]);

  useEffect(() => {
    const contenedor = contenedor_ref.current;
    if (!contenedor) {
      return;
    }
    const instancia = montarEscenaOnda(contenedor, estado_ref);
    if (!instancia) {
      al_fallar_ref.current?.();
      return;
    }
    instancia.aplicarTema(tema_ref.current);
    instancia_ref.current = instancia;
    contexto_ref.current = instancia.contexto;
    return () => {
      instancia.desmontar();
      instancia_ref.current = null;
      contexto_ref.current = null;
    };
  }, []);

  return (
    <div
      ref={contenedor_ref}
      className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
      aria-label="Visor tridimensional interactivo de propagación de onda electromagnética acoplada"
    />
  );
}
