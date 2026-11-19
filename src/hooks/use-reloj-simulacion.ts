"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface OpcionesRelojSimulacion {
  en_reproduccion_inicial?: boolean;
  velocidad_inicial?: number;
  tiempo_inicial?: number;
  frecuencia_angular_visual?: number;
  max_dt_segundos?: number;
}

export interface ResultadoRelojSimulacion {
  en_reproduccion: boolean;
  velocidad_tiempo: number;
  tiempo_simulado: number;
  fase_animacion: number;
  alternarReproduccion: () => void;
  establecerReproduccion: (_activo: boolean) => void;
  establecerVelocidad: (_velocidad: number) => void;
  reiniciarTiempo: (_tiempo_destino?: number) => void;
  ajustarTiempo: (_nuevo_tiempo: number) => void;
  ajustarFase: (_nueva_fase: number) => void;
}

const VELOCIDAD_MINIMA = 0.1;
const VELOCIDAD_MAXIMA = 4;
const FRECUENCIA_ANGULAR_DEFECTO = 1.2;
const MAX_DT_DEFECTO = 0.05;

function acotarVelocidad(_valor: number): number {
  if (!Number.isFinite(_valor)) {
    return 1;
  }
  return Math.min(VELOCIDAD_MAXIMA, Math.max(VELOCIDAD_MINIMA, _valor));
}

export function useRelojSimulacion(
  _opciones?: OpcionesRelojSimulacion,
): ResultadoRelojSimulacion {
  const frecuencia_angular = Math.max(
    _opciones?.frecuencia_angular_visual ?? FRECUENCIA_ANGULAR_DEFECTO,
    1e-4,
  );
  const max_dt = Math.max(_opciones?.max_dt_segundos ?? MAX_DT_DEFECTO, 0.005);

  const [en_reproduccion, setEnReproduccion] = useState<boolean>(
    _opciones?.en_reproduccion_inicial ?? true,
  );
  const [velocidad_tiempo, setVelocidadTiempo] = useState<number>(() =>
    acotarVelocidad(_opciones?.velocidad_inicial ?? 1),
  );
  const [tiempo_simulado, setTiempoSimulado] = useState<number>(
    _opciones?.tiempo_inicial ?? 0,
  );

  const velocidad_ref = useRef<number>(velocidad_tiempo);
  const ultimo_instante_ref = useRef<number | null>(null);
  const id_cuadro_ref = useRef<number | null>(null);

  useEffect(() => {
    velocidad_ref.current = velocidad_tiempo;
  }, [velocidad_tiempo]);

  useEffect(() => {
    if (!en_reproduccion) {
      ultimo_instante_ref.current = null;
      return;
    }

    const avanzarCuadro = (_marca_ms: number) => {
      if (ultimo_instante_ref.current !== null) {
        const dt_crudo = (_marca_ms - ultimo_instante_ref.current) * 0.001;
        // Acota saltos tras suspender la pestaña para preservar continuidad física.
        const dt_seguro = Math.min(Math.max(dt_crudo, 0), max_dt);
        if (dt_seguro > 0) {
          const incremento = dt_seguro * velocidad_ref.current;
          setTiempoSimulado((_anterior) => _anterior + incremento);
        }
      }
      ultimo_instante_ref.current = _marca_ms;
      id_cuadro_ref.current = window.requestAnimationFrame(avanzarCuadro);
    };

    ultimo_instante_ref.current = null;
    id_cuadro_ref.current = window.requestAnimationFrame(avanzarCuadro);

    return () => {
      if (id_cuadro_ref.current !== null) {
        window.cancelAnimationFrame(id_cuadro_ref.current);
        id_cuadro_ref.current = null;
      }
      ultimo_instante_ref.current = null;
    };
  }, [en_reproduccion, max_dt]);

  const alternarReproduccion = useCallback(() => {
    setEnReproduccion((_activo) => !_activo);
  }, []);

  const establecerReproduccion = useCallback((_activo: boolean) => {
    setEnReproduccion(_activo);
  }, []);

  const establecerVelocidad = useCallback((_velocidad: number) => {
    setVelocidadTiempo(acotarVelocidad(_velocidad));
  }, []);

  const reiniciarTiempo = useCallback((_tiempo_destino: number = 0) => {
    ultimo_instante_ref.current = null;
    setTiempoSimulado(Number.isFinite(_tiempo_destino) ? _tiempo_destino : 0);
  }, []);

  const ajustarTiempo = useCallback((_nuevo_tiempo: number) => {
    if (!Number.isFinite(_nuevo_tiempo)) {
      return;
    }
    ultimo_instante_ref.current = null;
    setTiempoSimulado(_nuevo_tiempo);
  }, []);

  const ajustarFase = useCallback(
    (_nueva_fase: number) => {
      if (!Number.isFinite(_nueva_fase)) {
        return;
      }
      ultimo_instante_ref.current = null;
      setTiempoSimulado(_nueva_fase / frecuencia_angular);
    },
    [frecuencia_angular],
  );

  return {
    en_reproduccion,
    velocidad_tiempo,
    tiempo_simulado,
    fase_animacion: tiempo_simulado * frecuencia_angular,
    alternarReproduccion,
    establecerReproduccion,
    establecerVelocidad,
    reiniciarTiempo,
    ajustarTiempo,
    ajustarFase,
  };
}
