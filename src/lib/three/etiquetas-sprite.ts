import * as THREE from "three";

export interface OpcionesEtiquetaSprite {
  texto: string;
  subindice?: string;
  es_vector?: boolean;
  color_texto: string;
  color_borde?: string;
  color_fondo?: string;
  escala_mundo?: number;
  mostrar_pildora?: boolean;
}

export interface EtiquetaSpriteCientifica {
  sprite: THREE.Sprite;
  textura: THREE.CanvasTexture;
  material: THREE.SpriteMaterial;
  actualizarTexto: (_texto: string, _subindice?: string) => void;
  actualizarOpacidad: (_opacidad: number) => void;
  liberar: () => void;
}

const ANCHO_CANVAS = 256;
const ALTO_CANVAS = 128;

function dibujarPildoraRedondeada(
  _ctx: CanvasRenderingContext2D,
  _x: number,
  _y: number,
  _ancho: number,
  _alto: number,
  _radio: number,
): void {
  const r = Math.min(_radio, _ancho / 2, _alto / 2);
  _ctx.beginPath();
  _ctx.moveTo(_x + r, _y);
  _ctx.lineTo(_x + _ancho - r, _y);
  _ctx.quadraticCurveTo(_x + _ancho, _y, _x + _ancho, _y + r);
  _ctx.lineTo(_x + _ancho, _y + _alto - r);
  _ctx.quadraticCurveTo(
    _x + _ancho,
    _y + _alto,
    _x + _ancho - r,
    _y + _alto,
  );
  _ctx.lineTo(_x + r, _y + _alto);
  _ctx.quadraticCurveTo(_x, _y + _alto, _x, _y + _alto - r);
  _ctx.lineTo(_x, _y + r);
  _ctx.quadraticCurveTo(_x, _y, _x + r, _y);
  _ctx.closePath();
}

function renderizarEtiquetaEnCanvas(
  _canvas: HTMLCanvasElement,
  _opciones: OpcionesEtiquetaSprite,
): void {
  const ctx = _canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, ANCHO_CANVAS, ALTO_CANVAS);

  const mostrar_pildora = _opciones.mostrar_pildora ?? true;
  const tamano_principal = _opciones.texto.length > 3 ? 42 : 52;
  const tamano_subindice = 30;
  const fuente_principal = `700 ${tamano_principal}px "Space Grotesk", "Inter", system-ui, sans-serif`;
  const fuente_subindice = `600 ${tamano_subindice}px "JetBrains Mono", ui-monospace, monospace`;

  ctx.font = fuente_principal;
  const ancho_principal = ctx.measureText(_opciones.texto).width;

  let ancho_subindice = 0;
  if (_opciones.subindice) {
    ctx.font = fuente_subindice;
    ancho_subindice = ctx.measureText(_opciones.subindice).width + 3;
  }

  const ancho_contenido = ancho_principal + ancho_subindice;
  const centro_x = ANCHO_CANVAS / 2;
  const centro_y = ALTO_CANVAS / 2 + (_opciones.es_vector ? 6 : 2);

  if (mostrar_pildora) {
    const ancho_pildora = Math.min(
      ANCHO_CANVAS - 12,
      Math.max(96, ancho_contenido + 54),
    );
    const alto_pildora = 88;
    const x_pildora = (ANCHO_CANVAS - ancho_pildora) / 2;
    const y_pildora = (ALTO_CANVAS - alto_pildora) / 2;

    dibujarPildoraRedondeada(
      ctx,
      x_pildora,
      y_pildora,
      ancho_pildora,
      alto_pildora,
      24,
    );
    ctx.fillStyle = _opciones.color_fondo ?? "rgba(6, 10, 19, 0.86)";
    ctx.fill();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = _opciones.color_borde ?? _opciones.color_texto;
    ctx.globalAlpha = 0.72;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const x_inicio = centro_x - ancho_contenido / 2;

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = _opciones.color_texto;
  ctx.font = fuente_principal;
  ctx.fillText(_opciones.texto, x_inicio, centro_y);

  if (_opciones.subindice) {
    ctx.font = fuente_subindice;
    ctx.fillText(
      _opciones.subindice,
      x_inicio + ancho_principal + 3,
      centro_y + 16,
    );
  }

  if (_opciones.es_vector) {
    const y_flecha = centro_y - tamano_principal * 0.54;
    const x_flecha_ini = x_inicio + 2;
    const x_flecha_fin = x_inicio + ancho_principal - 1;

    ctx.strokeStyle = _opciones.color_texto;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x_flecha_ini, y_flecha);
    ctx.lineTo(x_flecha_fin, y_flecha);
    ctx.lineTo(x_flecha_fin - 8, y_flecha - 6);
    ctx.moveTo(x_flecha_fin, y_flecha);
    ctx.lineTo(x_flecha_fin - 8, y_flecha + 6);
    ctx.stroke();
  }
}

export function crearEtiquetaSprite(
  _opciones: OpcionesEtiquetaSprite,
): EtiquetaSpriteCientifica {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO_CANVAS;
  canvas.height = ALTO_CANVAS;

  const opciones_actuales: OpcionesEtiquetaSprite = { ..._opciones };
  renderizarEtiquetaEnCanvas(canvas, opciones_actuales);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.minFilter = THREE.LinearFilter;
  textura.magFilter = THREE.LinearFilter;
  textura.generateMipmaps = false;
  textura.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: textura,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false,
  });

  const escala_mundo = _opciones.escala_mundo ?? 0.42;
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(
    escala_mundo * (ANCHO_CANVAS / ALTO_CANVAS),
    escala_mundo,
    1,
  );
  sprite.renderOrder = 25;

  const actualizarTexto = (_texto: string, _subindice?: string): void => {
    if (
      opciones_actuales.texto === _texto &&
      opciones_actuales.subindice === _subindice
    ) {
      return;
    }
    opciones_actuales.texto = _texto;
    opciones_actuales.subindice = _subindice;
    renderizarEtiquetaEnCanvas(canvas, opciones_actuales);
    textura.needsUpdate = true;
  };

  const actualizarOpacidad = (_opacidad: number): void => {
    material.opacity = THREE.MathUtils.clamp(_opacidad, 0, 1);
  };

  const liberar = (): void => {
    textura.dispose();
    material.dispose();
  };

  return {
    sprite,
    textura,
    material,
    actualizarTexto,
    actualizarOpacidad,
    liberar,
  };
}
