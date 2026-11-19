"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Box,
  Crosshair,
  Eye,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { COLORES_VECTORES, formatearUnidadSI } from "@/lib/fisica";
import { soportaWebGLCliente, type PresetCamaraEscena } from "@/lib/three";
import { combinarClases } from "@/lib/utils";
import type {
  CapasVisibles3D,
  EscenarioLaboratorio,
  InstantaneaCapacitor,
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ParametrosOndaEM,
  ResultadoGeometriaAmpere,
  ResultadoOndaEM,
} from "@/tipos";
import {
  VisorCapacitor3D,
  type ComandoCamara3D,
} from "./visor-capacitor-3d";
import { VisorGeometrias3D } from "./visor-geometrias-3d";
import { VisorOndaEM3D } from "./visor-onda-em-3d";

export interface PropiedadesContenedorEscena3D {
  escenario: EscenarioLaboratorio;
  parametros_capacitor: ParametrosCapacitor;
  instantanea_capacitor: InstantaneaCapacitor;
  parametros_geometria: ParametrosGeometriaAmpere;
  resultado_geometria: ResultadoGeometriaAmpere;
  parametros_onda: ParametrosOndaEM;
  resultado_onda: ResultadoOndaEM;
  capas_visibles: CapasVisibles3D;
  fase_animacion: number;
  en_reproduccion: boolean;
  termino_resaltado?: string | null;
  clase_extra?: string;
}

interface ElementoLeyenda3D {
  id: string;
  simbolo: string;
  nombre: string;
  color: string;
  claves_resaltado: readonly string[];
}

const TITULOS_ESCENARIO: Record<EscenarioLaboratorio, string> = {
  capacitor_paradoja: "Capacitor · Paradoja de Ampère-Maxwell",
  geometrias_ampere: "Geometrías Clásicas de Ampère",
  onda_electromagnetica: "Onda Electromagnética Acoplada",
};

const BOTONES_CAMARA: ReadonlyArray<{
  id: PresetCamaraEscena;
  etiqueta: string;
  icono: "perspectiva" | "axial" | "frontal" | "reiniciar";
}> = [
  { id: "perspectiva", etiqueta: "Perspectiva", icono: "perspectiva" },
  { id: "axial", etiqueta: "Axial", icono: "axial" },
  { id: "frontal", etiqueta: "Frontal", icono: "frontal" },
  { id: "reiniciar", etiqueta: "Reiniciar", icono: "reiniciar" },
];

function suscribirSoporteWebGL(): () => void {
  return () => undefined;
}

function obtenerSoporteServidor(): boolean {
  return true;
}

function construirLeyendaActiva(
  _escenario: EscenarioLaboratorio,
  _capas: CapasVisibles3D,
  _maxwell_capacitor: boolean,
  _superficie_capacitor: ParametrosCapacitor["superficie_activa"],
  _maxwell_onda: boolean,
): ElementoLeyenda3D[] {
  const lista: ElementoLeyenda3D[] = [];

  if (_escenario === "capacitor_paradoja") {
    if (_capas.mostrar_e) {
      lista.push({
        id: "e",
        simbolo: "E",
        nombre: "Campo eléctrico",
        color: COLORES_VECTORES.e,
        claves_resaltado: ["campo_electrico", "campo_e", "flujo_electrico"],
      });
    }
    if (_capas.mostrar_d) {
      lista.push({
        id: "d",
        simbolo: "D",
        nombre: "Desplazamiento",
        color: COLORES_VECTORES.d,
        claves_resaltado: ["desplazamiento_d", "campo_electrico"],
      });
    }
    if (_capas.mostrar_b_h) {
      lista.push({
        id: "bh",
        simbolo: "B / H",
        nombre: "Campo magnético",
        color: COLORES_VECTORES.b,
        claves_resaltado: [
          "rotacional_h",
          "circulacion_h",
          "campo_magnetico",
          "campo_b",
          "campo_h",
        ],
      });
    }
    if (_capas.mostrar_jc) {
      lista.push({
        id: "jc",
        simbolo: "Jc",
        nombre: "Conducción",
        color: COLORES_VECTORES.jc,
        claves_resaltado: ["corriente_conduccion", "densidad_jc"],
      });
    }
    if (_capas.mostrar_jd && _maxwell_capacitor) {
      lista.push({
        id: "jd",
        simbolo: "Jd",
        nombre: "Desplazamiento ∂D/∂t",
        color: COLORES_VECTORES.jd,
        claves_resaltado: [
          "corriente_desplazamiento",
          "densidad_jd",
          "flujo_electrico",
        ],
      });
    }
    if (_capas.mostrar_poynting) {
      lista.push({
        id: "n",
        simbolo: "N",
        nombre: "Poynting E×H",
        color: COLORES_VECTORES.n,
        claves_resaltado: ["poynting", "vector_n"],
      });
    }
    if (_capas.mostrar_lazo_y_superficie) {
      lista.push({
        id: "lazo",
        simbolo: "C",
        nombre: "Lazo amperiano",
        color: COLORES_VECTORES.lazo,
        claves_resaltado: ["rotacional_h", "circulacion_h"],
      });
      if (_superficie_capacitor === "S1" || _superficie_capacitor === "ambas") {
        lista.push({
          id: "s1",
          simbolo: "S₁",
          nombre: "Superficie plana",
          color: "#14b8a6",
          claves_resaltado: ["corriente_conduccion"],
        });
      }
      if (_superficie_capacitor === "S2" || _superficie_capacitor === "ambas") {
        lista.push({
          id: "s2",
          simbolo: "S₂",
          nombre: "Superficie abombada",
          color: COLORES_VECTORES.s2,
          claves_resaltado: ["corriente_desplazamiento"],
        });
      }
    }
    return lista;
  }

  if (_escenario === "geometrias_ampere") {
    if (_capas.mostrar_b_h) {
      lista.push({
        id: "bh",
        simbolo: "B / H",
        nombre: "Campo magnético",
        color: COLORES_VECTORES.b,
        claves_resaltado: ["rotacional_h", "circulacion_h", "campo_magnetico"],
      });
    }
    if (_capas.mostrar_jc) {
      lista.push({
        id: "jc",
        simbolo: "Jc",
        nombre: "Corriente libre",
        color: COLORES_VECTORES.jc,
        claves_resaltado: ["corriente_conduccion", "densidad_jc"],
      });
    }
    if (_capas.mostrar_lazo_y_superficie) {
      lista.push({
        id: "lazo",
        simbolo: "C",
        nombre: "Lazo amperiano",
        color: COLORES_VECTORES.lazo,
        claves_resaltado: ["rotacional_h", "circulacion_h"],
      });
    }
    return lista;
  }

  if (_capas.mostrar_e) {
    lista.push({
      id: "e",
      simbolo: "E",
      nombre: "Campo eléctrico",
      color: COLORES_VECTORES.e,
      claves_resaltado: ["campo_electrico", "campo_e"],
    });
  }
  if (_capas.mostrar_b_h && _maxwell_onda) {
    lista.push({
      id: "bh",
      simbolo: "B / H",
      nombre: "Campo magnético",
      color: COLORES_VECTORES.b,
      claves_resaltado: ["rotacional_h", "campo_magnetico"],
    });
  }
  if (_capas.mostrar_poynting && _maxwell_onda) {
    lista.push({
      id: "n",
      simbolo: "N",
      nombre: "Poynting E×H",
      color: COLORES_VECTORES.n,
      claves_resaltado: ["poynting", "vector_n"],
    });
  }
  if (_capas.mostrar_lazo_y_superficie) {
    lista.push({
      id: "maxwell",
      simbolo: "∂D/∂t",
      nombre: "Acoplamiento Maxwell",
      color: COLORES_VECTORES.jd,
      claves_resaltado: ["corriente_desplazamiento"],
    });
  }
  return lista;
}

function IconoCamara(_propiedades: {
  tipo: "perspectiva" | "axial" | "frontal" | "reiniciar";
}) {
  const { tipo } = _propiedades;
  if (tipo === "perspectiva") {
    return <Box className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (tipo === "axial") {
    return <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (tipo === "frontal") {
    return <Eye className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />;
}

function RespaldoSinWebGL(_propiedades: {
  escenario: EscenarioLaboratorio;
  instantanea_capacitor: InstantaneaCapacitor;
  resultado_geometria: ResultadoGeometriaAmpere;
  resultado_onda: ResultadoOndaEM;
}) {
  const {
    escenario,
    instantanea_capacitor,
    resultado_geometria,
    resultado_onda,
  } = _propiedades;

  const tarjetas: ReadonlyArray<{ etiqueta: string; valor: string }> =
    escenario === "capacitor_paradoja"
      ? [
          {
            etiqueta: "Corriente Ic (S₁)",
            valor: formatearUnidadSI(
              instantanea_capacitor.superficie_s1.corriente_conduccion,
              "A",
            ).texto,
          },
          {
            etiqueta: "Desplazamiento Id (S₂)",
            valor: formatearUnidadSI(
              instantanea_capacitor.superficie_s2.corriente_desplazamiento,
              "A",
            ).texto,
          },
        ]
      : escenario === "geometrias_ampere"
        ? [
            {
              etiqueta: "Campo H(ρ)",
              valor: formatearUnidadSI(resultado_geometria.campo_h, "A/m").texto,
            },
            {
              etiqueta: "Campo B(ρ)",
              valor: formatearUnidadSI(resultado_geometria.campo_b, "T").texto,
            },
          ]
        : [
            {
              etiqueta: "Velocidad de fase",
              valor: formatearUnidadSI(resultado_onda.velocidad_fase, "m/s").texto,
            },
            {
              etiqueta: "Longitud de onda λ",
              valor: formatearUnidadSI(resultado_onda.longitud_onda, "m").texto,
            },
          ];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-ambar-destacar/40 bg-ambar-destacar/10 text-ambar-destacar">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-1.5">
        <h3 className="font-display text-base font-semibold text-texto-principal">
          Contexto WebGL no disponible en este navegador
        </h3>
        <p className="text-xs leading-relaxed text-texto-secundario">
          La simulación electromagnética continúa ejecutándose con precisión
          completa. Habilitá aceleración por hardware para inspeccionar la
          escena 3D interactiva.
        </p>
      </div>
      <div className="grid w-full max-w-md grid-cols-2 gap-2.5 text-left font-mono text-xs">
        {tarjetas.map((_tarjeta) => (
          <div
            key={_tarjeta.etiqueta}
            className="rounded-lg border border-borde-panel bg-panel/70 p-2.5"
          >
            <span className="block text-[10px] uppercase text-texto-tenue">
              {_tarjeta.etiqueta}
            </span>
            <span className="text-texto-principal">{_tarjeta.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsigniasEstadoEscena(_propiedades: {
  escenario: EscenarioLaboratorio;
  en_reproduccion: boolean;
  hay_paradoja: boolean;
  hay_ruptura: boolean;
  esta_apantallado: boolean;
  onda_colapsada: boolean;
}) {
  const {
    escenario,
    en_reproduccion,
    hay_paradoja,
    hay_ruptura,
    esta_apantallado,
    onda_colapsada,
  } = _propiedades;

  return (
    <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-[60%] flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-lg border border-borde-panel bg-fondo-base/82 px-2.5 py-1 font-mono text-[11px] font-medium text-texto-principal backdrop-blur-md">
        <span
          aria-hidden="true"
          className={combinarClases(
            "h-1.5 w-1.5 rounded-full",
            en_reproduccion ? "animate-pulse bg-azul-activo" : "bg-texto-tenue",
          )}
        />
        {TITULOS_ESCENARIO[escenario]}
      </span>

      {hay_paradoja && (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-rojo-anulado/50 bg-rojo-anulado/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-rojo-anulado backdrop-blur-md">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Paradoja S₁ ≠ S₂
        </span>
      )}

      {hay_ruptura && (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-rojo-anulado/60 bg-rojo-anulado/20 px-2.5 py-1 font-mono text-[11px] font-semibold text-rojo-anulado backdrop-blur-md">
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          Ruptura dieléctrica
        </span>
      )}

      {esta_apantallado && (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-verde-inducido/45 bg-verde-inducido/15 px-2.5 py-1 font-mono text-[11px] font-medium text-verde-inducido backdrop-blur-md">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Exterior apantallado (H = 0)
        </span>
      )}

      {onda_colapsada && (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-rojo-anulado/50 bg-rojo-anulado/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-rojo-anulado backdrop-blur-md">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Sin ∂D/∂t: onda colapsada
        </span>
      )}
    </div>
  );
}

function BarraInferiorEscena(_propiedades: {
  leyenda_activa: readonly ElementoLeyenda3D[];
  termino_resaltado: string | null;
  webgl_disponible: boolean;
}) {
  const { leyenda_activa, termino_resaltado, webgl_disponible } = _propiedades;
  if (leyenda_activa.length === 0 && !webgl_disponible) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-end justify-between gap-2">
      {leyenda_activa.length > 0 ? (
        <div
          aria-label="Leyenda cromática de vectores activos"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-borde-panel bg-fondo-base/82 px-2.5 py-1.5 backdrop-blur-md"
        >
          {leyenda_activa.map((_item) => {
            const resaltado_activo = Boolean(
              termino_resaltado &&
                _item.claves_resaltado.includes(termino_resaltado),
            );
            return (
              <span
                key={_item.id}
                className={combinarClases(
                  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                  resaltado_activo
                    ? "bg-panel-suave text-texto-principal ring-1 ring-azul-activo/60"
                    : "text-texto-secundario",
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: _item.color,
                    boxShadow: `0 0 8px ${_item.color}`,
                  }}
                />
                <strong className="font-semibold text-texto-principal">
                  {_item.simbolo}
                </strong>
                <span className="hidden text-[10px] text-texto-tenue md:inline">
                  {_item.nombre}
                </span>
              </span>
            );
          })}
        </div>
      ) : (
        <span />
      )}

      {webgl_disponible && (
        <div className="hidden shrink-0 rounded-lg border border-borde-panel/70 bg-fondo-base/75 px-2.5 py-1 font-mono text-[10px] text-texto-tenue backdrop-blur-sm lg:block">
          Arrastrar: rotar · Rueda: zoom · Clic der.: mover
        </div>
      )}
    </div>
  );
}

export function ContenedorEscena3D(
  _propiedades: PropiedadesContenedorEscena3D,
) {
  const {
    escenario,
    parametros_capacitor,
    instantanea_capacitor,
    parametros_geometria,
    resultado_geometria,
    parametros_onda,
    resultado_onda,
    capas_visibles,
    fase_animacion,
    en_reproduccion,
    termino_resaltado = null,
    clase_extra,
  } = _propiedades;

  const soporta_webgl_navegador = useSyncExternalStore(
    suscribirSoporteWebGL,
    soportaWebGLCliente,
    obtenerSoporteServidor,
  );
  const [fallo_ejecucion_webgl, setFalloEjecucionWebgl] = useState(false);
  const [comando_camara, setComandoCamara] = useState<ComandoCamara3D>({
    preset: "perspectiva",
    secuencia: 0,
  });

  const manejarFalloWebGL = useCallback(() => {
    setFalloEjecucionWebgl(true);
  }, []);

  const seleccionarCamara = useCallback((_preset: PresetCamaraEscena) => {
    setComandoCamara((_anterior) => ({
      preset: _preset,
      secuencia: _anterior.secuencia + 1,
    }));
  }, []);

  const leyenda_activa = useMemo(
    () =>
      construirLeyendaActiva(
        escenario,
        capas_visibles,
        parametros_capacitor.incluir_maxwell,
        parametros_capacitor.superficie_activa,
        parametros_onda.incluir_maxwell,
      ),
    [
      escenario,
      capas_visibles,
      parametros_capacitor.incluir_maxwell,
      parametros_capacitor.superficie_activa,
      parametros_onda.incluir_maxwell,
    ],
  );

  const webgl_disponible = soporta_webgl_navegador && !fallo_ejecucion_webgl;

  return (
    <div
      className={combinarClases(
        "relative h-[440px] w-full overflow-hidden rounded-2xl border border-borde-panel bg-[#060a13] shadow-[0_18px_48px_-16px_rgba(2,6,23,0.9)] sm:h-[520px]",
        clase_extra,
      )}
    >
      <div className="absolute inset-0 h-full w-full">
        {!webgl_disponible ? (
          <RespaldoSinWebGL
            escenario={escenario}
            instantanea_capacitor={instantanea_capacitor}
            resultado_geometria={resultado_geometria}
            resultado_onda={resultado_onda}
          />
        ) : escenario === "capacitor_paradoja" ? (
          <VisorCapacitor3D
            parametros={parametros_capacitor}
            instantanea={instantanea_capacitor}
            capas_visibles={capas_visibles}
            fase_animacion={fase_animacion}
            en_reproduccion={en_reproduccion}
            termino_resaltado={termino_resaltado}
            comando_camara={comando_camara}
            alFallarWebGL={manejarFalloWebGL}
          />
        ) : escenario === "geometrias_ampere" ? (
          <VisorGeometrias3D
            parametros={parametros_geometria}
            resultado={resultado_geometria}
            capas_visibles={capas_visibles}
            fase_animacion={fase_animacion}
            en_reproduccion={en_reproduccion}
            termino_resaltado={termino_resaltado}
            comando_camara={comando_camara}
            alFallarWebGL={manejarFalloWebGL}
          />
        ) : (
          <VisorOndaEM3D
            parametros={parametros_onda}
            resultado={resultado_onda}
            capas_visibles={capas_visibles}
            fase_animacion={fase_animacion}
            en_reproduccion={en_reproduccion}
            termino_resaltado={termino_resaltado}
            comando_camara={comando_camara}
            alFallarWebGL={manejarFalloWebGL}
          />
        )}
      </div>

      <InsigniasEstadoEscena
        escenario={escenario}
        en_reproduccion={en_reproduccion}
        hay_paradoja={
          escenario === "capacitor_paradoja" && instantanea_capacitor.hay_paradoja
        }
        hay_ruptura={
          escenario === "capacitor_paradoja" &&
          instantanea_capacitor.hay_ruptura_dielectrica
        }
        esta_apantallado={
          escenario === "geometrias_ampere" && resultado_geometria.esta_apantallado
        }
        onda_colapsada={
          escenario === "onda_electromagnetica" && !parametros_onda.incluir_maxwell
        }
      />

      {webgl_disponible && (
        <div
          role="toolbar"
          aria-label="Controles de cámara 3D"
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-xl border border-borde-panel bg-fondo-base/82 p-1 backdrop-blur-md"
        >
          {BOTONES_CAMARA.map((_boton) => {
            const activo =
              _boton.id !== "reiniciar" && comando_camara.preset === _boton.id;
            return (
              <button
                key={_boton.id}
                type="button"
                onClick={() => seleccionarCamara(_boton.id)}
                title={_boton.etiqueta}
                className={combinarClases(
                  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
                  activo
                    ? "bg-azul-activo/18 text-azul-activo ring-1 ring-azul-activo/40"
                    : "text-texto-secundario hover:bg-panel/80 hover:text-texto-principal",
                )}
              >
                <IconoCamara tipo={_boton.icono} />
                <span className="hidden sm:inline">{_boton.etiqueta}</span>
              </button>
            );
          })}
        </div>
      )}

      <BarraInferiorEscena
        leyenda_activa={leyenda_activa}
        termino_resaltado={termino_resaltado}
        webgl_disponible={webgl_disponible}
      />
    </div>
  );
}
