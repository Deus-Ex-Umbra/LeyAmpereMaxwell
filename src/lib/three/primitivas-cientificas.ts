import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { TemaLaboratorio } from "@/contextos";
import {
  crearEtiquetaSprite,
  type EtiquetaSpriteCientifica,
} from "./etiquetas-sprite";

export type PresetCamaraEscena =
  | "perspectiva"
  | "axial"
  | "frontal"
  | "reiniciar";

export interface ConfiguracionCamara {
  posicion: [number, number, number];
  objetivo: [number, number, number];
}

export interface TransformacionFlecha {
  origen: THREE.Vector3;
  direccion: THREE.Vector3;
  longitud: number;
  grosor?: number;
  color?: THREE.Color;
}

export interface InstanciaEsfera {
  posicion: THREE.Vector3;
  radio: number;
  color?: THREE.Color;
}

export interface PoolFlechasInstanciadas {
  grupo: THREE.Group;
  malla_tallos: THREE.InstancedMesh;
  malla_puntas: THREE.InstancedMesh;
  material: THREE.MeshStandardMaterial;
  capacidad: number;
  actualizar: (_flechas: readonly TransformacionFlecha[]) => void;
  definirEstilo: (_opacidad: number, _intensidad_emisiva: number) => void;
  liberar: () => void;
}

export interface PoolEsferasInstanciadas {
  malla: THREE.InstancedMesh;
  material: THREE.MeshStandardMaterial;
  capacidad: number;
  actualizar: (_instancias: readonly InstanciaEsfera[]) => void;
  definirEstilo: (_opacidad: number, _intensidad_emisiva: number) => void;
  liberar: () => void;
}

export interface ContextoEscenaWebGL {
  escena: THREE.Scene;
  camara: THREE.PerspectiveCamera;
  renderizador: THREE.WebGLRenderer;
  controles: OrbitControls;
  grupo_referencia: THREE.Group;
  redimensionar: () => void;
  aplicarPresetCamara: (
    _preset: PresetCamaraEscena,
    _mapa_presets: Record<
      Exclude<PresetCamaraEscena, "reiniciar">,
      ConfiguracionCamara
    >,
  ) => void;
  actualizarTransicionCamara: (_delta_s: number) => void;
  aplicarTema: (_tema: TemaLaboratorio) => void;
  liberar: () => void;
}

export interface EstadoResaltado3D {
  factor_opacidad: number;
  factor_escala: number;
  intensidad_emisiva: number;
  esta_enfatizado: boolean;
}

export const COLOR_FONDO_LABORATORIO = "#060a13";
export const COLOR_FONDO_LABORATORIO_CLARO = "#f8fafc";

const EJE_Y_UNITARIO = new THREE.Vector3(0, 1, 0);

let cache_soporte_webgl: boolean | null = null;

export function soportaWebGLCliente(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return true;
  }
  if (cache_soporte_webgl !== null) {
    return cache_soporte_webgl;
  }
  try {
    const canvas_prueba = document.createElement("canvas");
    const contexto =
      canvas_prueba.getContext("webgl2") ??
      canvas_prueba.getContext("webgl") ??
      canvas_prueba.getContext("experimental-webgl");
    cache_soporte_webgl = Boolean(contexto);
  } catch {
    cache_soporte_webgl = false;
  }
  return cache_soporte_webgl;
}

export function calcularFactorResaltado(
  _termino_resaltado: string | null | undefined,
  _claves_compatibles: readonly string[],
): EstadoResaltado3D {
  if (!_termino_resaltado) {
    return {
      factor_opacidad: 1,
      factor_escala: 1,
      intensidad_emisiva: 0.36,
      esta_enfatizado: false,
    };
  }
  if (_claves_compatibles.includes(_termino_resaltado)) {
    return {
      factor_opacidad: 1,
      factor_escala: 1.24,
      intensidad_emisiva: 0.92,
      esta_enfatizado: true,
    };
  }
  return {
    factor_opacidad: 0.24,
    factor_escala: 0.92,
    intensidad_emisiva: 0.1,
    esta_enfatizado: false,
  };
}

function liberarMaterialUnico(_material: THREE.Material): void {
  const mapa_propiedades = _material as unknown as Record<string, unknown>;
  const claves_textura = [
    "map",
    "emissiveMap",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "alphaMap",
    "aoMap",
  ];
  for (const clave of claves_textura) {
    const posible_textura = mapa_propiedades[clave];
    if (posible_textura instanceof THREE.Texture) {
      posible_textura.dispose();
    }
  }
  _material.dispose();
}

export function liberarObjetoThree(_objeto: THREE.Object3D): void {
  // Recorrido recursivo para liberar buffers GPU de geometrias, materiales y texturas.
  _objeto.traverse((_nodo) => {
    if (
      _nodo instanceof THREE.Mesh ||
      _nodo instanceof THREE.Line ||
      _nodo instanceof THREE.LineSegments ||
      _nodo instanceof THREE.Points
    ) {
      _nodo.geometry.dispose();
      if (Array.isArray(_nodo.material)) {
        for (const mat of _nodo.material) {
          liberarMaterialUnico(mat);
        }
      } else {
        liberarMaterialUnico(_nodo.material);
      }
    } else if (_nodo instanceof THREE.Sprite) {
      liberarMaterialUnico(_nodo.material);
    }
  });
}

export interface RejillaLaboratorio {
  grupo: THREE.Group;
  aplicarTema: (_es_claro: boolean) => void;
}

export function crearRejillaLaboratorio(
  _tamano: number,
  _divisiones: number,
  _altura_y: number,
): RejillaLaboratorio {
  const grupo = new THREE.Group();
  grupo.position.y = _altura_y;

  const rejilla_oscura = new THREE.GridHelper(
    _tamano,
    _divisiones,
    new THREE.Color("#294666"),
    new THREE.Color("#132036"),
  );
  const materiales_oscura = Array.isArray(rejilla_oscura.material)
    ? rejilla_oscura.material
    : [rejilla_oscura.material];
  for (const mat of materiales_oscura) {
    mat.transparent = true;
    mat.opacity = 0.42;
    mat.depthWrite = false;
  }

  const rejilla_clara = new THREE.GridHelper(
    _tamano,
    _divisiones,
    new THREE.Color("#94a3b8"),
    new THREE.Color("#cbd5e1"),
  );
  const materiales_clara = Array.isArray(rejilla_clara.material)
    ? rejilla_clara.material
    : [rejilla_clara.material];
  for (const mat of materiales_clara) {
    mat.transparent = true;
    mat.opacity = 0.52;
    mat.depthWrite = false;
  }
  rejilla_clara.visible = false;

  grupo.add(rejilla_oscura, rejilla_clara);

  const geometria_anillo = new THREE.RingGeometry(
    _tamano * 0.46,
    _tamano * 0.465,
    64,
  );
  const material_anillo = new THREE.MeshBasicMaterial({
    color: "#38bdf8",
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const anillo = new THREE.Mesh(geometria_anillo, material_anillo);
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.002;
  grupo.add(anillo);

  const aplicarTema = (_es_claro: boolean): void => {
    rejilla_oscura.visible = !_es_claro;
    rejilla_clara.visible = _es_claro;
    material_anillo.color.set(_es_claro ? "#0284c7" : "#38bdf8");
    material_anillo.opacity = _es_claro ? 0.24 : 0.14;
  };

  return { grupo, aplicarTema };
}

export function crearEjesCartesianosRGB(
  _longitud: number,
  _origen?: THREE.Vector3,
): { grupo: THREE.Group; etiquetas: EtiquetaSpriteCientifica[] } {
  const grupo = new THREE.Group();
  if (_origen) {
    grupo.position.copy(_origen);
  }

  const especificaciones: ReadonlyArray<{
    texto: string;
    color: string;
    direccion: THREE.Vector3;
  }> = [
    { texto: "X", color: "#ef4444", direccion: new THREE.Vector3(1, 0, 0) },
    { texto: "Y", color: "#10b981", direccion: new THREE.Vector3(0, 1, 0) },
    { texto: "Z", color: "#3b82f6", direccion: new THREE.Vector3(0, 0, 1) },
  ];

  const etiquetas: EtiquetaSpriteCientifica[] = [];
  const largo_punta = Math.min(0.18, _longitud * 0.16);
  const largo_tallo = Math.max(0.1, _longitud - largo_punta);
  const cuaternio = new THREE.Quaternion();

  for (const eje of especificaciones) {
    const material = new THREE.MeshStandardMaterial({
      color: eje.color,
      emissive: eje.color,
      emissiveIntensity: 0.42,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });

    const geo_tallo = new THREE.CylinderGeometry(0.014, 0.014, largo_tallo, 8);
    geo_tallo.translate(0, largo_tallo / 2, 0);
    const malla_tallo = new THREE.Mesh(geo_tallo, material);

    const geo_punta = new THREE.ConeGeometry(0.044, largo_punta, 12);
    geo_punta.translate(0, largo_tallo + largo_punta / 2, 0);
    const malla_punta = new THREE.Mesh(geo_punta, material);

    cuaternio.setFromUnitVectors(EJE_Y_UNITARIO, eje.direccion);
    malla_tallo.quaternion.copy(cuaternio);
    malla_punta.quaternion.copy(cuaternio);

    grupo.add(malla_tallo, malla_punta);

    const etiqueta = crearEtiquetaSprite({
      texto: eje.texto,
      color_texto: eje.color,
      escala_mundo: 0.28,
      mostrar_pildora: false,
    });
    etiqueta.sprite.position
      .copy(eje.direccion)
      .multiplyScalar(_longitud + 0.18);
    grupo.add(etiqueta.sprite);
    etiquetas.push(etiqueta);
  }

  return { grupo, etiquetas };
}

export function crearPoolFlechasInstanciadas(
  _capacidad: number,
  _color_hex: string,
  _opciones?: {
    radio_tallo?: number;
    radio_punta?: number;
    proporcion_punta?: number;
    opacidad?: number;
    intensidad_emisiva?: number;
    usar_colores_instancia?: boolean;
  },
): PoolFlechasInstanciadas {
  const capacidad = Math.max(1, Math.floor(_capacidad));
  const radio_tallo = _opciones?.radio_tallo ?? 0.024;
  const radio_punta = _opciones?.radio_punta ?? 0.068;
  const proporcion_punta = _opciones?.proporcion_punta ?? 0.28;
  const usar_colores_instancia = _opciones?.usar_colores_instancia ?? false;

  const geometria_tallo = new THREE.CylinderGeometry(
    radio_tallo,
    radio_tallo,
    1,
    10,
  );
  geometria_tallo.translate(0, 0.5, 0);

  const geometria_punta = new THREE.ConeGeometry(radio_punta, 1, 12);
  geometria_punta.translate(0, 0.5, 0);

  const material = new THREE.MeshStandardMaterial({
    color: usar_colores_instancia ? "#ffffff" : _color_hex,
    emissive: _color_hex,
    emissiveIntensity: _opciones?.intensidad_emisiva ?? 0.38,
    roughness: 0.35,
    metalness: 0.18,
    transparent: true,
    opacity: _opciones?.opacidad ?? 0.94,
  });

  const malla_tallos = new THREE.InstancedMesh(
    geometria_tallo,
    material,
    capacidad,
  );
  const malla_puntas = new THREE.InstancedMesh(
    geometria_punta,
    material,
    capacidad,
  );
  malla_tallos.count = 0;
  malla_puntas.count = 0;
  malla_tallos.frustumCulled = false;
  malla_puntas.frustumCulled = false;

  if (usar_colores_instancia) {
    const color_base = new THREE.Color(_color_hex);
    for (let i = 0; i < capacidad; i += 1) {
      malla_tallos.setColorAt(i, color_base);
      malla_puntas.setColorAt(i, color_base);
    }
    if (malla_tallos.instanceColor) {
      malla_tallos.instanceColor.needsUpdate = true;
    }
    if (malla_puntas.instanceColor) {
      malla_puntas.instanceColor.needsUpdate = true;
    }
  }

  const grupo = new THREE.Group();
  grupo.add(malla_tallos, malla_puntas);

  const dir_norm = new THREE.Vector3();
  const pos_punta = new THREE.Vector3();
  const cuaternio = new THREE.Quaternion();
  const escala_vec = new THREE.Vector3();
  const matriz = new THREE.Matrix4();
  const color_por_defecto = new THREE.Color(_color_hex);

  const actualizar = (_flechas: readonly TransformacionFlecha[]): void => {
    let indice = 0;
    const limite = Math.min(_flechas.length, capacidad);

    for (let i = 0; i < limite; i += 1) {
      const flecha = _flechas[i];
      if (flecha.longitud <= 1e-4) {
        continue;
      }
      const norma_dir = flecha.direccion.length();
      if (norma_dir <= 1e-8) {
        continue;
      }

      dir_norm.copy(flecha.direccion).divideScalar(norma_dir);
      const grosor = flecha.grosor ?? 1;
      const largo_punta = Math.min(
        flecha.longitud * proporcion_punta,
        0.22 * grosor,
      );
      const largo_tallo = Math.max(0.001, flecha.longitud - largo_punta);

      cuaternio.setFromUnitVectors(EJE_Y_UNITARIO, dir_norm);

      escala_vec.set(grosor, largo_tallo, grosor);
      matriz.compose(flecha.origen, cuaternio, escala_vec);
      malla_tallos.setMatrixAt(indice, matriz);

      pos_punta.copy(flecha.origen).addScaledVector(dir_norm, largo_tallo);
      escala_vec.set(grosor, largo_punta, grosor);
      matriz.compose(pos_punta, cuaternio, escala_vec);
      malla_puntas.setMatrixAt(indice, matriz);

      if (usar_colores_instancia) {
        const color_inst = flecha.color ?? color_por_defecto;
        malla_tallos.setColorAt(indice, color_inst);
        malla_puntas.setColorAt(indice, color_inst);
      }

      indice += 1;
    }

    malla_tallos.count = indice;
    malla_puntas.count = indice;
    malla_tallos.instanceMatrix.needsUpdate = true;
    malla_puntas.instanceMatrix.needsUpdate = true;

    if (usar_colores_instancia) {
      if (malla_tallos.instanceColor) {
        malla_tallos.instanceColor.needsUpdate = true;
      }
      if (malla_puntas.instanceColor) {
        malla_puntas.instanceColor.needsUpdate = true;
      }
    }
  };

  const definirEstilo = (
    _opacidad: number,
    _intensidad_emisiva: number,
  ): void => {
    material.opacity = THREE.MathUtils.clamp(_opacidad, 0, 1);
    material.emissiveIntensity = _intensidad_emisiva;
  };

  const liberar = (): void => {
    geometria_tallo.dispose();
    geometria_punta.dispose();
    material.dispose();
  };

  return {
    grupo,
    malla_tallos,
    malla_puntas,
    material,
    capacidad,
    actualizar,
    definirEstilo,
    liberar,
  };
}

export function crearPoolEsferasInstanciadas(
  _capacidad: number,
  _color_hex: string,
  _opciones?: {
    segmentos?: number;
    opacidad?: number;
    intensidad_emisiva?: number;
    usar_colores_instancia?: boolean;
  },
): PoolEsferasInstanciadas {
  const capacidad = Math.max(1, Math.floor(_capacidad));
  const segmentos = _opciones?.segmentos ?? 12;
  const usar_colores_instancia = _opciones?.usar_colores_instancia ?? false;

  const geometria = new THREE.SphereGeometry(1, segmentos, segmentos);
  const material = new THREE.MeshStandardMaterial({
    color: usar_colores_instancia ? "#ffffff" : _color_hex,
    emissive: usar_colores_instancia ? "#ffffff" : _color_hex,
    emissiveIntensity: _opciones?.intensidad_emisiva ?? 0.55,
    roughness: 0.28,
    metalness: 0.15,
    transparent: true,
    opacity: _opciones?.opacidad ?? 0.95,
  });

  const malla = new THREE.InstancedMesh(geometria, material, capacidad);
  malla.count = 0;
  malla.frustumCulled = false;

  const color_base = new THREE.Color(_color_hex);
  if (usar_colores_instancia) {
    for (let i = 0; i < capacidad; i += 1) {
      malla.setColorAt(i, color_base);
    }
    if (malla.instanceColor) {
      malla.instanceColor.needsUpdate = true;
    }
  }

  const cuaternio_id = new THREE.Quaternion();
  const escala_vec = new THREE.Vector3();
  const matriz = new THREE.Matrix4();

  const actualizar = (_instancias: readonly InstanciaEsfera[]): void => {
    let indice = 0;
    const limite = Math.min(_instancias.length, capacidad);
    for (let i = 0; i < limite; i += 1) {
      const item = _instancias[i];
      if (item.radio <= 1e-4) {
        continue;
      }
      escala_vec.setScalar(item.radio);
      matriz.compose(item.posicion, cuaternio_id, escala_vec);
      malla.setMatrixAt(indice, matriz);

      if (usar_colores_instancia) {
        malla.setColorAt(indice, item.color ?? color_base);
      }
      indice += 1;
    }

    malla.count = indice;
    malla.instanceMatrix.needsUpdate = true;
    if (usar_colores_instancia) {
      if (malla.instanceColor) {
        malla.instanceColor.needsUpdate = true;
      }
    }
  };

  const definirEstilo = (
    _opacidad: number,
    _intensidad_emisiva: number,
  ): void => {
    material.opacity = THREE.MathUtils.clamp(_opacidad, 0, 1);
    material.emissiveIntensity = _intensidad_emisiva;
  };

  const liberar = (): void => {
    geometria.dispose();
    material.dispose();
  };

  return {
    malla,
    material,
    capacidad,
    actualizar,
    definirEstilo,
    liberar,
  };
}

export function actualizarGeometriaTubo(
  _malla: THREE.Mesh,
  _puntos: readonly THREE.Vector3[],
  _radio: number,
  _segmentos_tubulares: number,
  _segmentos_radiales: number,
  _cerrado: boolean,
): void {
  if (_puntos.length < 2) {
    return;
  }
  const curva = new THREE.CatmullRomCurve3([..._puntos], _cerrado);
  const nueva_geo = new THREE.TubeGeometry(
    curva,
    _segmentos_tubulares,
    _radio,
    _segmentos_radiales,
    _cerrado,
  );
  _malla.geometry.dispose();
  _malla.geometry = nueva_geo;
}

export function crearContextoEscenaWebGL(
  _contenedor: HTMLElement,
  _camara_inicial: ConfiguracionCamara,
  _opciones?: {
    tamano_rejilla?: number;
    altura_rejilla?: number;
    longitud_ejes?: number;
    origen_ejes?: THREE.Vector3;
  },
): ContextoEscenaWebGL | null {
  let renderizador: THREE.WebGLRenderer;
  try {
    renderizador = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }

  const rect_inicial = _contenedor.getBoundingClientRect();
  const ancho_ini = Math.max(
    Math.round(rect_inicial.width) || _contenedor.clientWidth,
    320,
  );
  const alto_ini = Math.max(
    Math.round(rect_inicial.height) || _contenedor.clientHeight,
    240,
  );

  renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderizador.setSize(ancho_ini, alto_ini, false);
  renderizador.toneMapping = THREE.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.12;
  renderizador.outputColorSpace = THREE.SRGBColorSpace;
  renderizador.domElement.style.position = "absolute";
  renderizador.domElement.style.top = "0";
  renderizador.domElement.style.left = "0";
  renderizador.domElement.style.width = "100%";
  renderizador.domElement.style.height = "100%";
  renderizador.domElement.style.display = "block";
  _contenedor.appendChild(renderizador.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(COLOR_FONDO_LABORATORIO);
  escena.fog = new THREE.FogExp2(COLOR_FONDO_LABORATORIO, 0.02);

  const camara = new THREE.PerspectiveCamera(42, ancho_ini / alto_ini, 0.1, 80);
  camara.position.set(..._camara_inicial.posicion);

  const controles = new OrbitControls(camara, renderizador.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.075;
  controles.minDistance = 2.0;
  controles.maxDistance = 22;
  controles.maxPolarAngle = Math.PI * 0.96;
  controles.target.set(..._camara_inicial.objetivo);
  controles.update();

  const luz_ambiental = new THREE.AmbientLight("#cbd5e1", 0.56);
  const luz_hemisferica = new THREE.HemisphereLight("#bae6fd", "#0f172a", 0.62);
  const luz_principal = new THREE.DirectionalLight("#f8fafc", 1.18);
  luz_principal.position.set(6, 9, 7);
  const luz_relleno = new THREE.DirectionalLight("#38bdf8", 0.45);
  luz_relleno.position.set(-6, -3, -5);
  escena.add(luz_ambiental, luz_hemisferica, luz_principal, luz_relleno);

  const grupo_referencia = new THREE.Group();
  const rejilla = crearRejillaLaboratorio(
    _opciones?.tamano_rejilla ?? 12,
    24,
    _opciones?.altura_rejilla ?? -2.25,
  );
  const { grupo: grupo_ejes, etiquetas: etiquetas_ejes } =
    crearEjesCartesianosRGB(
      _opciones?.longitud_ejes ?? 1.25,
      _opciones?.origen_ejes ?? new THREE.Vector3(-4.2, -2.22, -3.2),
    );
  grupo_referencia.add(rejilla.grupo, grupo_ejes);
  escena.add(grupo_referencia);

  let transicion_activa = false;
  const destino_posicion = new THREE.Vector3();
  const destino_objetivo = new THREE.Vector3();

  const cancelarTransicion = (): void => {
    transicion_activa = false;
  };
  controles.addEventListener("start", cancelarTransicion);

  let ancho_previo = ancho_ini;
  let alto_previo = alto_ini;

  const redimensionar = (): void => {
    const rect = _contenedor.getBoundingClientRect();
    const ancho = Math.max(Math.round(rect.width), 1);
    const alto = Math.max(Math.round(rect.height), 1);
    if (ancho === ancho_previo && alto === alto_previo) {
      return;
    }
    ancho_previo = ancho;
    alto_previo = alto;
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderizador.setSize(ancho, alto, false);
  };

  // Diferimos el ajuste a requestAnimationFrame para evitar ciclos de ResizeObserver.
  let id_raf_redimension: number | null = null;
  const programarRedimension = (): void => {
    if (id_raf_redimension !== null) {
      return;
    }
    id_raf_redimension = requestAnimationFrame(() => {
      id_raf_redimension = null;
      redimensionar();
    });
  };
  const observador_tamano = new ResizeObserver(programarRedimension);
  observador_tamano.observe(_contenedor);
  programarRedimension();

  const aplicarPresetCamara = (
    _preset: PresetCamaraEscena,
    _mapa_presets: Record<
      Exclude<PresetCamaraEscena, "reiniciar">,
      ConfiguracionCamara
    >,
  ): void => {
    const clave: Exclude<PresetCamaraEscena, "reiniciar"> =
      _preset === "reiniciar" ? "perspectiva" : _preset;
    const config = _mapa_presets[clave];
    destino_posicion.set(...config.posicion);
    destino_objetivo.set(...config.objetivo);
    transicion_activa = true;
  };

  const actualizarTransicionCamara = (_delta_s: number): void => {
    if (!transicion_activa) {
      return;
    }
    const factor = 1 - Math.exp(-Math.min(_delta_s, 0.1) * 7.5);
    camara.position.lerp(destino_posicion, factor);
    controles.target.lerp(destino_objetivo, factor);

    if (
      camara.position.distanceToSquared(destino_posicion) < 0.0005 &&
      controles.target.distanceToSquared(destino_objetivo) < 0.0005
    ) {
      camara.position.copy(destino_posicion);
      controles.target.copy(destino_objetivo);
      transicion_activa = false;
    }
  };

  const aplicarTema = (_tema: TemaLaboratorio): void => {
    const es_claro = _tema === "claro";
    const color_fondo = es_claro
      ? COLOR_FONDO_LABORATORIO_CLARO
      : COLOR_FONDO_LABORATORIO;
    escena.background = new THREE.Color(color_fondo);
    escena.fog = new THREE.FogExp2(color_fondo, es_claro ? 0.012 : 0.02);

    luz_ambiental.color.set(es_claro ? "#ffffff" : "#cbd5e1");
    luz_ambiental.intensity = es_claro ? 0.85 : 0.56;
    luz_hemisferica.color.set(es_claro ? "#f8fafc" : "#bae6fd");
    luz_hemisferica.groundColor.set(es_claro ? "#cbd5e1" : "#0f172a");
    luz_hemisferica.intensity = es_claro ? 0.78 : 0.62;
    luz_relleno.color.set(es_claro ? "#7dd3fc" : "#38bdf8");
    luz_relleno.intensity = es_claro ? 0.32 : 0.45;
    renderizador.toneMappingExposure = es_claro ? 1.04 : 1.12;

    rejilla.aplicarTema(es_claro);
    for (const etiqueta of etiquetas_ejes) {
      etiqueta.aplicarTema(_tema);
    }
  };

  const liberar = (): void => {
    observador_tamano.disconnect();
    if (id_raf_redimension !== null) {
      cancelAnimationFrame(id_raf_redimension);
      id_raf_redimension = null;
    }
    controles.removeEventListener("start", cancelarTransicion);
    controles.dispose();
    for (const etiqueta of etiquetas_ejes) {
      etiqueta.liberar();
    }
    liberarObjetoThree(escena);
    renderizador.dispose();
    if (renderizador.domElement.parentNode === _contenedor) {
      _contenedor.removeChild(renderizador.domElement);
    }
  };

  return {
    escena,
    camara,
    renderizador,
    controles,
    grupo_referencia,
    redimensionar,
    aplicarPresetCamara,
    actualizarTransicionCamara,
    aplicarTema,
    liberar,
  };
}
