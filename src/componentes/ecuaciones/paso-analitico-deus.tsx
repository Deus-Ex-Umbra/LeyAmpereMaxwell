import type { PasoAnalitico } from "@/tipos";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { combinarClases } from "@/lib/utils";

export interface PropiedadesPasoAnaliticoDeus {
  paso: PasoAnalitico;
  es_ultimo?: boolean;
  clase_extra?: string;
}

export function PasoAnaliticoDeus(_propiedades: PropiedadesPasoAnaliticoDeus) {
  const { paso, es_ultimo = false, clase_extra } = _propiedades;
  const tiene_nota = Boolean(paso.nota_conceptual);

  return (
    <article
      className={combinarClases(
        "overflow-hidden rounded-xl border bg-fondo-base/65 transition-colors",
        es_ultimo
          ? "border-azul-activo/35 shadow-[inset_0_1px_0_rgba(56,189,248,0.12)]"
          : "border-borde-panel",
        clase_extra,
      )}
    >
      <header className="flex flex-wrap items-center gap-2.5 border-b border-borde-panel border-l-[3px] border-l-azul-activo bg-azul-activo/[0.07] px-4 py-2.5">
        <span className="inline-flex items-center rounded-md border border-azul-activo/35 bg-azul-activo/15 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-azul-activo">
          Paso {paso.numero}
        </span>
        <h3 className="font-display text-sm font-semibold text-texto-principal">
          {paso.titulo}
        </h3>
      </header>

      <div
        className={combinarClases(
          "grid items-center gap-4 px-4 py-3.5",
          tiene_nota
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(13.5rem,0.38fr)]"
            : "grid-cols-1",
        )}
      >
        <div className="min-w-0">
          <FormulaKatex
            en_bloque
            expresion={paso.expresion_latex}
            etiqueta_aria={`Paso ${paso.numero}: ${paso.titulo}`}
          />
        </div>

        {paso.nota_conceptual && (
          <aside
            aria-label="Aclaración conceptual"
            className="border-t border-borde-panel pt-2.5 text-xs leading-relaxed text-texto-secundario lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-texto-tenue">
              Nota
            </p>
            <p className="mt-1 italic text-texto-secundario">
              {paso.nota_conceptual}
            </p>
          </aside>
        )}
      </div>

      {paso.verificacion_dimensional && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-borde-panel bg-verde-inducido/[0.045] px-4 py-2 text-xs text-texto-secundario">
          <span className="rounded-full border border-verde-inducido/30 bg-verde-inducido/12 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-verde-inducido">
            Análisis dimensional SI
          </span>
          <span className="text-verde-inducido/95">
            <FormulaKatex expresion={paso.verificacion_dimensional} />
          </span>
        </footer>
      )}
    </article>
  );
}
