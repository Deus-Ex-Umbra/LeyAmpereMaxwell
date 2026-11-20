"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTemaLaboratorio, type TemaLaboratorio } from "@/contextos";
import {
  COLORES_VECTORES,
  DOS_PI,
  MARCO_EJE_HORIZONTAL,
  MARCO_EJE_VERTICAL,
  campoCilindricoAMundo,
  cilindricoAMundo,
} from "@/lib/fisica";
import {
  actualizarGeometriaTubo,
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
  ParametrosGeometriaAmpere,
  ResultadoGeometriaAmpere,
  TipoGeometriaAmpere,
} from "@/tipos";
import type { ComandoCamara3D } from "./visor-capacitor-3d";

export interface PropiedadesVisorGeometrias3D {
  parametros: ParametrosGeometriaAmpere;
  resultado: ResultadoGeometriaAmpere;
  capas_visibles: CapasVisibles3D;
  fase_animacion: number;
  en_reproduccion: boolean;
  termino_resaltado?: string | null;
  comando_camara?: ComandoCamara3D;
  alFallarWebGL?: () => void;
}

interface EstadoVivoGeometria {
  parametros: ParametrosGeometriaAmpere;
  resultado: ResultadoGeometriaAmpere;
  capas_visibles: CapasVisibles3D;
  fase_animacion: number;
  en_reproduccion: boolean;
  termino_resaltado: string | null;
}

const PRESETS_CAMARA_HORIZONTAL: Record<
  Exclude<PresetCamaraEscena, "reiniciar">,
  ConfiguracionCamara
> = {
  perspectiva: { posicion: [4.1, 2.5, 4.9], objetivo: [0, 0, 0] },
  axial: { posicion: [6.0, 0.35, 0.35], objetivo: [0, 0, 0] },
  frontal: { posicion: [0, 0.35, 6.2], objetivo: [0, 0, 0] },
};

const PRESETS_CAMARA_TOROIDE: Record<
  Exclude<PresetCamaraEscena, "reiniciar">,
  ConfiguracionCamara
> = {
  perspectiva: { posicion: [4.0, 3.8, 4.4], objetivo: [0, 0, 0] },
  axial: { posicion: [0.05, 6.4, 0.1], objetivo: [0, 0, 0] },
  frontal: { posicion: [0, 0.8, 6.0], objetivo: [0, 0, 0] },
};

const CLAVES_BH = [
  "rotacional_h",
  "circulacion_h",
  "campo_magnetico",
  "campo_b",
  "campo_h",
];
const CLAVES_JC = ["corriente_conduccion", "densidad_jc", "corriente_ic"];

const COLOR_B_NUCLEO = new THREE.Color("#fb7185");
const COLOR_B_EXTERIOR = new THREE.Color(COLORES_VECTORES.b);

function construirPuntosHeliceSolenoide(
  _radio: number,
  _longitud: number,
  _vueltas: number,
): THREE.Vector3[] {
  const muestras_por_vuelta = 18;
  const total = _vueltas * muestras_por_vuelta;
  const puntos: THREE.Vector3[] = [];
  for (let i = 0; i <= total; i += 1) {
    const u = i / total;
    const x = -_longitud * 0.5 + u * _longitud;
    const phi = u * _vueltas * DOS_PI;
    puntos.push(new THREE.Vector3(x, _radio * Math.cos(phi), _radio * Math.sin(phi)));
  }
  return puntos;
}

function construirPuntosDevanadoToroide(
  _radio_mayor: number,
  _radio_menor: number,
  _vueltas: number,
): THREE.Vector3[] {
  const muestras_por_vuelta = 14;
  const total = _vueltas * muestras_por_vuelta;
  const puntos: THREE.Vector3[] = [];
  for (let i = 0; i < total; i += 1) {
    const u = i / total;
    const theta = u * DOS_PI;
    const phi = u * _vueltas * DOS_PI;
    const r_local = _radio_mayor + _radio_menor * Math.cos(phi);
    const y_local = -_radio_menor * Math.sin(phi);
    puntos.push(
      new THREE.Vector3(
        r_local * Math.sin(theta),
        y_local,
        r_local * Math.cos(theta),
      ),
    );
  }
  return puntos;
}

function construirTuboHuecoCilindrico(
  _radio_interno: number,
  _radio_externo: number,
  _longitud: number,
): THREE.BufferGeometry {
  const mitad = _longitud * 0.5;
  const perfil = [
    new THREE.Vector2(_radio_interno, -mitad),
    new THREE.Vector2(_radio_externo, -mitad),
    new THREE.Vector2(_radio_externo, mitad),
    new THREE.Vector2(_radio_interno, mitad),
    new THREE.Vector2(_radio_interno, -mitad),
  ];
  const geo = new THREE.LatheGeometry(perfil, 48);
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function construirGeometriaAnillosHorizontales(
  _radios: readonly number[],
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const seg = 56;
  for (const r of _radios) {
    if (r <= 0.05) {
      continue;
    }
    for (let i = 0; i < seg; i += 1) {
      const a0 = (i / seg) * DOS_PI;
      const a1 = ((i + 1) / seg) * DOS_PI;
      vertices.push(
        0,
        r * Math.cos(a0),
        r * Math.sin(a0),
        0,
        r * Math.cos(a1),
        r * Math.sin(a1),
      );
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geo;
}

function construirGeometriaAnillosToroide(
  _radios: readonly number[],
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const seg = 64;
  for (const r of _radios) {
    if (r <= 0.05) {
      continue;
    }
    for (let i = 0; i < seg; i += 1) {
      const a0 = (i / seg) * DOS_PI;
      const a1 = ((i + 1) / seg) * DOS_PI;
      vertices.push(
        r * Math.sin(a0),
        0,
        r * Math.cos(a0),
        r * Math.sin(a1),
        0,
        r * Math.cos(a1),
      );
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geo;
}

interface InstanciaEscenaGeometrias {
  contexto: ContextoEscenaWebGL;
  aplicarTema: (_tema: TemaLaboratorio) => void;
  desmontar: () => void;
}

function montarEscenaGeometrias(
  _contenedor: HTMLDivElement,
  _estado_ref: { current: EstadoVivoGeometria },
): InstanciaEscenaGeometrias | null {
  const inicial =
    _estado_ref.current.parametros.tipo === "toroide"
      ? PRESETS_CAMARA_TOROIDE.perspectiva
      : PRESETS_CAMARA_HORIZONTAL.perspectiva;

  const contexto = crearContextoEscenaWebGL(_contenedor, inicial, {
    tamano_rejilla: 12,
    altura_rejilla: -2.35,
    longitud_ejes: 1.2,
    origen_ejes: new THREE.Vector3(-4.0, -2.32, -3.1),
  });
  if (!contexto) {
    return null;
  }
  const { escena, camara, renderizador, controles } = contexto;

  // Grupo 1: Conductor cilindrico macizo.
    const grupo_conductor = new THREE.Group();
    const material_conductor = new THREE.MeshStandardMaterial({
      color: "#d97706",
      emissive: "#78350f",
      emissiveIntensity: 0.16,
      metalness: 0.65,
      roughness: 0.32,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const malla_conductor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 4.8, 48),
      material_conductor,
    );
    malla_conductor.rotation.z = Math.PI / 2;

    const material_aro_corte = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.72,
    });
    const aro_corte_conductor = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.018, 12, 56),
      material_aro_corte,
    );
    aro_corte_conductor.rotation.y = Math.PI / 2;
    grupo_conductor.add(malla_conductor, aro_corte_conductor);
    escena.add(grupo_conductor);

    // Grupo 2: Cable coaxial (nucleo + aislante + malla externa).
    const grupo_coaxial = new THREE.Group();
    const material_nucleo_coax = new THREE.MeshStandardMaterial({
      color: "#d97706",
      emissive: "#92400e",
      emissiveIntensity: 0.22,
      metalness: 0.75,
      roughness: 0.28,
    });
    const malla_nucleo_coax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 5.1, 36),
      material_nucleo_coax,
    );
    malla_nucleo_coax.rotation.z = Math.PI / 2;

    const material_aislante_coax = new THREE.MeshPhysicalMaterial({
      color: "#38bdf8",
      emissive: "#0284c7",
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.16,
      roughness: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const malla_aislante_coax = new THREE.Mesh(
      new THREE.BufferGeometry(),
      material_aislante_coax,
    );

    const material_malla_coax = new THREE.MeshStandardMaterial({
      color: "#94a3b8",
      emissive: "#334155",
      emissiveIntensity: 0.15,
      metalness: 0.7,
      roughness: 0.34,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const malla_externa_coax = new THREE.Mesh(
      new THREE.BufferGeometry(),
      material_malla_coax,
    );

    const material_halo_apantallado = new THREE.MeshBasicMaterial({
      color: COLORES_VECTORES.n,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const aro_apantallado = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.016, 10, 64),
      material_halo_apantallado,
    );
    aro_apantallado.rotation.y = Math.PI / 2;
    aro_apantallado.visible = false;

    grupo_coaxial.add(
      malla_nucleo_coax,
      malla_aislante_coax,
      malla_externa_coax,
      aro_apantallado,
    );
    escena.add(grupo_coaxial);

    // Grupo 3: Solenoide largo (helice 3D + nucleo opcional).
    const grupo_solenoide = new THREE.Group();
    const material_helice = new THREE.MeshStandardMaterial({
      color: "#d97706",
      emissive: "#92400e",
      emissiveIntensity: 0.18,
      metalness: 0.78,
      roughness: 0.26,
    });
    const malla_helice_solenoide = new THREE.Mesh(
      new THREE.BufferGeometry(),
      material_helice,
    );
    const material_nucleo_ferro = new THREE.MeshStandardMaterial({
      color: "#6366f1",
      emissive: "#4f46e5",
      emissiveIntensity: 0.14,
      transparent: true,
      opacity: 0.16,
      metalness: 0.35,
      roughness: 0.4,
      depthWrite: false,
    });
    const malla_nucleo_solenoide = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 3.6, 40),
      material_nucleo_ferro,
    );
    malla_nucleo_solenoide.rotation.z = Math.PI / 2;
    grupo_solenoide.add(malla_helice_solenoide, malla_nucleo_solenoide);
    escena.add(grupo_solenoide);

    // Grupo 4: Toroide (nucleo toroidal + devanado helicoidal).
    const grupo_toroide = new THREE.Group();
    const material_nucleo_toroide = new THREE.MeshStandardMaterial({
      color: "#475569",
      emissive: "#1e293b",
      emissiveIntensity: 0.16,
      metalness: 0.45,
      roughness: 0.36,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const malla_nucleo_toroide = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.42, 24, 64),
      material_nucleo_toroide,
    );
    malla_nucleo_toroide.rotation.x = Math.PI / 2;

    const malla_devanado_toroide = new THREE.Mesh(
      new THREE.BufferGeometry(),
      material_helice,
    );
    grupo_toroide.add(malla_nucleo_toroide, malla_devanado_toroide);
    escena.add(grupo_toroide);

    // Lazo amperiano C (circular o rectangular segun geometria) y superficie encerrada.
    const grupo_lazo = new THREE.Group();
    const material_lazo = new THREE.MeshStandardMaterial({
      color: COLORES_VECTORES.lazo,
      emissive: COLORES_VECTORES.lazo,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.96,
    });
    const malla_lazo_circular = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.028, 14, 64),
      material_lazo,
    );
    const malla_lazo_rectangular = new THREE.Mesh(
      new THREE.BufferGeometry(),
      material_lazo,
    );

    const material_superficie_lazo = new THREE.MeshBasicMaterial({
      color: COLORES_VECTORES.lazo,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const malla_superficie_circular = new THREE.Mesh(
      new THREE.CircleGeometry(1, 56),
      material_superficie_lazo,
    );
    const malla_superficie_rectangular = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      material_superficie_lazo,
    );

    const pool_flechas_lazo = crearPoolFlechasInstanciadas(
      12,
      COLORES_VECTORES.lazo,
      { radio_tallo: 0.018, radio_punta: 0.056, intensidad_emisiva: 0.65 },
    );

    grupo_lazo.add(
      malla_lazo_circular,
      malla_lazo_rectangular,
      malla_superficie_circular,
      malla_superficie_rectangular,
      pool_flechas_lazo.grupo,
    );
    escena.add(grupo_lazo);

    // Lineas guia de campo magnetico B/H.
    const material_anillos_bh = new THREE.LineBasicMaterial({
      color: COLORES_VECTORES.b,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const anillos_bh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      material_anillos_bh,
    );
    escena.add(anillos_bh);

    // Pools instanciados reutilizables para B/H, Jc y particulas de corriente.
    const pool_bh = crearPoolFlechasInstanciadas(72, COLORES_VECTORES.b, {
      radio_tallo: 0.022,
      radio_punta: 0.06,
      usar_colores_instancia: true,
    });
    const pool_jc = crearPoolFlechasInstanciadas(48, COLORES_VECTORES.jc, {
      radio_tallo: 0.022,
      radio_punta: 0.06,
    });
    const pool_particulas = crearPoolEsferasInstanciadas(
      48,
      COLORES_VECTORES.jc,
      { intensidad_emisiva: 0.72 },
    );
    escena.add(pool_bh.grupo, pool_jc.grupo, pool_particulas.malla);

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
    const etiqueta_c = crearEtiquetaSprite({
      texto: "C",
      color_texto: COLORES_VECTORES.lazo,
      escala_mundo: 0.32,
    });
    const todas_etiquetas = [etiqueta_bh, etiqueta_jc, etiqueta_c];
    for (const etq of todas_etiquetas) {
      escena.add(etq.sprite);
    }

    let firma_geo_previa = "";
    let puntos_helice_solenoide_cache: THREE.Vector3[] = [];
    let puntos_devanado_toroide_cache: THREE.Vector3[] = [];
    let r_a_vis_cache = 0.76;
    let r_b_vis_cache = 1.1;
    let r_c_vis_cache = 1.48;
    let r_sol_vis_cache = 0.88;
    let l_sol_vis_cache = 3.6;
    let r_toro_int_cache = 1.05;
    let r_toro_ext_cache = 2.05;
    let tiempo_anterior_ms = performance.now();
    let id_animacion = 0;

    const sincronizarGeometrias = (_param: ParametrosGeometriaAmpere): void => {
      const a = Math.max(_param.radio_interior, 1e-6);
      const b = Math.max(_param.radio_medio, a + 1e-6);
      const c = Math.max(_param.radio_exterior, b + 1e-6);
      const firma = [
        _param.tipo,
        a.toFixed(5),
        b.toFixed(5),
        c.toFixed(5),
        _param.espiras_por_metro.toFixed(1),
        _param.numero_espiras_total.toFixed(0),
        _param.longitud_solenoide.toFixed(4),
        _param.largo_lazo_rectangular.toFixed(4),
        _param.radio_lazo.toFixed(5),
        _param.radio_lazo_secundario.toFixed(5),
      ].join("|");

      if (firma === firma_geo_previa) {
        return;
      }
      firma_geo_previa = firma;

      grupo_conductor.visible = _param.tipo === "conductor_cilindrico";
      grupo_coaxial.visible = _param.tipo === "cable_coaxial";
      grupo_solenoide.visible = _param.tipo === "solenoide_largo";
      grupo_toroide.visible = _param.tipo === "toroide";

      if (_param.tipo === "conductor_cilindrico") {
        r_a_vis_cache = 0.78;
        const r_lazo_vis = THREE.MathUtils.clamp(
          (_param.radio_lazo / a) * r_a_vis_cache,
          0.16,
          2.65,
        );
        malla_lazo_circular.visible = true;
        malla_superficie_circular.visible = true;
        malla_lazo_rectangular.visible = false;
        malla_superficie_rectangular.visible = false;

        malla_lazo_circular.rotation.set(0, Math.PI / 2, 0);
        malla_superficie_circular.rotation.set(0, Math.PI / 2, 0);
        malla_lazo_circular.geometry.dispose();
        malla_lazo_circular.geometry = new THREE.TorusGeometry(
          r_lazo_vis,
          0.028,
          14,
          64,
        );
        malla_superficie_circular.scale.setScalar(r_lazo_vis);

        anillos_bh.geometry.dispose();
        anillos_bh.geometry = construirGeometriaAnillosHorizontales([
          r_a_vis_cache * 0.55,
          r_a_vis_cache * 1.0,
          r_a_vis_cache * 1.65,
          r_a_vis_cache * 2.35,
        ]);
      } else if (_param.tipo === "cable_coaxial") {
        r_c_vis_cache = 1.5;
        r_a_vis_cache = THREE.MathUtils.clamp((a / c) * r_c_vis_cache, 0.24, 0.72);
        r_b_vis_cache = THREE.MathUtils.clamp(
          (b / c) * r_c_vis_cache,
          r_a_vis_cache + 0.26,
          r_c_vis_cache - 0.16,
        );

        malla_nucleo_coax.geometry.dispose();
        malla_nucleo_coax.geometry = new THREE.CylinderGeometry(
          r_a_vis_cache,
          r_a_vis_cache,
          5.1,
          36,
        );
        malla_aislante_coax.geometry.dispose();
        malla_aislante_coax.geometry = construirTuboHuecoCilindrico(
          r_a_vis_cache * 1.01,
          r_b_vis_cache * 0.99,
          4.2,
        );
        malla_externa_coax.geometry.dispose();
        malla_externa_coax.geometry = construirTuboHuecoCilindrico(
          r_b_vis_cache,
          r_c_vis_cache,
          3.4,
        );
        aro_apantallado.geometry.dispose();
        aro_apantallado.geometry = new THREE.TorusGeometry(
          r_c_vis_cache * 1.24,
          0.016,
          10,
          64,
        );

        const r_lazo_vis = THREE.MathUtils.clamp(
          (_param.radio_lazo / c) * r_c_vis_cache,
          0.16,
          2.75,
        );
        malla_lazo_circular.visible = true;
        malla_superficie_circular.visible = true;
        malla_lazo_rectangular.visible = false;
        malla_superficie_rectangular.visible = false;

        malla_lazo_circular.rotation.set(0, Math.PI / 2, 0);
        malla_superficie_circular.rotation.set(0, Math.PI / 2, 0);
        malla_lazo_circular.geometry.dispose();
        malla_lazo_circular.geometry = new THREE.TorusGeometry(
          r_lazo_vis,
          0.028,
          14,
          64,
        );
        malla_superficie_circular.scale.setScalar(r_lazo_vis);

        anillos_bh.geometry.dispose();
        anillos_bh.geometry = construirGeometriaAnillosHorizontales([
          r_a_vis_cache * 0.55,
          (r_a_vis_cache + r_b_vis_cache) * 0.5,
          (r_b_vis_cache + r_c_vis_cache) * 0.5,
          r_c_vis_cache * 1.32,
        ]);
      } else if (_param.tipo === "solenoide_largo") {
        r_sol_vis_cache = 0.9;
        l_sol_vis_cache = THREE.MathUtils.clamp(
          2.6 + Math.log2(Math.max(_param.longitud_solenoide, 0.05) / 0.4 + 0.3) * 0.65,
          2.5,
          4.4,
        );
        const vueltas_vis = Math.round(
          THREE.MathUtils.clamp(
            (_param.espiras_por_metro * _param.longitud_solenoide) / 22,
            10,
            26,
          ),
        );
        puntos_helice_solenoide_cache = construirPuntosHeliceSolenoide(
          r_sol_vis_cache,
          l_sol_vis_cache,
          vueltas_vis,
        );
        actualizarGeometriaTubo(
          malla_helice_solenoide,
          puntos_helice_solenoide_cache,
          0.032,
          vueltas_vis * 14,
          10,
          false,
        );

        malla_nucleo_solenoide.geometry.dispose();
        malla_nucleo_solenoide.geometry = new THREE.CylinderGeometry(
          r_sol_vis_cache * 0.9,
          r_sol_vis_cache * 0.9,
          l_sol_vis_cache * 0.98,
          40,
        );

        const y1 = THREE.MathUtils.clamp(
          (_param.radio_lazo / a) * r_sol_vis_cache,
          0.06,
          2.2,
        );
        let y2 = THREE.MathUtils.clamp(
          (_param.radio_lazo_secundario / a) * r_sol_vis_cache,
          0.16,
          2.45,
        );
        if (Math.abs(y2 - y1) < 0.22) {
          y2 = y1 + 0.28;
        }
        const largo_rect = THREE.MathUtils.clamp(
          (_param.largo_lazo_rectangular /
            Math.max(_param.longitud_solenoide, 0.05)) *
            l_sol_vis_cache,
          0.8,
          l_sol_vis_cache * 0.84,
        );
        const mitad_x = largo_rect * 0.5;
        const esquinas_rect = [
          new THREE.Vector3(-mitad_x, y1, 0),
          new THREE.Vector3(mitad_x, y1, 0),
          new THREE.Vector3(mitad_x, y2, 0),
          new THREE.Vector3(-mitad_x, y2, 0),
        ];

        const segmentos_rect = new THREE.CurvePath<THREE.Vector3>();
        segmentos_rect.add(new THREE.LineCurve3(esquinas_rect[0], esquinas_rect[1]));
        segmentos_rect.add(new THREE.LineCurve3(esquinas_rect[1], esquinas_rect[2]));
        segmentos_rect.add(new THREE.LineCurve3(esquinas_rect[2], esquinas_rect[3]));
        segmentos_rect.add(new THREE.LineCurve3(esquinas_rect[3], esquinas_rect[0]));

        malla_lazo_rectangular.geometry.dispose();
        malla_lazo_rectangular.geometry = new THREE.TubeGeometry(
          segmentos_rect,
          48,
          0.026,
          10,
          true,
        );
        malla_superficie_rectangular.scale.set(
          largo_rect,
          Math.abs(y2 - y1),
          1,
        );
        malla_superficie_rectangular.position.set(0, (y1 + y2) * 0.5, 0);

        malla_lazo_circular.visible = false;
        malla_superficie_circular.visible = false;
        malla_lazo_rectangular.visible = true;
        malla_superficie_rectangular.visible = true;

        anillos_bh.geometry.dispose();
        anillos_bh.geometry = new THREE.BufferGeometry();
      } else {
        r_toro_ext_cache = 2.08;
        r_toro_int_cache = THREE.MathUtils.clamp(
          (a / b) * r_toro_ext_cache,
          0.62,
          1.52,
        );
        const r_mayor = (r_toro_int_cache + r_toro_ext_cache) * 0.5;
        const r_menor = (r_toro_ext_cache - r_toro_int_cache) * 0.5;

        malla_nucleo_toroide.geometry.dispose();
        malla_nucleo_toroide.geometry = new THREE.TorusGeometry(
          r_mayor,
          r_menor * 0.92,
          24,
          64,
        );

        const vueltas_toro = Math.round(
          THREE.MathUtils.clamp(_param.numero_espiras_total / 8, 18, 40),
        );
        puntos_devanado_toroide_cache = construirPuntosDevanadoToroide(
          r_mayor,
          r_menor * 1.03,
          vueltas_toro,
        );
        actualizarGeometriaTubo(
          malla_devanado_toroide,
          puntos_devanado_toroide_cache,
          0.025,
          vueltas_toro * 12,
          8,
          true,
        );

        const r_lazo_vis = THREE.MathUtils.clamp(
          (_param.radio_lazo / b) * r_toro_ext_cache,
          0.22,
          2.9,
        );
        malla_lazo_circular.visible = true;
        malla_superficie_circular.visible = true;
        malla_lazo_rectangular.visible = false;
        malla_superficie_rectangular.visible = false;

        malla_lazo_circular.rotation.set(Math.PI / 2, 0, 0);
        malla_superficie_circular.rotation.set(Math.PI / 2, 0, 0);
        malla_lazo_circular.geometry.dispose();
        malla_lazo_circular.geometry = new THREE.TorusGeometry(
          r_lazo_vis,
          0.028,
          14,
          64,
        );
        malla_superficie_circular.scale.setScalar(r_lazo_vis);

        anillos_bh.geometry.dispose();
        anillos_bh.geometry = construirGeometriaAnillosToroide([
          r_toro_int_cache + (r_toro_ext_cache - r_toro_int_cache) * 0.28,
          r_toro_int_cache + (r_toro_ext_cache - r_toro_int_cache) * 0.72,
        ]);
      }
    };

    const bucle = (_ahora_ms: number): void => {
      id_animacion = requestAnimationFrame(bucle);
      const delta_s = Math.min((_ahora_ms - tiempo_anterior_ms) / 1000, 0.1);
      tiempo_anterior_ms = _ahora_ms;

      const {
        parametros: param,
        resultado: res,
        capas_visibles: capas,
        fase_animacion: fase,
        termino_resaltado: resaltado,
      } = _estado_ref.current;

      sincronizarGeometrias(param);
      contexto.grupo_referencia.visible = capas.mostrar_rejilla_y_ejes;

      const res_bh = calcularFactorResaltado(resaltado, CLAVES_BH);
      const res_jc = calcularFactorResaltado(resaltado, CLAVES_JC);
      const signo_i = param.corriente >= 0 ? 1 : -1;
      const a = Math.max(param.radio_interior, 1e-6);
      const b = Math.max(param.radio_medio, a + 1e-6);
      const c = Math.max(param.radio_exterior, b + 1e-6);
      const mu_r = Math.max(param.permeabilidad_relativa_nucleo, 1);
      const tiene_nucleo_ferro = mu_r > 1.05;

      // Tinte visual del nucleo ferromagnetico cuando μ_r > 1.
      if (param.tipo === "conductor_cilindrico") {
        material_conductor.color.set(tiene_nucleo_ferro ? "#6366f1" : "#d97706");
        material_conductor.emissive.set(
          tiene_nucleo_ferro ? "#3730a3" : "#78350f",
        );
      } else if (param.tipo === "solenoide_largo") {
        malla_nucleo_solenoide.visible = tiene_nucleo_ferro;
        material_nucleo_ferro.opacity = Math.min(
          0.34,
          0.12 + Math.log10(mu_r) * 0.08,
        );
      } else if (param.tipo === "toroide") {
        material_nucleo_toroide.color.set(
          tiene_nucleo_ferro ? "#6366f1" : "#475569",
        );
        material_nucleo_toroide.opacity = tiene_nucleo_ferro ? 0.36 : 0.22;
      }

      const flechas_bh: TransformacionFlecha[] = [];
      const flechas_jc: TransformacionFlecha[] = [];
      const flechas_lazo: TransformacionFlecha[] = [];
      const particulas: InstanciaEsfera[] = [];
      const desplazamiento_flujo = (fase * 0.24) % 1;

      if (param.tipo === "conductor_cilindrico") {
        const r_lazo_vis = THREE.MathUtils.clamp(
          (param.radio_lazo / a) * r_a_vis_cache,
          0.16,
          2.65,
        );

        if (capas.mostrar_lazo_y_superficie) {
          for (let i = 0; i < 8; i += 1) {
            const phi = (i / 8) * DOS_PI + 0.15;
            const p_m = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_lazo_vis,
              phi,
              0,
            );
            const t_m = campoCilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              phi,
              0,
              1,
              0,
            );
            flechas_lazo.push({
              origen: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
              direccion: new THREE.Vector3(t_m.x, t_m.y, t_m.z),
              longitud: THREE.MathUtils.clamp(r_lazo_vis * 0.26, 0.16, 0.32),
              grosor: res_bh.factor_escala,
            });
          }
          etiqueta_c.sprite.position.set(0.15, r_lazo_vis + 0.32, 0.15);
        }

        if (capas.mostrar_b_h && Math.abs(param.corriente) > 1e-9) {
          const h_max = Math.max(Math.abs(param.corriente) / (DOS_PI * a), 1e-12);
          const niveles: ReadonlyArray<{ frac_a: number; cantidad: number }> = [
            { frac_a: 0.55, cantidad: 6 },
            { frac_a: 1.0, cantidad: 8 },
            { frac_a: 1.65, cantidad: 10 },
            { frac_a: 2.35, cantidad: 10 },
          ];
          for (const nivel of niveles) {
            const r_fis = nivel.frac_a * a;
            const r_vis = nivel.frac_a * r_a_vis_cache;
            const eval_r = res.evaluarEnRadio(r_fis);
            const factor_ferro =
              nivel.frac_a <= 1 && tiene_nucleo_ferro
                ? 1 + 0.25 * Math.min(1, Math.log10(mu_r) / 2.5)
                : 1;
            const largo =
              THREE.MathUtils.clamp(
                (Math.abs(eval_r.campo_h) / h_max) * 0.46,
                0.08,
                0.56,
              ) * factor_ferro;
            const signo_h = eval_r.campo_h >= 0 ? 1 : -1;
            const color_flecha =
              nivel.frac_a <= 1 && tiene_nucleo_ferro
                ? COLOR_B_NUCLEO
                : COLOR_B_EXTERIOR;

            for (let j = 0; j < nivel.cantidad; j += 1) {
              const phi = (j / nivel.cantidad) * DOS_PI;
              const p_m = cilindricoAMundo(MARCO_EJE_HORIZONTAL, r_vis, phi, 0);
              const t_m = campoCilindricoAMundo(
                MARCO_EJE_HORIZONTAL,
                phi,
                0,
                signo_h,
                0,
              );
              flechas_bh.push({
                origen: new THREE.Vector3(
                  p_m.x - t_m.x * largo * 0.5,
                  p_m.y - t_m.y * largo * 0.5,
                  p_m.z - t_m.z * largo * 0.5,
                ),
                direccion: new THREE.Vector3(t_m.x, t_m.y, t_m.z),
                longitud: largo,
                grosor: res_bh.factor_escala,
                color: color_flecha,
              });
            }
          }
          etiqueta_bh.sprite.position.set(0.15, r_a_vis_cache * 2.55, 0.2);
        }

        if (capas.mostrar_jc && Math.abs(param.corriente) > 1e-9) {
          const posiciones_x = [-1.5, 1.3];
          for (const x_pos of posiciones_x) {
            flechas_jc.push({
              origen: new THREE.Vector3(x_pos - signo_i * 0.3, 0, 0),
              direccion: new THREE.Vector3(signo_i, 0, 0),
              longitud: 0.6,
              grosor: res_jc.factor_escala,
            });
            for (let k = 0; k < 4; k += 1) {
              const phi = (k / 4) * DOS_PI + 0.4;
              const p_m = cilindricoAMundo(
                MARCO_EJE_HORIZONTAL,
                r_a_vis_cache * 0.52,
                phi,
                x_pos - signo_i * 0.25,
              );
              flechas_jc.push({
                origen: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
                direccion: new THREE.Vector3(signo_i, 0, 0),
                longitud: 0.52,
                grosor: res_jc.factor_escala * 0.85,
              });
            }
          }
          etiqueta_jc.sprite.position.set(
            -1.55,
            r_a_vis_cache + 0.34,
            0.15,
          );
        }

        if (capas.mostrar_cargas && Math.abs(param.corriente) > 1e-9) {
          for (let fila = 0; fila < 4; fila += 1) {
            const phi = (fila / 4) * DOS_PI;
            const r_p = fila === 0 ? 0 : r_a_vis_cache * 0.52;
            for (let k = 0; k < 5; k += 1) {
              let u = (k / 5 + signo_i * desplazamiento_flujo) % 1;
              if (u < 0) {
                u += 1;
              }
              const x = -2.35 + u * 4.7;
              const p_m = cilindricoAMundo(MARCO_EJE_HORIZONTAL, r_p, phi, x);
              particulas.push({
                posicion: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
                radio: 0.044,
              });
            }
          }
        }
      } else if (param.tipo === "cable_coaxial") {
        const r_lazo_vis = THREE.MathUtils.clamp(
          (param.radio_lazo / c) * r_c_vis_cache,
          0.16,
          2.75,
        );
        aro_apantallado.visible = res.esta_apantallado;

        if (capas.mostrar_lazo_y_superficie) {
          for (let i = 0; i < 8; i += 1) {
            const phi = (i / 8) * DOS_PI + 0.15;
            const p_m = cilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              r_lazo_vis,
              phi,
              0,
            );
            const t_m = campoCilindricoAMundo(
              MARCO_EJE_HORIZONTAL,
              phi,
              0,
              1,
              0,
            );
            flechas_lazo.push({
              origen: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
              direccion: new THREE.Vector3(t_m.x, t_m.y, t_m.z),
              longitud: THREE.MathUtils.clamp(r_lazo_vis * 0.24, 0.16, 0.34),
              grosor: res_bh.factor_escala,
            });
          }
          etiqueta_c.sprite.position.set(0.15, r_lazo_vis + 0.34, 0.15);
        }

        if (capas.mostrar_b_h && Math.abs(param.corriente) > 1e-9) {
          const h_ref_coax = Math.max(
            Math.abs(param.corriente) / (DOS_PI * a),
            1e-12,
          );
          const niveles: ReadonlyArray<{
            r_fis: number;
            r_vis: number;
            cantidad: number;
          }> = [
            { r_fis: a * 0.6, r_vis: r_a_vis_cache * 0.6, cantidad: 5 },
            {
              r_fis: (a + b) * 0.5,
              r_vis: (r_a_vis_cache + r_b_vis_cache) * 0.5,
              cantidad: 8,
            },
            {
              r_fis: (b + c) * 0.5,
              r_vis: (r_b_vis_cache + r_c_vis_cache) * 0.5,
              cantidad: 10,
            },
            { r_fis: c * 1.32, r_vis: r_c_vis_cache * 1.32, cantidad: 10 },
          ];
          for (const nivel of niveles) {
            const eval_r = res.evaluarEnRadio(nivel.r_fis);
            const frac = Math.abs(eval_r.campo_h) / h_ref_coax;
            if (frac < 0.015) {
              continue;
            }
            const largo = THREE.MathUtils.clamp(frac * 0.72, 0.1, 0.52);
            const signo_h = eval_r.campo_h >= 0 ? 1 : -1;
            for (let j = 0; j < nivel.cantidad; j += 1) {
              const phi = (j / nivel.cantidad) * DOS_PI;
              const p_m = cilindricoAMundo(
                MARCO_EJE_HORIZONTAL,
                nivel.r_vis,
                phi,
                0,
              );
              const t_m = campoCilindricoAMundo(
                MARCO_EJE_HORIZONTAL,
                phi,
                0,
                signo_h,
                0,
              );
              flechas_bh.push({
                origen: new THREE.Vector3(
                  p_m.x - t_m.x * largo * 0.5,
                  p_m.y - t_m.y * largo * 0.5,
                  p_m.z - t_m.z * largo * 0.5,
                ),
                direccion: new THREE.Vector3(t_m.x, t_m.y, t_m.z),
                longitud: largo,
                grosor: res_bh.factor_escala,
                color: COLOR_B_EXTERIOR,
              });
            }
          }
          etiqueta_bh.sprite.position.set(
            0.15,
            (r_a_vis_cache + r_b_vis_cache) * 0.5 + 0.35,
            0.25,
          );
        }

        const alfa = Math.min(1, Math.max(0, param.factor_retorno_coaxial));
        if (capas.mostrar_jc && Math.abs(param.corriente) > 1e-9) {
          for (const x_c of [-1.9, 1.85]) {
            flechas_jc.push({
              origen: new THREE.Vector3(
                x_c - signo_i * 0.3,
                r_a_vis_cache + 0.1,
                0,
              ),
              direccion: new THREE.Vector3(signo_i, 0, 0),
              longitud: 0.56,
              grosor: res_jc.factor_escala,
            });
          }
          if (alfa > 0.02) {
            const largo_ret = 0.48 * alfa;
            const r_malla = (r_b_vis_cache + r_c_vis_cache) * 0.5;
            for (let k = 0; k < 4; k += 1) {
              const phi = (k / 4) * DOS_PI + 0.25;
              const p_m = cilindricoAMundo(
                MARCO_EJE_HORIZONTAL,
                r_malla,
                phi,
                -1.0 + signo_i * largo_ret * 0.5,
              );
              flechas_jc.push({
                origen: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
                direccion: new THREE.Vector3(-signo_i, 0, 0),
                longitud: largo_ret,
                grosor: res_jc.factor_escala * 0.88,
              });
            }
          }
          etiqueta_jc.sprite.position.set(-1.9, r_c_vis_cache + 0.34, 0.15);
        }

        if (capas.mostrar_cargas && Math.abs(param.corriente) > 1e-9) {
          for (let k = 0; k < 8; k += 1) {
            let u = (k / 8 + signo_i * desplazamiento_flujo) % 1;
            if (u < 0) {
              u += 1;
            }
            particulas.push({
              posicion: new THREE.Vector3(-2.45 + u * 4.9, 0, 0),
              radio: 0.046,
            });
          }
          if (alfa > 0.02) {
            const r_malla = (r_b_vis_cache + r_c_vis_cache) * 0.5;
            for (let fila = 0; fila < 4; fila += 1) {
              const phi = (fila / 4) * DOS_PI;
              for (let k = 0; k < 4; k += 1) {
                let u = (k / 4 - signo_i * desplazamiento_flujo * alfa) % 1;
                if (u < 0) {
                  u += 1;
                }
                const p_m = cilindricoAMundo(
                  MARCO_EJE_HORIZONTAL,
                  r_malla,
                  phi,
                  -1.6 + u * 3.2,
                );
                particulas.push({
                  posicion: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
                  radio: 0.036 * (0.5 + 0.5 * alfa),
                });
              }
            }
          }
        }
      } else if (param.tipo === "solenoide_largo") {
        const y1 = THREE.MathUtils.clamp(
          (param.radio_lazo / a) * r_sol_vis_cache,
          0.06,
          2.2,
        );
        let y2 = THREE.MathUtils.clamp(
          (param.radio_lazo_secundario / a) * r_sol_vis_cache,
          0.16,
          2.45,
        );
        if (Math.abs(y2 - y1) < 0.22) {
          y2 = y1 + 0.28;
        }
        const largo_rect = THREE.MathUtils.clamp(
          (param.largo_lazo_rectangular /
            Math.max(param.longitud_solenoide, 0.05)) *
            l_sol_vis_cache,
          0.8,
          l_sol_vis_cache * 0.84,
        );
        const mitad_x = largo_rect * 0.5;

        if (capas.mostrar_lazo_y_superficie) {
          flechas_lazo.push(
            {
              origen: new THREE.Vector3(-0.15, y1, 0),
              direccion: new THREE.Vector3(1, 0, 0),
              longitud: 0.3,
              grosor: res_bh.factor_escala,
            },
            {
              origen: new THREE.Vector3(0.15, y2, 0),
              direccion: new THREE.Vector3(-1, 0, 0),
              longitud: 0.3,
              grosor: res_bh.factor_escala,
            },
            {
              origen: new THREE.Vector3(mitad_x, (y1 + y2) * 0.5 - 0.12, 0),
              direccion: new THREE.Vector3(0, y2 >= y1 ? 1 : -1, 0),
              longitud: 0.24,
              grosor: res_bh.factor_escala,
            },
            {
              origen: new THREE.Vector3(-mitad_x, (y1 + y2) * 0.5 + 0.12, 0),
              direccion: new THREE.Vector3(0, y2 >= y1 ? -1 : 1, 0),
              longitud: 0.24,
              grosor: res_bh.factor_escala,
            },
          );
          etiqueta_c.sprite.position.set(
            mitad_x + 0.28,
            Math.max(y1, y2) + 0.25,
            0.15,
          );
        }

        if (capas.mostrar_b_h && Math.abs(param.corriente) > 1e-9) {
          const columnas_x = [-1.1, 0, 1.1];
          const anillos: ReadonlyArray<{ r: number; n: number }> = [
            { r: 0, n: 1 },
            { r: r_sol_vis_cache * 0.48, n: 6 },
          ];
          const largo_b = param.usar_solenoide_finito ? 0.62 : 0.72;
          for (const x_col of columnas_x) {
            const es_extremo = Math.abs(x_col) > 0.5;
            for (const anillo of anillos) {
              for (let j = 0; j < anillo.n; j += 1) {
                const phi = (j / anillo.n) * DOS_PI;
                const p_m = cilindricoAMundo(
                  MARCO_EJE_HORIZONTAL,
                  anillo.r,
                  phi,
                  x_col - signo_i * largo_b * 0.5,
                );
                const inclinacion_radial =
                  param.usar_solenoide_finito && es_extremo && anillo.r > 0
                    ? 0.22 * Math.sign(x_col) * signo_i
                    : 0;
                const dir_vec = campoCilindricoAMundo(
                  MARCO_EJE_HORIZONTAL,
                  phi,
                  inclinacion_radial,
                  0,
                  signo_i,
                );
                flechas_bh.push({
                  origen: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
                  direccion: new THREE.Vector3(
                    dir_vec.x,
                    dir_vec.y,
                    dir_vec.z,
                  ),
                  longitud: largo_b,
                  grosor: res_bh.factor_escala,
                  color: tiene_nucleo_ferro ? COLOR_B_NUCLEO : COLOR_B_EXTERIOR,
                });
              }
            }
          }
          etiqueta_bh.sprite.position.set(l_sol_vis_cache * 0.5 + 0.35, 0.25, 0.2);
        }

        if (
          capas.mostrar_jc &&
          Math.abs(param.corriente) > 1e-9 &&
          puntos_helice_solenoide_cache.length > 4
        ) {
          const total_pts = puntos_helice_solenoide_cache.length - 2;
          for (let k = 0; k < 8; k += 1) {
            const idx = Math.floor(((k + 0.5) / 8) * total_pts);
            const p0 = puntos_helice_solenoide_cache[idx];
            const p1 = puntos_helice_solenoide_cache[idx + 1];
            const dir = p1.clone().sub(p0).multiplyScalar(signo_i);
            flechas_jc.push({
              origen: p0.clone(),
              direccion: dir,
              longitud: 0.34,
              grosor: res_jc.factor_escala * 0.9,
            });
          }
          etiqueta_jc.sprite.position.set(-l_sol_vis_cache * 0.45, -r_sol_vis_cache - 0.35, 0.2);
        }

        if (
          capas.mostrar_cargas &&
          Math.abs(param.corriente) > 1e-9 &&
          puntos_helice_solenoide_cache.length > 4
        ) {
          const total_pts = puntos_helice_solenoide_cache.length - 1;
          for (let k = 0; k < 18; k += 1) {
            let u = (k / 18 + signo_i * desplazamiento_flujo * 0.45) % 1;
            if (u < 0) {
              u += 1;
            }
            const f_idx = u * total_pts;
            const i0 = Math.floor(f_idx);
            const i1 = Math.min(i0 + 1, total_pts);
            const pos = puntos_helice_solenoide_cache[i0]
              .clone()
              .lerp(puntos_helice_solenoide_cache[i1], f_idx - i0);
            particulas.push({ posicion: pos, radio: 0.044 });
          }
        }
      } else {
        // Toroide en MARCO_EJE_VERTICAL (eje de simetria = +Y).
        const r_lazo_vis = THREE.MathUtils.clamp(
          (param.radio_lazo / b) * r_toro_ext_cache,
          0.22,
          2.9,
        );

        if (capas.mostrar_lazo_y_superficie) {
          for (let i = 0; i < 8; i += 1) {
            const phi = (i / 8) * DOS_PI + 0.15;
            const p_m = cilindricoAMundo(
              MARCO_EJE_VERTICAL,
              r_lazo_vis,
              phi,
              0,
            );
            const t_m = campoCilindricoAMundo(
              MARCO_EJE_VERTICAL,
              phi,
              0,
              1,
              0,
            );
            flechas_lazo.push({
              origen: new THREE.Vector3(p_m.x, p_m.y, p_m.z),
              direccion: new THREE.Vector3(t_m.x, t_m.y, t_m.z),
              longitud: THREE.MathUtils.clamp(r_lazo_vis * 0.22, 0.16, 0.34),
              grosor: res_bh.factor_escala,
            });
          }
          etiqueta_c.sprite.position.set(r_lazo_vis + 0.25, 0.32, 0.2);
        }

        if (capas.mostrar_b_h && Math.abs(param.corriente) > 1e-9) {
          const r_int_anillo =
            r_toro_int_cache + (r_toro_ext_cache - r_toro_int_cache) * 0.28;
          const r_ext_anillo =
            r_toro_int_cache + (r_toro_ext_cache - r_toro_int_cache) * 0.72;
          const niveles_toro: ReadonlyArray<{
            r_vis: number;
            escala_inv_r: number;
            cantidad: number;
          }> = [
            { r_vis: r_int_anillo, escala_inv_r: 1.0, cantidad: 10 },
            {
              r_vis: r_ext_anillo,
              escala_inv_r: r_int_anillo / r_ext_anillo,
              cantidad: 12,
            },
          ];
          for (const nivel of niveles_toro) {
            const largo = 0.44 * nivel.escala_inv_r;
            for (let j = 0; j < nivel.cantidad; j += 1) {
              const phi = (j / nivel.cantidad) * DOS_PI;
              const p_m = cilindricoAMundo(
                MARCO_EJE_VERTICAL,
                nivel.r_vis,
                phi,
                0,
              );
              const t_m = campoCilindricoAMundo(
                MARCO_EJE_VERTICAL,
                phi,
                0,
                signo_i,
                0,
              );
              flechas_bh.push({
                origen: new THREE.Vector3(
                  p_m.x - t_m.x * largo * 0.5,
                  p_m.y - t_m.y * largo * 0.5,
                  p_m.z - t_m.z * largo * 0.5,
                ),
                direccion: new THREE.Vector3(t_m.x, t_m.y, t_m.z),
                longitud: largo,
                grosor: res_bh.factor_escala,
                color: tiene_nucleo_ferro ? COLOR_B_NUCLEO : COLOR_B_EXTERIOR,
              });
            }
          }
          etiqueta_bh.sprite.position.set(
            0,
            0.52,
            (r_toro_int_cache + r_toro_ext_cache) * 0.5,
          );
        }

        if (
          capas.mostrar_jc &&
          Math.abs(param.corriente) > 1e-9 &&
          puntos_devanado_toroide_cache.length > 4
        ) {
          const total_pts = puntos_devanado_toroide_cache.length;
          for (let k = 0; k < 8; k += 1) {
            const idx = Math.floor((k / 8) * total_pts);
            const p0 = puntos_devanado_toroide_cache[idx];
            const p1 = puntos_devanado_toroide_cache[(idx + 1) % total_pts];
            const dir = p1.clone().sub(p0).multiplyScalar(signo_i);
            flechas_jc.push({
              origen: p0.clone(),
              direccion: dir,
              longitud: 0.32,
              grosor: res_jc.factor_escala * 0.85,
            });
          }
          etiqueta_jc.sprite.position.set(-r_toro_ext_cache - 0.3, 0.35, 0);
        }

        if (
          capas.mostrar_cargas &&
          Math.abs(param.corriente) > 1e-9 &&
          puntos_devanado_toroide_cache.length > 4
        ) {
          const total_pts = puntos_devanado_toroide_cache.length;
          for (let k = 0; k < 20; k += 1) {
            let u = (k / 20 + signo_i * desplazamiento_flujo * 0.35) % 1;
            if (u < 0) {
              u += 1;
            }
            const f_idx = u * total_pts;
            const i0 = Math.floor(f_idx) % total_pts;
            const i1 = (i0 + 1) % total_pts;
            const pos = puntos_devanado_toroide_cache[i0]
              .clone()
              .lerp(puntos_devanado_toroide_cache[i1], f_idx - Math.floor(f_idx));
            particulas.push({ posicion: pos, radio: 0.042 });
          }
        }
      }

      grupo_lazo.visible = capas.mostrar_lazo_y_superficie;
      material_lazo.opacity = 0.96 * res_bh.factor_opacidad;
      material_lazo.emissiveIntensity = res_bh.esta_enfatizado ? 0.92 : 0.55;
      pool_flechas_lazo.definirEstilo(
        0.95 * res_bh.factor_opacidad,
        res_bh.esta_enfatizado ? 0.9 : 0.58,
      );
      pool_flechas_lazo.actualizar(flechas_lazo);

      anillos_bh.visible = capas.mostrar_b_h && flechas_bh.length > 0;
      material_anillos_bh.opacity = 0.34 * res_bh.factor_opacidad;

      pool_bh.grupo.visible = capas.mostrar_b_h;
      pool_bh.definirEstilo(
        0.94 * res_bh.factor_opacidad,
        res_bh.intensidad_emisiva,
      );
      pool_bh.actualizar(flechas_bh);

      pool_jc.grupo.visible = capas.mostrar_jc;
      pool_jc.definirEstilo(
        0.95 * res_jc.factor_opacidad,
        res_jc.intensidad_emisiva,
      );
      pool_jc.actualizar(flechas_jc);

      pool_particulas.malla.visible = capas.mostrar_cargas;
      pool_particulas.definirEstilo(
        0.95 * res_jc.factor_opacidad,
        res_jc.esta_enfatizado ? 0.92 : 0.65,
      );
      pool_particulas.actualizar(particulas);

      etiqueta_c.sprite.visible = capas.mostrar_lazo_y_superficie;
      etiqueta_c.actualizarOpacidad(res_bh.factor_opacidad);
      etiqueta_bh.sprite.visible = capas.mostrar_b_h && flechas_bh.length > 0;
      etiqueta_bh.actualizarOpacidad(res_bh.factor_opacidad);
      etiqueta_jc.sprite.visible = capas.mostrar_jc && flechas_jc.length > 0;
      etiqueta_jc.actualizarOpacidad(res_jc.factor_opacidad);

      contexto.actualizarTransicionCamara(delta_s);
      controles.update();
      renderizador.render(escena, camara);
    };

    id_animacion = requestAnimationFrame(bucle);

    const desmontar = (): void => {
      cancelAnimationFrame(id_animacion);
      material_conductor.dispose();
      material_aro_corte.dispose();
      material_nucleo_coax.dispose();
      material_aislante_coax.dispose();
      material_malla_coax.dispose();
      material_halo_apantallado.dispose();
      material_helice.dispose();
      material_nucleo_ferro.dispose();
      material_nucleo_toroide.dispose();
      material_lazo.dispose();
      material_superficie_lazo.dispose();
      material_anillos_bh.dispose();
      pool_flechas_lazo.liberar();
      pool_bh.liberar();
      pool_jc.liberar();
      pool_particulas.liberar();
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
      material_lazo.emissiveIntensity = es_claro ? 0.28 : 0.6;
      material_superficie_lazo.color.set(
        es_claro ? "#d97706" : COLORES_VECTORES.lazo,
      );
      material_superficie_lazo.opacity = es_claro ? 0.14 : 0.11;
      material_anillos_bh.color.set(es_claro ? "#15803d" : COLORES_VECTORES.b);
      material_anillos_bh.opacity = es_claro ? 0.46 : 0.34;
      for (const etq of todas_etiquetas) {
        etq.aplicarTema(_tema);
      }
    };

    return { contexto, aplicarTema, desmontar };
}

export function VisorGeometrias3D(_propiedades: PropiedadesVisorGeometrias3D) {
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
  const instancia_ref = useRef<InstanciaEscenaGeometrias | null>(null);
  const al_fallar_ref = useRef(alFallarWebGL);
  const tipo_anterior_ref = useRef<TipoGeometriaAmpere>(parametros.tipo);
  const estado_ref = useRef<EstadoVivoGeometria>({
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
    if (!contexto_ref.current) {
      return;
    }
    if (tipo_anterior_ref.current !== parametros.tipo) {
      tipo_anterior_ref.current = parametros.tipo;
      const mapa =
        parametros.tipo === "toroide"
          ? PRESETS_CAMARA_TOROIDE
          : PRESETS_CAMARA_HORIZONTAL;
      contexto_ref.current.aplicarPresetCamara("perspectiva", mapa);
    }
  }, [parametros.tipo]);

  useEffect(() => {
    if (!comando_camara || !contexto_ref.current) {
      return;
    }
    const mapa =
      estado_ref.current.parametros.tipo === "toroide"
        ? PRESETS_CAMARA_TOROIDE
        : PRESETS_CAMARA_HORIZONTAL;
    contexto_ref.current.aplicarPresetCamara(comando_camara.preset, mapa);
  }, [comando_camara]);

  useEffect(() => {
    const contenedor = contenedor_ref.current;
    if (!contenedor) {
      return;
    }
    const instancia = montarEscenaGeometrias(contenedor, estado_ref);
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
      aria-label="Visor tridimensional interactivo de geometrías clásicas de la Ley de Ampère"
    />
  );
}
