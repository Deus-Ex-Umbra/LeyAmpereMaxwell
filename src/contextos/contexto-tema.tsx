"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type TemaLaboratorio = "oscuro" | "claro";

export const CLAVE_ALMACENAMIENTO_TEMA = "zmaxwell-tema";
const COLOR_META_OSCURO = "#060a13";
const COLOR_META_CLARO = "#f8fafc";

export interface ValorContextoTema {
  tema: TemaLaboratorio;
  es_claro: boolean;
  establecerTema: (_nuevo_tema: TemaLaboratorio) => void;
  alternarTema: () => void;
}

const ContextoTema = createContext<ValorContextoTema | null>(null);

const oyentes_tema = new Set<() => void>();

function emitirCambioTema(): void {
  for (const oyente of oyentes_tema) {
    oyente();
  }
}

function suscribirTema(_alCambiar: () => void): () => void {
  oyentes_tema.add(_alCambiar);
  const manejarAlmacenamiento = (_evento: StorageEvent): void => {
    if (_evento.key === CLAVE_ALMACENAMIENTO_TEMA) {
      aplicarClaseDocumento(
        _evento.newValue === "claro" ? "claro" : "oscuro",
        false,
      );
      emitirCambioTema();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", manejarAlmacenamiento);
  }
  return () => {
    oyentes_tema.delete(_alCambiar);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", manejarAlmacenamiento);
    }
  };
}

function leerTemaActualCliente(): TemaLaboratorio {
  if (typeof document === "undefined") {
    return "oscuro";
  }
  return document.documentElement.classList.contains("claro")
    ? "claro"
    : "oscuro";
}

function leerTemaServidor(): TemaLaboratorio {
  return "oscuro";
}

function aplicarClaseDocumento(
  _tema: TemaLaboratorio,
  _guardar_en_almacen: boolean,
): void {
  if (typeof document === "undefined") {
    return;
  }
  const raiz = document.documentElement;
  if (_tema === "claro") {
    raiz.classList.remove("dark");
    raiz.classList.add("claro");
  } else {
    raiz.classList.remove("claro");
    raiz.classList.add("dark");
  }

  const etiqueta_meta = document.querySelector('meta[name="theme-color"]');
  if (etiqueta_meta) {
    etiqueta_meta.setAttribute(
      "content",
      _tema === "claro" ? COLOR_META_CLARO : COLOR_META_OSCURO,
    );
  }

  if (_guardar_en_almacen && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CLAVE_ALMACENAMIENTO_TEMA, _tema);
    } catch {
      // Ignora restricciones de almacenamiento privado.
    }
  }
}

export function ProveedorTema(
  _propiedades: Readonly<{ children: ReactNode }>,
) {
  const { children } = _propiedades;
  const tema = useSyncExternalStore(
    suscribirTema,
    leerTemaActualCliente,
    leerTemaServidor,
  );

  const establecerTema = useCallback((_nuevo_tema: TemaLaboratorio) => {
    aplicarClaseDocumento(_nuevo_tema, true);
    emitirCambioTema();
  }, []);

  const alternarTema = useCallback(() => {
    const siguiente: TemaLaboratorio =
      leerTemaActualCliente() === "claro" ? "oscuro" : "claro";
    aplicarClaseDocumento(siguiente, true);
    emitirCambioTema();
  }, []);

  const valor = useMemo<ValorContextoTema>(
    () => ({
      tema,
      es_claro: tema === "claro",
      establecerTema,
      alternarTema,
    }),
    [tema, establecerTema, alternarTema],
  );

  return (
    <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>
  );
}

export function useTemaLaboratorio(): ValorContextoTema {
  const contexto = useContext(ContextoTema);
  const tema_directo = useSyncExternalStore(
    suscribirTema,
    leerTemaActualCliente,
    leerTemaServidor,
  );

  const establecerDirecto = useCallback((_nuevo_tema: TemaLaboratorio) => {
    aplicarClaseDocumento(_nuevo_tema, true);
    emitirCambioTema();
  }, []);

  const alternarDirecto = useCallback(() => {
    const siguiente: TemaLaboratorio =
      leerTemaActualCliente() === "claro" ? "oscuro" : "claro";
    aplicarClaseDocumento(siguiente, true);
    emitirCambioTema();
  }, []);

  return (
    contexto ?? {
      tema: tema_directo,
      es_claro: tema_directo === "claro",
      establecerTema: establecerDirecto,
      alternarTema: alternarDirecto,
    }
  );
}
