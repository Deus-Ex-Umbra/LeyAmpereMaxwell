"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTemaLaboratorio, type TemaLaboratorio } from "@/contextos";
import {
  CEROS_BESSEL_J0,
  COLORES_VECTORES,
  DOS_PI,
  MARCO_EJE_HORIZONTAL,
  PERMITIVIDAD_VACIO,
  campoCilindricoAMundo,
  cilindricoAMundo,
  evaluarBesselJ0,
  evaluarBesselJ1,
} from "@/lib/fisica";
import {
  calcularFactorResaltado,
  crearContextoEscenaWebGL,
  crearEtiquetaSprite,
  crearPoolEsferasInstanciadas,
  crearPoolFlechasInstanciadas,
  type ConfiguracionCamara,
  type ContextoEscenaWebGL,
  type InstanciaEsfera,
  type PresetCamaraEscena,
  type TransformacionFlecha,
} from "@/lib/three";
import type {
  CapasVisibles3D,
  InstantaneaCapacitor,
  ParametrosCapacitor,
} from "@/tipos";

export interface ComandoCamara3D {
  preset: PresetCamaraEscena;
  secuencia: number;
}

export interface PropiedadesVisorCapacitor3D {
  parametros: ParametrosCapacitor;
  instantanea: InstantaneaCapacitor;
  capas_visibles: CapasVisibles3D;
  fase_animacion: number;
  en_reproduccion: boolean;
  termino_resaltado?: string | null;
  comando_camara?: ComandoCamara3D;
  alFallarWebGL?: () => void;
}

interface EstadoVivoCapacitor {
  parametros: ParametrosCapacitor;
  instantanea: InstantaneaCapacitor;
  capas_visibles: CapasVisibles3D;
  fase_animacion: number;
  en_reproduccion: boolean;
  termino_resaltado: string | null;
}

const PRESETS_CAMARA_CAPACITOR: Record<
  Exclude<PresetCamaraEscena, "reiniciar">,
  ConfiguracionCamara
> = {
  perspectiva: { posicion: [4.3, 2.7, 5.1], objetivo: [-0.25, 0, 0] },
  axial: { posicion: [6.2, 0.35, 0.35], objetivo: [0, 0, 0] },
  frontal: { posicion: [-0.25, 0.25, 6.4], objetivo: [-0.25, 0, 0] },
};

const GROSOR_PLACA = 0.085;
const EXTREMIDAD_CABLE_X = 3.65;
const RADIO_CABLE_VISUAL = 0.068;

const COLOR_CARGA_POSITIVA = new THREE.Color("#f87171");
const COLOR_CARGA_NEGATIVA = new THREE.Color("#38bdf8");
const COLOR_FLECHA_E_POS = new THREE.Color(COLORES_VECTORES.e);
const COLOR_FLECHA_E_INV = new THREE.Color("#0ea5e9");
const COLOR_S2_NORMAL = new THREE.Color(COLORES_VECTORES.s2);
const COLOR_S2_PARADOJA = new THREE.Color("#f43f5e");
const COLOR_DIELECTRICO_NORMAL = new THREE.Color("#1e3a5f");
const COLOR_DIELECTRICO_ALTO_EPS = new THREE.Color("#0284c7");
const COLOR_DIELECTRICO_RUPTURA = new THREE.Color("#dc2626");

const CLAVES_E = [
  "campo_electrico",
  "campo_e",
  "desplazamiento_d",
  "flujo_electrico",
  "constantes_vacio",
];
const CLAVES_BH = [
  "rotacional_h",
  "circulacion_h",
  "campo_magnetico",
  "campo_b",
  "campo_h",
  "constantes_vacio",
];
const CLAVES_JC = ["corriente_conduccion", "densidad_jc", "corriente_ic"];
const CLAVES_JD = [
  "corriente_desplazamiento",
  "densidad_jd",
  "corriente_id",
  "flujo_electrico",
  "constantes_vacio",
];
const CLAVES_POYNTING = ["poynting", "vector_n"];

function calcularDimensionesVisuales(_parametros: ParametrosCapacitor): {
  radio_placa_vis: number;
  separacion_vis: number;
  radio_lazo_vis: number;
  x_lazo: number;
  es_entrehierro: boolean;
} {
  const a = Math.max(_parametros.radio_placa, 1e-6);
  const d = Math.max(_parametros.separacion_placas, 1e-6);
  const radio_placa_vis = THREE.MathUtils.clamp(
    1.28 * Math.pow(a / 0.05, 0.36),
    0.82,
    1.8,
  );
  const separacion_vis = THREE.MathUtils.clamp(
    1.08 * Math.pow(d / 0.01, 0.34),
    0.6,
    1.72,
  );
  const radio_lazo_vis = THREE.MathUtils.clamp(
    (_parametros.radio_lazo / a) * radio_placa_vis,
    0.2,
    3.1,
  );
  const es_entrehierro = _parametros.superficie_activa === "S_entrehierro";
  const x_lazo = es_entrehierro
    ? 0
    : -(separacion_vis * 0.5 + GROSOR_PLACA + 0.92);

  return {
    radio_placa_vis,
    separacion_vis,
    radio_lazo_vis,
    x_lazo,
    es_entrehierro,
  };
}

function construirGeometriaBolsaS2(
  _x_lazo: number,
  _radio_lazo_vis: number,
  _radio_placa_vis: number,
  _separacion_vis: number,
): { malla_geo: THREE.BufferGeometry; lineas_geo: THREE.BufferGeometry } {
  const mitad_d = _separacion_vis * 0.5;
  const radio_sobrepaso = Math.max(
    _radio_lazo_vis + 0.12,
    _radio_placa_vis + 0.28,
  );
  const radio_entrada = Math.max(
    _radio_placa_vis + 0.14,
    _radio_lazo_vis * 0.95,
  );

  // Perfil 2D (radio, x) revolucionado alrededor del eje +X para anclarse exactamente al lazo C.
  const curva_perfil = new THREE.SplineCurve([
    new THREE.Vector2(_radio_lazo_vis, _x_lazo),
    new THREE.Vector2(
      THREE.MathUtils.lerp(_radio_lazo_vis, radio_sobrepaso, 0.72),
      _x_lazo + 0.34,
    ),
    new THREE.Vector2(radio_sobrepaso, -(mitad_d + GROSOR_PLACA * 0.4)),
    new THREE.Vector2(radio_entrada, -mitad_d * 0.35),
    new THREE.Vector2(_radio_placa_vis * 0.62, -0.025),
    new THREE.Vector2(0, 0),
  ]);

  const puntos_perfil = curva_perfil.getPoints(34);
  const malla_geo = new THREE.LatheGeometry(puntos_perfil, 52);
  malla_geo.rotateZ(-Math.PI / 2);
  malla_geo.computeVertexNormals();

  const vertices_lineas: number[] = [];
  const num_meridianos = 8;
  for (let m = 0; m < num_meridianos; m += 1) {
    const phi = (m / num_meridianos) * DOS_PI;
    const cos_p = Math.cos(phi);
    const sin_p = Math.sin(phi);
    for (let k = 0; k < puntos_perfil.length - 1; k += 1) {
      const p0 = puntos_perfil[k];
      const p1 = puntos_perfil[k + 1];
      vertices_lineas.push(
        p0.y,
        p0.x * cos_p,
        p0.x * sin_p,
        p1.y,
        p1.x * cos_p,
        p1.x * sin_p,
      );
    }
  }

  const indices_paralelos = [8, 16, 24, 30];
  const seg_anillo = 48;
  for (const idx of indices_paralelos) {
    const p = puntos_perfil[Math.min(idx, puntos_perfil.length - 1)];
    for (let s = 0; s < seg_anillo; s += 1) {
      const phi0 = (s / seg_anillo) * DOS_PI;
      const phi1 = ((s + 1) / seg_anillo) * DOS_PI;
      vertices_lineas.push(
        p.y,
        p.x * Math.cos(phi0),
        p.x * Math.sin(phi0),
        p.y,
        p.x * Math.cos(phi1),
        p.x * Math.sin(phi1),
      );
    }
  }

  const lineas_geo = new THREE.BufferGeometry();
  lineas_geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices_lineas, 3),
  );

  return { malla_geo, lineas_geo };
}

function construirGeometriaAnillosCampo(
  _radios_vis: readonly number[],
  _posiciones_x: readonly number[],
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const segmentos = 56;
  for (const x_pos of _posiciones_x) {
    for (const r of _radios_vis) {
      if (r <= 0.05) {
        continue;
      }
      for (let i = 0; i < segmentos; i += 1) {
        const a0 = (i / segmentos) * DOS_PI;
        const a1 = ((i + 1) / segmentos) * DOS_PI;
        vertices.push(
          x_pos,
          r * Math.cos(a0),
          r * Math.sin(a0),
          x_pos,
          r * Math.cos(a1),
          r * Math.sin(a1),
        );
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geo;
}

interface InstanciaEscenaCapacitor {
  contexto: ContextoEscenaWebGL;
  aplicarTema: (_tema: TemaLaboratorio) => void;
  desmontar: () => void;
}

function montarEscenaCapacitor(
  _contenedor: HTMLDivElement,
  _estado_ref: { current: EstadoVivoCapacitor },
): InstanciaEscenaCapacitor | null {
  const contexto = crearContextoEscenaWebGL(
    _contenedor,
    PRESETS_CAMARA_CAPACITOR.perspectiva,
    {
      tamano_rejilla: 12,
      altura_rejilla: -2.35,
      longitud_ejes: 1.2,
      origen_ejes: new THREE.Vector3(-4.1, -2.32, -3.1),
    },
  );
  if (!contexto) {
    return null;
  }
  const { escena, camara, renderizador, controles } = contexto;

  const material_placa = new THREE.MeshStandardMaterial({
      color: "#94a3b8",
      metalness: 0.78,
      roughness: 0.26,
    });
    const material_borde_placa = new THREE.MeshStandardMaterial({
      color: "#cbd5e1",
      emissive: "#38bdf8",
      emissiveIntensity: 0.12,
      metalness: 0.82,
      roughness: 0.22,
    });
    const material_cable = new THREE.MeshStandardMaterial({
      color: "#d97706",
      emissive: "#92400e",
      emissiveIntensity: 0.16,
      metalness: 0.72,
      roughness: 0.3,
    });
    const material_dielectrico = new THREE.MeshStandardMaterial({
      color: COLOR_DIELECTRICO_NORMAL.clone(),
      emissive: "#0ea5e9",
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.14,
      roughness: 0.25,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const placa_izq = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, GROSOR_PLACA, 56),
      material_placa,
    );
    placa_izq.rotation.z = Math.PI / 2;

    const placa_der = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, GROSOR_PLACA, 56),
      material_placa,
    );
    placa_der.rotation.z = Math.PI / 2;

    const aro_placa_izq = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.022, 12, 56),
      material_borde_placa,
    );
    aro_placa_izq.rotation.y = Math.PI / 2;

    const aro_placa_der = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.022, 12, 56),
      material_borde_placa,
    );
    aro_placa_der.rotation.y = Math.PI / 2;

    const cable_izq = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIO_CABLE_VISUAL, RADIO_CABLE_VISUAL, 1, 20),
      material_cable,
    );
    cable_izq.rotation.z = Math.PI / 2;

    const cable_der = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIO_CABLE_VISUAL, RADIO_CABLE_VISUAL, 1, 20),
      material_cable,
    );
    cable_der.rotation.z = Math.PI / 2;

    const bloque_dielectrico = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 48, 1, false),
      material_dielectrico,
    );
    bloque_dielectrico.rotation.z = Math.PI / 2;
    bloque_dielectrico.renderOrder = 2;

    const material_aro_nodal = new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const aro_nodal_bessel = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.015, 10, 56),
      material_aro_nodal,
    );
    aro_nodal_bessel.rotation.y = Math.PI / 2;
    aro_nodal_bessel.visible = false;

    const material_aro_ruptura = new THREE.MeshBasicMaterial({
      color: "#ef4444",
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const aro_ruptura = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.028, 12, 56),
      material_aro_ruptura,
    );
    aro_ruptura.rotation.y = Math.PI / 2;
    aro_ruptura.visible = false;

    escena.add(
      placa_izq,
      placa_der,
      aro_placa_izq,
      aro_placa_der,
      cable_izq,
      cable_der,
      bloque_dielectrico,
      aro_nodal_bessel,
      aro_ruptura,
    );

    const grupo_lazo_superficies = new THREE.Group();
    const material_lazo = new THREE.MeshStandardMaterial({
      color: COLORES_VECTORES.lazo,
      emissive: COLORES_VECTORES.lazo,
      emissiveIntensity: 0.58,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.96,
    });
    const malla_lazo_c = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.026, 14, 64),
      material_lazo,
    );
    malla_lazo_c.rotation.y = Math.PI / 2;

    const material_s1 = new THREE.MeshPhysicalMaterial({
      color: "#14b8a6",
      emissive: "#0d9488",
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.22,
      roughness: 0.3,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const malla_s1 = new THREE.Mesh(
      new THREE.CircleGeometry(1, 56),
      material_s1,
    );
    malla_s1.rotation.y = Math.PI / 2;
    malla_s1.renderOrder = 4;

    const material_cruce_s1 = new THREE.MeshBasicMaterial({
      color: COLORES_VECTORES.s1,
      transparent: true,
      opacity: 0.9,
    });
    const aro_cruce_s1 = new THREE.Mesh(
      new THREE.TorusGeometry(RADIO_CABLE_VISUAL * 1.65, 0.014, 10, 32),
      material_cruce_s1,
    );
    aro_cruce_s1.rotation.y = Math.PI / 2;

    const material_s2 = new THREE.MeshPhysicalMaterial({
      color: COLOR_S2_NORMAL.clone(),
      emissive: COLOR_S2_NORMAL.clone(),
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: 0.2,
      roughness: 0.28,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const malla_s2 = new THREE.Mesh(new THREE.BufferGeometry(), material_s2);
    malla_s2.renderOrder = 5;

    const material_lineas_s2 = new THREE.LineBasicMaterial({
      color: "#d8b4fe",
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const lineas_s2 = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      material_lineas_s2,
    );
    lineas_s2.renderOrder = 6;

    const pool_flechas_lazo = crearPoolFlechasInstanciadas(
      12,
      COLORES_VECTORES.lazo,
      {
        radio_tallo: 0.018,
        radio_punta: 0.055,
        intensidad_emisiva: 0.62,
      },
    );

    grupo_lazo_superficies.add(
      malla_lazo_c,
      malla_s1,
      aro_cruce_s1,
      malla_s2,
      lineas_s2,
      pool_flechas_lazo.grupo,
    );
    escena.add(grupo_lazo_superficies);

    const material_anillos_bh = new THREE.LineBasicMaterial({
      color: COLORES_VECTORES.b,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const anillos_bh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      material_anillos_bh,
    );
    escena.add(anillos_bh);

    const pool_e = crearPoolFlechasInstanciadas(40, COLORES_VECTORES.e, {
      radio_tallo: 0.02,
      radio_punta: 0.056,
      usar_colores_instancia: true,
    });
    const pool_d = crearPoolFlechasInstanciadas(28, COLORES_VECTORES.d, {
      radio_tallo: 0.016,
      radio_punta: 0.048,
      opacidad: 0.82,
    });
    const pool_bh = crearPoolFlechasInstanciadas(64, COLORES_VECTORES.b, {
      radio_tallo: 0.02,
      radio_punta: 0.058,
    });
    const pool_jc = crearPoolFlechasInstanciadas(36, COLORES_VECTORES.jc, {
      radio_tallo: 0.024,
      radio_punta: 0.066,
    });
    const pool_jd = crearPoolFlechasInstanciadas(36, COLORES_VECTORES.jd, {
      radio_tallo: 0.022,
      radio_punta: 0.062,
    });
    const pool_poynting = crearPoolFlechasInstanciadas(18, COLORES_VECTORES.n, {
      radio_tallo: 0.024,
      radio_punta: 0.068,
      intensidad_emisiva: 0.5,
    });
    const pool_particulas_cable = crearPoolEsferasInstanciadas(
      32,
      COLORES_VECTORES.jc,
      { intensidad_emisiva: 0.72 },
    );
    const pool_cargas_placas = crearPoolEsferasInstanciadas(80, "#ffffff", {
      intensidad_emisiva: 0.65,
      usar_colores_instancia: true,
    });

    escena.add(
      pool_e.grupo,
      pool_d.grupo,
      pool_bh.grupo,
      pool_jc.grupo,
      pool_jd.grupo,
      pool_poynting.grupo,
      pool_particulas_cable.malla,
      pool_cargas_placas.malla,
    );

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
    const etiqueta_jc = crearEtiquetaSprite({
      texto: "J",
      subindice: "c",
      es_vector: true,
      color_texto: COLORES_VECTORES.jc,
      escala_mundo: 0.34,
    });
    const etiqueta_jd = crearEtiquetaSprite({
      texto: "J",
      subindice: "d",
      es_vector: true,
      color_texto: COLORES_VECTORES.jd,
      escala_mundo: 0.34,
    });
    const etiqueta_n = crearEtiquetaSprite({
      texto: "N",
      es_vector: true,
      color_texto: COLORES_VECTORES.n,
      escala_mundo: 0.34,
    });
    const etiqueta_c = crearEtiquetaSprite({
      texto: "C",
      color_texto: COLORES_VECTORES.lazo,
      escala_mundo: 0.32,
    });
    const etiqueta_s1 = crearEtiquetaSprite({
      texto: "S",
      subindice: "1",
      color_texto: "#2dd4bf",
      escala_mundo: 0.32,
    });
    const etiqueta_s2 = crearEtiquetaSprite({
      texto: "S",
      subindice: "2",
      color_texto: "#c084fc",
      escala_mundo: 0.32,
    });

    const todas_etiquetas = [
      etiqueta_e,
      etiqueta_bh,
      etiqueta_jc,
      etiqueta_jd,
      etiqueta_n,
      etiqueta_c,
      etiqueta_s1,
      etiqueta_s2,
    ];
    for (const etq of todas_etiquetas) {
      escena.add(etq.sprite);
    }

    let firma_geometria_previa = "";
    let tiempo_anterior_ms = performance.now();
    let pulso_interno = 0;
    let id_animacion = 0;

    const actualizarGeometriaEstructural = (
      _param: ParametrosCapacitor,
    ): ReturnType<typeof calcularDimensionesVisuales> => {
      const dim = calcularDimensionesVisuales(_param);
      const firma = `${dim.radio_placa_vis.toFixed(3)}|${dim.separacion_vis.toFixed(3)}|${dim.radio_lazo_vis.toFixed(3)}|${dim.es_entrehierro ? 1 : 0}`;
      if (firma === firma_geometria_previa) {
        return dim;
      }
      firma_geometria_previa = firma;

      const mitad_d = dim.separacion_vis * 0.5;
      const x_placa = mitad_d + GROSOR_PLACA * 0.5;
      const inicio_cable = mitad_d + GROSOR_PLACA;
      const largo_cable = Math.max(0.4, EXTREMIDAD_CABLE_X - inicio_cable);
      const x_centro_cable = inicio_cable + largo_cable * 0.5;

      placa_izq.scale.set(dim.radio_placa_vis, 1, dim.radio_placa_vis);
      placa_izq.position.x = -x_placa;
      placa_der.scale.set(dim.radio_placa_vis, 1, dim.radio_placa_vis);
      placa_der.position.x = x_placa;

      const geo_aro_placa = new THREE.TorusGeometry(
        dim.radio_placa_vis,
        0.02,
        12,
        56,
      );
      aro_placa_izq.geometry.dispose();
      aro_placa_izq.geometry = geo_aro_placa;
      aro_placa_izq.position.x = -mitad_d;
      aro_placa_der.geometry.dispose();
      aro_placa_der.geometry = geo_aro_placa.clone();
      aro_placa_der.position.x = mitad_d;

      cable_izq.scale.set(1, largo_cable, 1);
      cable_izq.position.x = -x_centro_cable;
      cable_der.scale.set(1, largo_cable, 1);
      cable_der.position.x = x_centro_cable;

      bloque_dielectrico.scale.set(
        dim.radio_placa_vis * 0.995,
        Math.max(0.05, dim.separacion_vis - 0.02),
        dim.radio_placa_vis * 0.995,
      );

      aro_ruptura.geometry.dispose();
      aro_ruptura.geometry = new THREE.TorusGeometry(
        dim.radio_placa_vis * 1.03,
        0.028,
        12,
        56,
      );

      malla_lazo_c.geometry.dispose();
      malla_lazo_c.geometry = new THREE.TorusGeometry(
        dim.radio_lazo_vis,
        0.028,
        14,
        64,
      );
      malla_lazo_c.position.x = dim.x_lazo;

      malla_s1.scale.setScalar(dim.radio_lazo_vis);
      malla_s1.position.x = dim.x_lazo;
      aro_cruce_s1.position.x = dim.x_lazo;

      const { malla_geo, lineas_geo } = construirGeometriaBolsaS2(
        dim.x_lazo,
        dim.radio_lazo_vis,
        dim.radio_placa_vis,
        dim.separacion_vis,
      );
      malla_s2.geometry.dispose();
      malla_s2.geometry = malla_geo;
      lineas_s2.geometry.dispose();
      lineas_s2.geometry = lineas_geo;

      const radios_anillos = [
        dim.radio_placa_vis * 0.42,
        dim.radio_placa_vis * 0.85,
        dim.radio_placa_vis * 1.38,
      ];
      const nueva_geo_anillos = construirGeometriaAnillosCampo(
        radios_anillos,
        [0, -(mitad_d + GROSOR_PLACA + 1.5)],
      );
      anillos_bh.geometry.dispose();
      anillos_bh.geometry = nueva_geo_anillos;

      return dim;
    };

    const bucle = (_ahora_ms: number): void => {
      id_animacion = requestAnimationFrame(bucle);
      const delta_s = Math.min((_ahora_ms - tiempo_anterior_ms) / 1000, 0.1);
      tiempo_anterior_ms = _ahora_ms;
      pulso_interno += delta_s;

      const {
        parametros: param,
        instantanea: inst,
        capas_visibles: capas,
        fase_animacion: fase,
        termino_resaltado: resaltado,
      } = _estado_ref.current;

      const dim = actualizarGeometriaEstructural(param);
      const a_fis = Math.max(param.radio_placa, 1e-6);
      const d_fis = Math.max(param.separacion_placas, 1e-6);
      const mitad_d = dim.separacion_vis * 0.5;

      contexto.grupo_referencia.visible = capas.mostrar_rejilla_y_ejes;

      // Escalas fisicas de referencia para normalizar longitudes preservando proporciones exactas.
      const e_ref = Math.max(inst.campo_electrico_maximo, 1e-9);
      const omega = DOS_PI * Math.max(param.frecuencia, 1e-3);
      const epsilon = PERMITIVIDAD_VACIO * Math.max(param.permitividad_relativa, 1);
      const area_fis = Math.PI * a_fis * a_fis;

      let i_ref = 1e-9;
      let jd_ref = 1e-9;
      let h_ref = 1e-9;
      if (param.modo === "transitorio_rc") {
        i_ref = Math.max(
          Math.abs(param.tension_pico) / Math.max(param.resistencia_ohm, 1e-3),
          1e-9,
        );
        jd_ref = i_ref / area_fis;
        h_ref = i_ref / (DOS_PI * a_fis);
      } else if (param.modo === "ac_cuasiestatico") {
        const i_c_pico = inst.conductancia * Math.abs(param.tension_pico);
        const i_d_pico = omega * inst.capacitancia * Math.abs(param.tension_pico);
        i_ref = Math.max(Math.hypot(i_c_pico, i_d_pico), 1e-9);
        jd_ref = Math.max(omega * epsilon * e_ref, 1e-9);
        h_ref = i_ref / (DOS_PI * a_fis);
      } else {
        const j1_borde = Math.max(
          Math.abs(evaluarBesselJ1(inst.argumento_bessel_borde)),
          0.18,
        );
        i_ref = Math.max(
          DOS_PI * a_fis * (e_ref / inst.impedancia_medio) * j1_borde,
          1e-9,
        );
        jd_ref = Math.max(omega * epsilon * e_ref, 1e-9);
        h_ref = Math.max((e_ref / inst.impedancia_medio) * 0.582, 1e-9);
      }

      const res_e = calcularFactorResaltado(resaltado, CLAVES_E);
      const res_bh = calcularFactorResaltado(resaltado, CLAVES_BH);
      const res_jc = calcularFactorResaltado(resaltado, CLAVES_JC);
      const res_jd = calcularFactorResaltado(resaltado, CLAVES_JD);
      const res_n = calcularFactorResaltado(resaltado, CLAVES_POYNTING);

      // Bloque dielectrico: opacidad segun permitividad relativa + pulso rojo en ruptura.
      if (inst.hay_ruptura_dielectrica) {
        const pulso_alerta = 0.5 + 0.5 * Math.sin(pulso_interno * 8.5);
        material_dielectrico.color.copy(COLOR_DIELECTRICO_RUPTURA);
        material_dielectrico.emissive.set("#ef4444");
        material_dielectrico.emissiveIntensity = 0.45 + 0.65 * pulso_alerta;
        material_dielectrico.opacity = 0.24 + 0.16 * pulso_alerta;
        aro_ruptura.visible = true;
        material_aro_ruptura.opacity = 0.45 + 0.5 * pulso_alerta;
      } else {
        const factor_eps = Math.min(
          1,
          Math.log10(Math.max(1, param.permitividad_relativa)) / 3.2,
        );
        material_dielectrico.color
          .copy(COLOR_DIELECTRICO_NORMAL)
          .lerp(COLOR_DIELECTRICO_ALTO_EPS, factor_eps * 0.55);
        material_dielectrico.emissive.set("#0ea5e9");
        material_dielectrico.emissiveIntensity = 0.06 + factor_eps * 0.14;
        material_dielectrico.opacity = 0.08 + factor_eps * 0.18;
        aro_ruptura.visible = false;
      }

      // Anillo nodal de Bessel (primer cero de J₀ dentro del capacitor).
      if (
        param.modo === "alta_frecuencia_bessel" &&
        inst.numero_onda_k > 1e-9 &&
        CEROS_BESSEL_J0[0] / inst.numero_onda_k < a_fis
      ) {
        const radio_nodal_vis =
          (CEROS_BESSEL_J0[0] / inst.numero_onda_k / a_fis) *
          dim.radio_placa_vis;
        aro_nodal_bessel.visible = capas.mostrar_e || capas.mostrar_jd;
        aro_nodal_bessel.scale.setScalar(radio_nodal_vis);
      } else {
        aro_nodal_bessel.visible = false;
      }

      // Lazo amperiano C y superficies S₁ / S₂ / S_entrehierro.
      grupo_lazo_superficies.visible = capas.mostrar_lazo_y_superficie;
      if (capas.mostrar_lazo_y_superficie) {
        const mostrar_s1 =
          param.superficie_activa === "S1" ||
          param.superficie_activa === "ambas" ||
          param.superficie_activa === "S_entrehierro";
        const mostrar_s2 =
          param.superficie_activa === "S2" ||
          param.superficie_activa === "ambas";

        malla_s1.visible = mostrar_s1;
        aro_cruce_s1.visible = mostrar_s1 && !dim.es_entrehierro;
        malla_s2.visible = mostrar_s2;
        lineas_s2.visible = mostrar_s2;

        material_lazo.opacity = 0.96 * res_bh.factor_opacidad;
        material_lazo.emissiveIntensity = res_bh.esta_enfatizado ? 0.95 : 0.52;

        if (dim.es_entrehierro) {
          material_s1.color.set("#38bdf8");
          material_s1.emissive.set("#0284c7");
          material_s1.opacity = 0.18 * res_jd.factor_opacidad;
        } else {
          material_s1.color.set("#14b8a6");
          material_s1.emissive.set("#0d9488");
          material_s1.opacity =
            (res_jc.esta_enfatizado ? 0.34 : 0.2) * res_jc.factor_opacidad;
        }

        if (inst.hay_paradoja) {
          const pulso_paradoja = 0.5 + 0.5 * Math.sin(pulso_interno * 6.5);
          material_s2.color.copy(COLOR_S2_PARADOJA);
          material_s2.emissive.copy(COLOR_S2_PARADOJA);
          material_s2.emissiveIntensity = 0.35 + 0.45 * pulso_paradoja;
          material_s2.opacity = 0.2 + 0.12 * pulso_paradoja;
          material_lineas_s2.color.set("#fda4af");
          material_lineas_s2.opacity = 0.5;
        } else {
          material_s2.color.copy(COLOR_S2_NORMAL);
          material_s2.emissive.copy(COLOR_S2_NORMAL);
          material_s2.emissiveIntensity = res_jd.esta_enfatizado ? 0.52 : 0.22;
          material_s2.opacity =
            (res_jd.esta_enfatizado ? 0.3 : 0.18) * res_jd.factor_opacidad;
          material_lineas_s2.color.set("#d8b4fe");
          material_lineas_s2.opacity = 0.34 * res_jd.factor_opacidad;
        }

        const flechas_lazo: TransformacionFlecha[] = [];
        const num_flechas_lazo = 8;
        const largo_flecha_lazo = THREE.MathUtils.clamp(
          dim.radio_lazo_vis * 0.28,
          0.16,
          0.34,
        );
        for (let i = 0; i < num_flechas_lazo; i += 1) {
          const phi = (i / num_flechas_lazo) * DOS_PI + 0.2;
          const pos_m = cilindricoAMundo(
            MARCO_EJE_HORIZONTAL,
            dim.radio_lazo_vis,
            phi,
            dim.x_lazo,
          );
          const tan_m = campoCilindricoAMundo(
            MARCO_EJE_HORIZONTAL,
            phi,
            0,
            1,
            0,
          );
          flechas_lazo.push({
            origen: new THREE.Vector3(pos_m.x, pos_m.y, pos_m.z),
            direccion: new THREE.Vector3(tan_m.x, tan_m.y, tan_m.z),
            longitud: largo_flecha_lazo,
            grosor: res_bh.factor_escala,
          });
        }
        pool_flechas_lazo.definirEstilo(
          0.95 * res_bh.factor_opacidad,
          res_bh.esta_enfatizado ? 0.9 : 0.55,
        );
        pool_flechas_lazo.actualizar(flechas_lazo);

        etiqueta_c.sprite.visible = true;
        etiqueta_c.sprite.position.set(
          dim.x_lazo,
          dim.radio_lazo_vis + 0.28,
          0.15,
        );
        etiqueta_c.actualizarOpacidad(res_bh.factor_opacidad);

        etiqueta_s1.sprite.visible = mostrar_s1;
        etiqueta_s1.actualizarTexto("S", dim.es_entrehierro ? "g" : "1");
        etiqueta_s1.sprite.position.set(
          dim.x_lazo,
          -dim.radio_lazo_vis * 0.58,
          dim.radio_lazo_vis * 0.58,
        );
        etiqueta_s1.actualizarOpacidad(
          dim.es_entrehierro ? res_jd.factor_opacidad : res_jc.factor_opacidad,
        );

        etiqueta_s2.sprite.visible = mostrar_s2;
        etiqueta_s2.sprite.position.set(
          -(mitad_d + 0.35),
          Math.max(dim.radio_lazo_vis, dim.radio_placa_vis) + 0.52,
          0.2,
        );
        etiqueta_s2.actualizarOpacidad(res_jd.factor_opacidad);
      } else {
        etiqueta_c.sprite.visible = false;
        etiqueta_s1.sprite.visible = false;
        etiqueta_s2.sprite.visible = false;
      }

      // Campo electrico E (con modulacion radial Bessel J₀ e inversion de sentido).
      const flechas_e: TransformacionFlecha[] = [];
      if (capas.mostrar_e) {
        const anillos_e: ReadonlyArray<{ frac_r: number; cantidad: number }> = [
          { frac_r: 0, cantidad: 1 },
          { frac_r: 0.34, cantidad: 6 },
          { frac_r: 0.64, cantidad: 8 },
          { frac_r: 0.88, cantidad: 12 },
        ];
        const largo_max_e = dim.separacion_vis * 0.8;
        for (const anillo of anillos_e) {
          const punto = inst.evaluarEnRadio(anillo.frac_r * a_fis);
          const frac_e = punto.campo_e_z / e_ref;
          const largo = Math.abs(frac_e) * largo_max_e;
          if (largo < 0.03) {
            continue;
          }
          const signo = frac_e >= 0 ? 1 : -1;
          const color_inst =
            signo >= 0 ? COLOR_FLECHA_E_POS : COLOR_FLECHA_E_INV;
          const r_vis = anillo.frac_r * dim.radio_placa_vis;
          for (let j = 0; j < anillo.cantidad; j += 1) {
            const phi = (j / anillo.cantidad) * DOS_PI;
            const pos_base = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_vis,
              phi,
              -signo * largo * 0.5,
            );
            flechas_e.push({
              origen: new THREE.Vector3(pos_base.x, pos_base.y, pos_base.z),
              direccion: new THREE.Vector3(signo, 0, 0),
              longitud: largo,
              grosor: res_e.factor_escala,
              color: color_inst,
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
      etiqueta_e.sprite.visible = capas.mostrar_e && flechas_e.length > 0;
      etiqueta_e.sprite.position.set(0, dim.radio_placa_vis * 0.56, 0.32);
      etiqueta_e.actualizarOpacidad(res_e.factor_opacidad);

      // Vector de desplazamiento D (escalado suavemente con permitividad relativa).
      const flechas_d: TransformacionFlecha[] = [];
      if (capas.mostrar_d) {
        const factor_escala_eps =
          0.62 +
          0.38 *
            Math.min(
              1,
              Math.log10(Math.max(1, param.permitividad_relativa)) / 3.3,
            );
        const largo_max_d = dim.separacion_vis * 0.84 * factor_escala_eps;
        const anillos_d: ReadonlyArray<{ frac_r: number; cantidad: number }> = [
          { frac_r: 0.45, cantidad: 6 },
          { frac_r: 0.78, cantidad: 10 },
        ];
        for (const anillo of anillos_d) {
          const punto = inst.evaluarEnRadio(anillo.frac_r * a_fis);
          const frac_d = punto.desplazamiento_d_z / (epsilon * e_ref);
          const largo = Math.abs(frac_d) * largo_max_d;
          if (largo < 0.03) {
            continue;
          }
          const signo = frac_d >= 0 ? 1 : -1;
          const r_vis = anillo.frac_r * dim.radio_placa_vis;
          for (let j = 0; j < anillo.cantidad; j += 1) {
            const phi = (j / anillo.cantidad) * DOS_PI + Math.PI / anillo.cantidad;
            const pos_base = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_vis,
              phi,
              -signo * largo * 0.5,
            );
            flechas_d.push({
              origen: new THREE.Vector3(pos_base.x, pos_base.y, pos_base.z),
              direccion: new THREE.Vector3(signo, 0, 0),
              longitud: largo,
              grosor: res_e.factor_escala,
            });
          }
        }
      }
      pool_d.grupo.visible = capas.mostrar_d;
      pool_d.definirEstilo(
        0.84 * res_e.factor_opacidad,
        res_e.intensidad_emisiva,
      );
      pool_d.actualizar(flechas_d);

      // Densidad de corriente de desplazamiento J_d = ∂D/∂t (desaparece sin termino de Maxwell).
      const flechas_jd: TransformacionFlecha[] = [];
      if (capas.mostrar_jd && param.incluir_maxwell) {
        const largo_max_jd = dim.separacion_vis * 0.78;
        const anillos_jd: ReadonlyArray<{ frac_r: number; cantidad: number }> = [
          { frac_r: 0.22, cantidad: 4 },
          { frac_r: 0.52, cantidad: 8 },
          { frac_r: 0.82, cantidad: 10 },
        ];
        for (const anillo of anillos_jd) {
          const punto = inst.evaluarEnRadio(anillo.frac_r * a_fis);
          const frac_jd = punto.densidad_jd_z / jd_ref;
          const largo = Math.min(1.05, Math.abs(frac_jd)) * largo_max_jd;
          if (largo < 0.03) {
            continue;
          }
          const signo = frac_jd >= 0 ? 1 : -1;
          const r_vis = anillo.frac_r * dim.radio_placa_vis;
          for (let j = 0; j < anillo.cantidad; j += 1) {
            const phi = (j / anillo.cantidad) * DOS_PI + 0.35;
            const pos_base = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_vis,
              phi,
              -signo * largo * 0.5,
            );
            flechas_jd.push({
              origen: new THREE.Vector3(pos_base.x, pos_base.y, pos_base.z),
              direccion: new THREE.Vector3(signo, 0, 0),
              longitud: largo,
              grosor: res_jd.factor_escala,
            });
          }
        }
      }
      pool_jd.grupo.visible = capas.mostrar_jd && param.incluir_maxwell;
      pool_jd.definirEstilo(
        0.92 * res_jd.factor_opacidad,
        res_jd.intensidad_emisiva,
      );
      pool_jd.actualizar(flechas_jd);
      etiqueta_jd.sprite.visible =
        capas.mostrar_jd && param.incluir_maxwell && flechas_jd.length > 0;
      etiqueta_jd.sprite.position.set(0, -dim.radio_placa_vis * 0.58, 0.35);
      etiqueta_jd.actualizarOpacidad(res_jd.factor_opacidad);

      // Densidad de corriente de conduccion J_c (en cables y dentro del dielectrico si σ > 0).
      const flechas_jc: TransformacionFlecha[] = [];
      if (capas.mostrar_jc) {
        const frac_i = THREE.MathUtils.clamp(inst.corriente_cable / i_ref, -1.2, 1.2);
        const largo_cable = Math.abs(frac_i) * 0.58;
        if (largo_cable >= 0.03) {
          const signo_i = frac_i >= 0 ? 1 : -1;
          const inicio_cable = mitad_d + GROSOR_PLACA + 0.35;
          const posiciones_x_cable = [
            -(inicio_cable + 1.55),
            -(inicio_cable + 0.55),
            inicio_cable + 0.55,
            inicio_cable + 1.55,
          ];
          for (const x_c of posiciones_x_cable) {
            flechas_jc.push({
              origen: new THREE.Vector3(
                x_c - signo_i * largo_cable * 0.5,
                RADIO_CABLE_VISUAL + 0.14,
                0,
              ),
              direccion: new THREE.Vector3(signo_i, 0, 0),
              longitud: largo_cable,
              grosor: res_jc.factor_escala,
            });
          }
        }

        if (param.conductividad_s_m > 0 && Math.abs(inst.densidad_jc_eje) > 1e-12) {
          const escala_compartida = Math.max(
            jd_ref,
            param.conductividad_s_m * e_ref,
            1e-9,
          );
          const frac_jc_entrehierro = inst.densidad_jc_eje / escala_compartida;
          const largo_entrehierro =
            Math.min(1.05, Math.abs(frac_jc_entrehierro)) *
            dim.separacion_vis *
            0.78;
          if (largo_entrehierro >= 0.03) {
            const signo_entrehierro = frac_jc_entrehierro >= 0 ? 1 : -1;
            const r_vis = dim.radio_placa_vis * 0.44;
            for (let j = 0; j < 6; j += 1) {
              const phi = (j / 6) * DOS_PI + 0.18;
              const pos_base = cilindricoAMundo(
                MARCO_EJE_HORIZONTAL,
                r_vis,
                phi,
                -signo_entrehierro * largo_entrehierro * 0.5,
              );
              flechas_jc.push({
                origen: new THREE.Vector3(pos_base.x, pos_base.y, pos_base.z),
                direccion: new THREE.Vector3(signo_entrehierro, 0, 0),
                longitud: largo_entrehierro,
                grosor: res_jc.factor_escala,
              });
            }
          }
        }
      }
      pool_jc.grupo.visible = capas.mostrar_jc;
      pool_jc.definirEstilo(
        0.95 * res_jc.factor_opacidad,
        res_jc.intensidad_emisiva,
      );
      pool_jc.actualizar(flechas_jc);
      etiqueta_jc.sprite.visible = capas.mostrar_jc && flechas_jc.length > 0;
      etiqueta_jc.sprite.position.set(
        -(mitad_d + GROSOR_PLACA + 1.55),
        0.48,
        0.1,
      );
      etiqueta_jc.actualizarOpacidad(res_jc.factor_opacidad);

      // Campo magnetico B / H: anillos concentricos y flechas azimutales.
      const flechas_bh: TransformacionFlecha[] = [];
      if (capas.mostrar_b_h) {
        const niveles_radiales: ReadonlyArray<{
          frac_a: number;
          x_pos: number;
          cantidad: number;
        }> = [
          { frac_a: 0.42, x_pos: 0, cantidad: 6 },
          { frac_a: 0.85, x_pos: 0, cantidad: 10 },
          { frac_a: 1.38, x_pos: 0, cantidad: 10 },
          {
            frac_a: 0.85,
            x_pos: -(mitad_d + GROSOR_PLACA + 1.5),
            cantidad: 8,
          },
        ];

        for (const nivel of niveles_radiales) {
          const r_fis = nivel.frac_a * a_fis;
          const r_vis = nivel.frac_a * dim.radio_placa_vis;
          const es_zona_cable = nivel.x_pos < -mitad_d;
          const h_val = es_zona_cable
            ? inst.corriente_cable / (DOS_PI * r_fis)
            : inst.evaluarEnRadio(r_fis).campo_h_phi;
          const frac_h = h_val / h_ref;
          const largo = THREE.MathUtils.clamp(Math.abs(frac_h) * 0.44, 0, 0.56);
          if (largo < 0.03) {
            continue;
          }
          const signo_h = frac_h >= 0 ? 1 : -1;
          for (let j = 0; j < nivel.cantidad; j += 1) {
            const phi = (j / nivel.cantidad) * DOS_PI;
            const pos_m = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_vis,
              phi,
              nivel.x_pos,
            );
            const tan_m = campoCilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              phi,
              0,
              signo_h,
              0,
            );
            flechas_bh.push({
              origen: new THREE.Vector3(
                pos_m.x - tan_m.x * largo * 0.5,
                pos_m.y - tan_m.y * largo * 0.5,
                pos_m.z - tan_m.z * largo * 0.5,
              ),
              direccion: new THREE.Vector3(tan_m.x, tan_m.y, tan_m.z),
              longitud: largo,
              grosor: res_bh.factor_escala,
            });
          }
        }
      }
      anillos_bh.visible = capas.mostrar_b_h && flechas_bh.length > 0;
      material_anillos_bh.opacity = 0.34 * res_bh.factor_opacidad;
      pool_bh.grupo.visible = capas.mostrar_b_h;
      pool_bh.definirEstilo(
        0.92 * res_bh.factor_opacidad,
        res_bh.intensidad_emisiva,
      );
      pool_bh.actualizar(flechas_bh);
      etiqueta_bh.sprite.visible = capas.mostrar_b_h && flechas_bh.length > 0;
      etiqueta_bh.sprite.position.set(
        0.2,
        dim.radio_placa_vis * 1.48,
        0.25,
      );
      etiqueta_bh.actualizarOpacidad(res_bh.factor_opacidad);

      // Vector de Poynting N = E x H entrando/saliendo radialmente por el borde lateral.
      const flechas_n: TransformacionFlecha[] = [];
      if (capas.mostrar_poynting) {
        const n_ref = Math.max(e_ref * h_ref, 1e-12);
        const n_borde = inst.poynting_borde;
        const mag_norm = Math.pow(
          Math.min(1.25, Math.abs(n_borde) / n_ref),
          0.62,
        );
        const largo_n = mag_norm * 0.68;
        if (largo_n >= 0.04) {
          const signo_radial = n_borde >= 0 ? 1 : -1;
          const desplazamiento_flujo = ((fase * 0.14) % 1) * 0.14;
          const num_poynting = 12;
          for (let j = 0; j < num_poynting; j += 1) {
            const phi = (j / num_poynting) * DOS_PI + 0.12;
            const r_base =
              signo_radial < 0
                ? dim.radio_placa_vis + largo_n + 0.18 - desplazamiento_flujo
                : dim.radio_placa_vis + 0.06 + desplazamiento_flujo;
            const pos_m = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_base,
              phi,
              0,
            );
            const dir_m = campoCilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              phi,
              signo_radial,
              0,
              0,
            );
            flechas_n.push({
              origen: new THREE.Vector3(pos_m.x, pos_m.y, pos_m.z),
              direccion: new THREE.Vector3(dir_m.x, dir_m.y, dir_m.z),
              longitud: largo_n,
              grosor: res_n.factor_escala,
            });
          }
        }
      }
      pool_poynting.grupo.visible = capas.mostrar_poynting;
      pool_poynting.definirEstilo(
        0.95 * res_n.factor_opacidad,
        res_n.intensidad_emisiva,
      );
      pool_poynting.actualizar(flechas_n);
      etiqueta_n.sprite.visible =
        capas.mostrar_poynting && flechas_n.length > 0;
      etiqueta_n.sprite.position.set(
        0.15,
        -(dim.radio_placa_vis + 0.72),
        0.2,
      );
      etiqueta_n.actualizarOpacidad(res_n.factor_opacidad);

      // Particulas animadas de corriente en cables y cargas superficiales ± en las placas.
      const particulas_cable: InstanciaEsfera[] = [];
      const cargas_placas: InstanciaEsfera[] = [];
      if (capas.mostrar_cargas) {
        const frac_i = THREE.MathUtils.clamp(inst.corriente_cable / i_ref, -1, 1);
        const inicio_cable = mitad_d + GROSOR_PLACA + 0.06;
        const largo_tramo = Math.max(0.3, EXTREMIDAD_CABLE_X - inicio_cable);
        const signo_flujo = frac_i >= 0 ? 1 : -1;
        const rapidez = 0.25 + 0.75 * Math.abs(frac_i);
        const desplazamiento = (fase * 0.22 * rapidez) % 1;
        const num_por_cable = 10;
        const radio_particula =
          Math.abs(frac_i) > 0.02
            ? 0.042 + 0.024 * Math.abs(frac_i)
            : 0.028;

        for (let k = 0; k < num_por_cable; k += 1) {
          let u = (k / num_por_cable + signo_flujo * desplazamiento) % 1;
          if (u < 0) {
            u += 1;
          }
          const x_izq = -EXTREMIDAD_CABLE_X + u * largo_tramo;
          const x_der = inicio_cable + u * largo_tramo;
          particulas_cable.push(
            {
              posicion: new THREE.Vector3(x_izq, 0, 0),
              radio: radio_particula,
            },
            {
              posicion: new THREE.Vector3(x_der, 0, 0),
              radio: radio_particula,
            },
          );
        }

        const q_pico = Math.max(
          inst.capacitancia * Math.abs(param.tension_pico),
          1e-18,
        );
        const frac_q_global = THREE.MathUtils.clamp(
          inst.carga_placa / q_pico,
          -1.1,
          1.1,
        );
        const anillos_carga: ReadonlyArray<{ frac_r: number; cantidad: number }> = [
          { frac_r: 0.28, cantidad: 6 },
          { frac_r: 0.62, cantidad: 12 },
          { frac_r: 0.88, cantidad: 16 },
        ];

        for (const anillo of anillos_carga) {
          let densidad_local = frac_q_global;
          if (param.modo === "alta_frecuencia_bessel") {
            const e_local =
              (param.tension_pico / d_fis) *
              evaluarBesselJ0(inst.numero_onda_k * anillo.frac_r * a_fis) *
              Math.cos(param.fase_o_tiempo_norm);
            densidad_local = e_local / e_ref;
          }
          const radio_carga = Math.abs(densidad_local) * 0.056;
          if (radio_carga < 0.008) {
            continue;
          }
          const color_izq =
            densidad_local >= 0 ? COLOR_CARGA_POSITIVA : COLOR_CARGA_NEGATIVA;
          const color_der =
            densidad_local >= 0 ? COLOR_CARGA_NEGATIVA : COLOR_CARGA_POSITIVA;
          const r_vis = anillo.frac_r * dim.radio_placa_vis;

          for (let j = 0; j < anillo.cantidad; j += 1) {
            const phi = (j / anillo.cantidad) * DOS_PI;
            const pos_izq = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_vis,
              phi,
              -(mitad_d - 0.025),
            );
            const pos_der = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_vis,
              phi,
              mitad_d - 0.025,
            );
            cargas_placas.push(
              {
                posicion: new THREE.Vector3(pos_izq.x, pos_izq.y, pos_izq.z),
                radio: radio_carga,
                color: color_izq,
              },
              {
                posicion: new THREE.Vector3(pos_der.x, pos_der.y, pos_der.z),
                radio: radio_carga,
                color: color_der,
              },
            );
          }
        }
      }
      pool_particulas_cable.malla.visible = capas.mostrar_cargas;
      pool_particulas_cable.definirEstilo(
        0.95 * res_jc.factor_opacidad,
        res_jc.esta_enfatizado ? 0.95 : 0.65,
      );
      pool_particulas_cable.actualizar(particulas_cable);

      pool_cargas_placas.malla.visible = capas.mostrar_cargas;
      pool_cargas_placas.definirEstilo(
        0.92 * res_e.factor_opacidad,
        res_e.esta_enfatizado ? 0.85 : 0.52,
      );
      pool_cargas_placas.actualizar(cargas_placas);

      contexto.actualizarTransicionCamara(delta_s);
      controles.update();
      renderizador.render(escena, camara);
    };

    id_animacion = requestAnimationFrame(bucle);

    const desmontar = (): void => {
      cancelAnimationFrame(id_animacion);
      material_placa.dispose();
      material_borde_placa.dispose();
      material_cable.dispose();
      material_dielectrico.dispose();
      material_aro_nodal.dispose();
      material_aro_ruptura.dispose();
      material_lazo.dispose();
      material_s1.dispose();
      material_cruce_s1.dispose();
      material_s2.dispose();
      material_lineas_s2.dispose();
      material_anillos_bh.dispose();
      pool_flechas_lazo.liberar();
      pool_e.liberar();
      pool_d.liberar();
      pool_bh.liberar();
      pool_jc.liberar();
      pool_jd.liberar();
      pool_poynting.liberar();
      pool_particulas_cable.liberar();
      pool_cargas_placas.liberar();
      for (const etq of todas_etiquetas) {
        etq.liberar();
      }
      contexto.liberar();
    };

    const aplicarTema = (_tema: TemaLaboratorio): void => {
      contexto.aplicarTema(_tema);
      const es_claro = _tema === "claro";
      material_lazo.color.set(es_claro ? "#b45309" : COLORES_VECTORES.lazo);
      material_lazo.emissive.set(es_claro ? "#d97706" : COLORES_VECTORES.lazo);
      material_lazo.emissiveIntensity = es_claro ? 0.28 : 0.58;
      material_lineas_s2.color.set(es_claro ? "#7e22ce" : "#d8b4fe");
      material_lineas_s2.opacity = es_claro ? 0.45 : 0.34;
      material_anillos_bh.color.set(es_claro ? "#15803d" : COLORES_VECTORES.b);
      material_anillos_bh.opacity = es_claro ? 0.48 : 0.36;
      material_placa.color.set(es_claro ? "#64748b" : "#94a3b8");
      material_borde_placa.color.set(es_claro ? "#334155" : "#cbd5e1");
      for (const etq of todas_etiquetas) {
        etq.aplicarTema(_tema);
      }
    };

    return { contexto, aplicarTema, desmontar };
}

export function VisorCapacitor3D(_propiedades: PropiedadesVisorCapacitor3D) {
  const {
    parametros,
    instantanea,
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
  const instancia_ref = useRef<InstanciaEscenaCapacitor | null>(null);
  const al_fallar_ref = useRef(alFallarWebGL);
  const estado_ref = useRef<EstadoVivoCapacitor>({
    parametros,
    instantanea,
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
      instantanea,
      capas_visibles,
      fase_animacion,
      en_reproduccion,
      termino_resaltado,
    };
  }, [
    parametros,
    instantanea,
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
      PRESETS_CAMARA_CAPACITOR,
    );
  }, [comando_camara]);

  useEffect(() => {
    const contenedor = contenedor_ref.current;
    if (!contenedor) {
      return;
    }
    const instancia = montarEscenaCapacitor(contenedor, estado_ref);
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
      aria-label="Visor tridimensional interactivo del capacitor de placas paralelas y la paradoja de Ampère-Maxwell"
    />
  );
}
