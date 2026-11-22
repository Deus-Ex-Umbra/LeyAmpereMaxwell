"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RotateCw, Zap } from "lucide-react";

interface FragmentoGlitch {
  id: number;
  arriba_pct: number;
  izquierda_pct: number;
  ancho_px: number;
  alto_px: number;
  color_hex: string;
}

const RUTA_IMAGEN_GATO = "/imagenes/gato-mantenimiento.jpg";
const COLORES_FRAGMENTOS = ["#00f0ff", "#ff0055", "#ccff00"] as const;
const DURACION_RAFAGA_GLITCH_MS = 420;
const INTERVALO_AUTO_GLITCH_MS = 3200;

function suscribirCambioUrl(_alCambiar: () => void): () => void {
  window.addEventListener("popstate", _alCambiar);
  window.addEventListener("hashchange", _alCambiar);
  return () => {
    window.removeEventListener("popstate", _alCambiar);
    window.removeEventListener("hashchange", _alCambiar);
  };
}

function leerEstadoBloqueoCliente(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("lock") === "1";
}

function leerEstadoBloqueoServidor(): boolean {
  return false;
}

function IconoAranaHud() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 7.5a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm0 4.6a2.8 2.8 0 0 0-2.6 2.9c0 1.8 1.2 3.4 2.6 3.4s2.6-1.6 2.6-3.4a2.8 2.8 0 0 0-2.6-2.9ZM9.5 10.2 5.4 7.3 4 4.2l1.4-.6 1.2 2.6 3.5 2.4-.6 1.6Zm5 0-.6-1.6 3.5-2.4 1.2-2.6 1.4.6-1.4 3.1-4.1 2.9Zm-5.4 2.2-4.6.4-2.1 2.6 1.2 1 1.6-2 3.8-.3.1-1.7Zm5.8 0 .1 1.7 3.8.3 1.6 2 1.2-1-2.1-2.6-4.6-.4Zm-5.5 2.7-3.4 2.7-.8 3.1 1.5.4.6-2.4 2.9-2.3-.8-1.5Zm5.2 0-.8 1.5 2.9 2.3.6 2.4 1.5-.4-.8-3.1-3.4-2.7Z" />
    </svg>
  );
}

export function PantallaBloqueoGlitch() {
  const bloqueo_activo = useSyncExternalStore(
    suscribirCambioUrl,
    leerEstadoBloqueoCliente,
    leerEstadoBloqueoServidor,
  );
  const [en_glitch, setEnGlitch] = useState(false);
  const [fragmentos_glitch, setFragmentosGlitch] = useState<FragmentoGlitch[]>([]);
  const id_contador_ref = useRef(0);
  const temporizador_glitch_ref = useRef<number | null>(null);

  const dispararGlitch = useCallback(() => {
    if (temporizador_glitch_ref.current !== null) {
      window.clearTimeout(temporizador_glitch_ref.current);
    }

    const cantidad = 7 + Math.floor(Math.random() * 5);
    const nuevos_fragmentos: FragmentoGlitch[] = [];
    for (let indice = 0; indice < cantidad; indice += 1) {
      id_contador_ref.current += 1;
      nuevos_fragmentos.push({
        id: id_contador_ref.current,
        arriba_pct: 6 + Math.random() * 88,
        izquierda_pct: Math.random() * 88,
        ancho_px: 44 + Math.round(Math.random() * 126),
        alto_px: 3 + Math.round(Math.random() * 6),
        color_hex:
          COLORES_FRAGMENTOS[
            Math.floor(Math.random() * COLORES_FRAGMENTOS.length)
          ],
      });
    }

    setFragmentosGlitch(nuevos_fragmentos);
    setEnGlitch(true);

    temporizador_glitch_ref.current = window.setTimeout(() => {
      setEnGlitch(false);
      setFragmentosGlitch([]);
      temporizador_glitch_ref.current = null;
    }, DURACION_RAFAGA_GLITCH_MS);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    if (bloqueo_activo) {
      raiz.classList.add("bloqueo-dimensional");
    } else {
      raiz.classList.remove("bloqueo-dimensional");
    }
    return () => {
      raiz.classList.remove("bloqueo-dimensional");
    };
  }, [bloqueo_activo]);

  useEffect(() => {
    if (!bloqueo_activo) {
      return;
    }

    const id_inicial = window.setTimeout(() => {
      dispararGlitch();
    }, 360);

    const id_intervalo = window.setInterval(() => {
      dispararGlitch();
    }, INTERVALO_AUTO_GLITCH_MS);

    return () => {
      window.clearTimeout(id_inicial);
      window.clearInterval(id_intervalo);
      if (temporizador_glitch_ref.current !== null) {
        window.clearTimeout(temporizador_glitch_ref.current);
        temporizador_glitch_ref.current = null;
      }
    };
  }, [bloqueo_activo, dispararGlitch]);

  const manejarReintentar = useCallback(() => {
    dispararGlitch();
    window.setTimeout(() => {
      window.location.reload();
    }, 280);
  }, [dispararGlitch]);

  if (!bloqueo_activo) {
    return null;
  }

  return (
    <div
      id="capa-sistema-bloqueo"
      className={`sv-escenario ${en_glitch ? "es-glitch" : ""}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-bloqueo-dimensional"
    >
      <div className="sv-halftone" aria-hidden="true" />
      <div className="sv-scanlines" aria-hidden="true" />

      <div className="sv-portal" aria-hidden="true">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon
            points="200,14 338,72 386,200 338,328 200,386 62,328 14,200 62,72"
            stroke="#00f0ff"
            strokeWidth="1.4"
            strokeDasharray="10 8"
            opacity="0.45"
          />
          <polygon
            points="200,38 318,86 362,200 318,314 200,362 82,314 38,200 82,86"
            stroke="#ff0055"
            strokeWidth="1.4"
            strokeDasharray="14 6"
            opacity="0.42"
          />
          <circle
            cx="200"
            cy="200"
            r="142"
            stroke="#ccff00"
            strokeWidth="1"
            strokeDasharray="4 10"
            opacity="0.38"
          />
          <path
            d="M200 10 L200 390 M10 200 L390 200 M65 65 L335 335 M335 65 L65 335"
            stroke="#8b5cf6"
            strokeWidth="0.7"
            opacity="0.28"
          />
        </svg>
      </div>

      <div className="sv-fragmentos" aria-hidden="true">
        {fragmentos_glitch.map((_frag) => (
          <div
            key={_frag.id}
            className="sv-frag"
            style={{
              top: `${_frag.arriba_pct}%`,
              left: `${_frag.izquierda_pct}%`,
              width: `${_frag.ancho_px}px`,
              height: `${_frag.alto_px}px`,
              backgroundColor: _frag.color_hex,
              color: _frag.color_hex,
            }}
          />
        ))}
      </div>

      <div className="sv-tarjeta">
        <div className="sv-hud">
          <span className="inline-flex items-center gap-1.5">
            <IconoAranaHud />
            TIERRA-591 // MULTIVERSO
          </span>
          <span className="sv-codigo">ERR_CANON_928</span>
        </div>

        <div className="sv-marca">
          <Zap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Ley de Ampère-Maxwell</span>
        </div>

        <button
          type="button"
          onClick={dispararGlitch}
          title="Anomalía dimensional detectada"
          aria-label="Activar distorsión dimensional en la imagen"
          className="sv-caja-gato"
        >
          <Image
            src={RUTA_IMAGEN_GATO}
            alt="Error, lo estamos solucionando pronto"
            width={224}
            height={224}
            priority
            unoptimized
            className="sv-img-base"
          />
          <Image
            src={RUTA_IMAGEN_GATO}
            alt=""
            width={224}
            height={224}
            priority
            unoptimized
            aria-hidden="true"
            className="sv-img-capa sv-img-cian"
          />
          <Image
            src={RUTA_IMAGEN_GATO}
            alt=""
            width={224}
            height={224}
            priority
            unoptimized
            aria-hidden="true"
            className="sv-img-capa sv-img-magenta"
          />
          <div className="sv-img-slice" aria-hidden="true" />
          <span className="sv-etiqueta-comic" aria-hidden="true">
            GLITCH!
          </span>
        </button>

        <div className="sv-insignia">
          <span className="sv-punto" aria-hidden="true" />
          Anomalía Dimensional • Mantenimiento en Curso
        </div>

        <h1
          id="titulo-bloqueo-dimensional"
          className="sv-titulo sv-texto-glitch"
          data-text="Error, lo estamos solucionando pronto"
        >
          Error, <span>lo estamos solucionando pronto</span>
        </h1>

        <p className="sv-descripcion">
          Se detectó una brecha temporal en la plataforma. Estamos recalibrando
          los portales del sistema; por seguridad y estabilidad, el simulador y
          las demás páginas están temporalmente suspendidas.
        </p>

        <button
          type="button"
          onClick={manejarReintentar}
          className="sv-boton"
        >
          <RotateCw className="h-4 w-4 shrink-0" aria-hidden="true" />
          Reintentar conexión
        </button>

        <div className="sv-pie">
          Next.js 16.4.6 • React 19.3.1 • Tierra-591 • Ampère-Maxwell
        </div>
      </div>
    </div>
  );
}
