"use client";

import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { combinarClases } from "@/lib/utils";

export type ColorAcentoLaboratorio =
  | "azul"
  | "rojo"
  | "verde"
  | "morado"
  | "naranja"
  | "ambar";

export interface PropiedadesDeslizadorParametro {
  etiqueta: string;
  simbolo_latex?: string;
  valor: number;
  valor_formateado?: string;
  minimo: number;
  maximo: number;
  paso: number;
  escala_logaritmica?: boolean;
  color_acento?: ColorAcentoLaboratorio;
  descripcion?: string;
  etiqueta_minimo?: string;
  etiqueta_maximo?: string;
  mostrar_botones_finos?: boolean;
  deshabilitado?: boolean;
  clase_extra?: string;
  alCambiar: (_nuevo_valor: number) => void;
}

interface ConfiguracionColorAcento {
  texto: string;
  borde_lectura: string;
  fondo_lectura: string;
  barra_relleno: string;
  clases_perilla: string;
  color_acento_css: string;
}

const RESOLUCION_ESCALA_LOG = 1000;
const FACTOR_PASO_LOG_FINO = 1.05;

const ESTILOS_ACENTO: Record<ColorAcentoLaboratorio, ConfiguracionColorAcento> = {
  azul: {
    texto: "text-azul-activo",
    borde_lectura: "border-azul-activo/35",
    fondo_lectura: "bg-azul-activo/10",
    barra_relleno: "bg-azul-activo",
    clases_perilla:
      "[&::-webkit-slider-thumb]:border-azul-activo [&::-moz-range-thumb]:border-azul-activo",
    color_acento_css: "#38bdf8",
  },
  rojo: {
    texto: "text-rojo-anulado",
    borde_lectura: "border-rojo-anulado/35",
    fondo_lectura: "bg-rojo-anulado/10",
    barra_relleno: "bg-rojo-anulado",
    clases_perilla:
      "[&::-webkit-slider-thumb]:border-rojo-anulado [&::-moz-range-thumb]:border-rojo-anulado",
    color_acento_css: "#f87171",
  },
  verde: {
    texto: "text-verde-inducido",
    borde_lectura: "border-verde-inducido/35",
    fondo_lectura: "bg-verde-inducido/10",
    barra_relleno: "bg-verde-inducido",
    clases_perilla:
      "[&::-webkit-slider-thumb]:border-verde-inducido [&::-moz-range-thumb]:border-verde-inducido",
    color_acento_css: "#34d399",
  },
  morado: {
    texto: "text-morado-frontera",
    borde_lectura: "border-morado-frontera/35",
    fondo_lectura: "bg-morado-frontera/10",
    barra_relleno: "bg-morado-frontera",
    clases_perilla:
      "[&::-webkit-slider-thumb]:border-morado-frontera [&::-moz-range-thumb]:border-morado-frontera",
    color_acento_css: "#c084fc",
  },
  naranja: {
    texto: "text-naranja-constante",
    borde_lectura: "border-naranja-constante/35",
    fondo_lectura: "bg-naranja-constante/10",
    barra_relleno: "bg-naranja-constante",
    clases_perilla:
      "[&::-webkit-slider-thumb]:border-naranja-constante [&::-moz-range-thumb]:border-naranja-constante",
    color_acento_css: "#fb923c",
  },
  ambar: {
    texto: "text-ambar-destacar",
    borde_lectura: "border-ambar-destacar/35",
    fondo_lectura: "bg-ambar-destacar/10",
    barra_relleno: "bg-ambar-destacar",
    clases_perilla:
      "[&::-webkit-slider-thumb]:border-ambar-destacar [&::-moz-range-thumb]:border-ambar-destacar",
    color_acento_css: "#fbbf24",
  },
};

function acotarValor(_valor: number, _minimo: number, _maximo: number): number {
  return Math.min(_maximo, Math.max(_minimo, _valor));
}

function redondearSegunPaso(_valor: number, _paso: number): number {
  if (_paso <= 0 || !Number.isFinite(_paso)) {
    return _valor;
  }
  const texto_paso = _paso.toString();
  const decimales = texto_paso.includes(".")
    ? texto_paso.split(".")[1].length
    : 0;
  return Number(_valor.toFixed(Math.min(decimales + 2, 10)));
}

function formatearExtremoCompacto(_valor: number): string {
  const magnitud = Math.abs(_valor);
  if (magnitud === 0) {
    return "0";
  }
  if (magnitud >= 1e4 || magnitud < 1e-2) {
    return _valor.toExponential(1);
  }
  return Number(_valor.toPrecision(4)).toString();
}

export function DeslizadorParametro(_propiedades: PropiedadesDeslizadorParametro) {
  const {
    etiqueta,
    simbolo_latex,
    valor,
    valor_formateado,
    minimo,
    maximo,
    paso,
    escala_logaritmica = false,
    color_acento = "azul",
    descripcion,
    etiqueta_minimo,
    etiqueta_maximo,
    mostrar_botones_finos = true,
    deshabilitado = false,
    clase_extra,
    alCambiar,
  } = _propiedades;

  const id_control = useId();
  const id_descripcion = useId();
  const estilo = ESTILOS_ACENTO[color_acento];

  const usa_log = escala_logaritmica && minimo > 0 && maximo > minimo;
  const valor_acotado = acotarValor(valor, minimo, maximo);

  let fraccion_progreso = 0;
  let valor_rango_interno = valor_acotado;

  if (usa_log) {
    const razon_total = Math.log(maximo / minimo);
    fraccion_progreso =
      razon_total > 0 ? Math.log(valor_acotado / minimo) / razon_total : 0;
    valor_rango_interno = Math.round(fraccion_progreso * RESOLUCION_ESCALA_LOG);
  } else {
    const amplitud = maximo - minimo;
    fraccion_progreso = amplitud > 0 ? (valor_acotado - minimo) / amplitud : 0;
  }

  const porcentaje_llenado = acotarValor(fraccion_progreso * 100, 0, 100);
  const lectura_visible = valor_formateado ?? formatearExtremoCompacto(valor_acotado);

  function manejarCambioRango(_valor_entrada: number): void {
    if (usa_log) {
      const fraccion = acotarValor(_valor_entrada / RESOLUCION_ESCALA_LOG, 0, 1);
      const valor_fisico = minimo * Math.pow(maximo / minimo, fraccion);
      alCambiar(acotarValor(valor_fisico, minimo, maximo));
      return;
    }
    alCambiar(acotarValor(redondearSegunPaso(_valor_entrada, paso), minimo, maximo));
  }

  function ajustarPasoFino(_direccion: -1 | 1): void {
    if (deshabilitado) {
      return;
    }
    if (usa_log) {
      const multiplicador =
        _direccion > 0 ? FACTOR_PASO_LOG_FINO : 1 / FACTOR_PASO_LOG_FINO;
      const siguiente = acotarValor(valor_acotado * multiplicador, minimo, maximo);
      alCambiar(siguiente);
      return;
    }
    const siguiente = acotarValor(
      redondearSegunPaso(valor_acotado + _direccion * paso, paso),
      minimo,
      maximo,
    );
    alCambiar(siguiente);
  }

  return (
    <div
      className={combinarClases(
        "flex flex-col gap-2 rounded-xl border border-borde-panel bg-fondo-base/55 px-3.5 py-3 transition-colors",
        deshabilitado ? "opacity-55" : "hover:border-slate-600/40",
        clase_extra,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id_control}
          className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-texto-principal"
        >
          <span className="truncate">{etiqueta}</span>
          {simbolo_latex && (
            <span className={combinarClases("shrink-0 text-xs", estilo.texto)}>
              <FormulaKatex expresion={simbolo_latex} />
            </span>
          )}
        </label>

        <output
          htmlFor={id_control}
          className={combinarClases(
            "shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-medium tabular-nums",
            estilo.texto,
            estilo.borde_lectura,
            estilo.fondo_lectura,
          )}
        >
          {lectura_visible}
        </output>
      </div>

      <div className="flex items-center gap-2">
        {mostrar_botones_finos && (
          <button
            type="button"
            disabled={deshabilitado || valor_acotado <= minimo}
            aria-label={`Disminuir ${etiqueta}`}
            onClick={() => ajustarPasoFino(-1)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-borde-panel bg-fondo-elevado text-texto-secundario transition-colors hover:border-slate-500/60 hover:text-texto-principal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="relative flex flex-1 items-center py-1">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-slate-800"
          >
            <div
              className={combinarClases("h-full rounded-full", estilo.barra_relleno)}
              style={{ width: `${porcentaje_llenado}%` }}
            />
          </div>
          <input
            id={id_control}
            type="range"
            min={usa_log ? 0 : minimo}
            max={usa_log ? RESOLUCION_ESCALA_LOG : maximo}
            step={usa_log ? 1 : paso}
            value={valor_rango_interno}
            disabled={deshabilitado}
            aria-valuetext={lectura_visible}
            aria-describedby={descripcion ? id_descripcion : undefined}
            onChange={(_evento) =>
              manejarCambioRango(Number(_evento.target.value))
            }
            style={{ accentColor: estilo.color_acento_css }}
            className={combinarClases(
              "relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60 disabled:cursor-not-allowed",
              "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-slate-100 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(2,6,23,0.9)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:bg-slate-100 [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(2,6,23,0.9)]",
              estilo.clases_perilla,
            )}
          />
        </div>

        {mostrar_botones_finos && (
          <button
            type="button"
            disabled={deshabilitado || valor_acotado >= maximo}
            aria-label={`Aumentar ${etiqueta}`}
            onClick={() => ajustarPasoFino(1)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-borde-panel bg-fondo-elevado text-texto-secundario transition-colors hover:border-slate-500/60 hover:text-texto-principal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-activo/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-texto-tenue">
        <span>{etiqueta_minimo ?? formatearExtremoCompacto(minimo)}</span>
        {usa_log && (
          <span className="uppercase tracking-wider text-texto-tenue/80">
            escala log
          </span>
        )}
        <span>{etiqueta_maximo ?? formatearExtremoCompacto(maximo)}</span>
      </div>

      {descripcion && (
        <p
          id={id_descripcion}
          className="text-[11px] leading-snug text-texto-secundario"
        >
          {descripcion}
        </p>
      )}
    </div>
  );
}
