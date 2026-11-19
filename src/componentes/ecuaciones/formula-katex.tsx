"use client";

import { useMemo } from "react";
import katex, { type TrustContext } from "katex";
import { combinarClases } from "@/lib/utils";

const MACROS_DEUS_KATEX: Record<string, string> = {
  "\\azul": "\\textcolor{##38bdf8}{#1}",
  "\\rojo": "\\textcolor{##f87171}{#1}",
  "\\verde": "\\textcolor{##34d399}{#1}",
  "\\morado": "\\textcolor{##c084fc}{#1}",
  "\\naranja": "\\textcolor{##fb923c}{#1}",
  "\\destacar": "\\fcolorbox{##d97706}{##292008}{$\\textcolor{##fde68a}{#1}$}",
  "\\tachar": "\\textcolor{##f87171}{\\cancel{#1}}",
  "\\vec": "\\mathbf{#1}",
};

const COMANDOS_HTML_PERMITIDOS = new Set<string>([
  "\\htmlClass",
  "\\htmlData",
  "\\htmlId",
  "\\htmlStyle",
]);

function evaluarConfianzaHtml(_contexto: TrustContext): boolean {
  return COMANDOS_HTML_PERMITIDOS.has(_contexto.command);
}

export interface PropiedadesFormulaKatex {
  expresion: string;
  en_bloque?: boolean;
  clase_extra?: string;
  confiar_html?: boolean;
  etiqueta_aria?: string;
}

export function FormulaKatex(_propiedades: PropiedadesFormulaKatex) {
  const {
    expresion,
    en_bloque = false,
    clase_extra,
    confiar_html = false,
    etiqueta_aria,
  } = _propiedades;

  const html_renderizado = useMemo(() => {
    const expresion_limpia = expresion.trim();
    if (!expresion_limpia) {
      return "";
    }

    return katex.renderToString(expresion_limpia, {
      displayMode: en_bloque,
      throwOnError: false,
      strict: false,
      macros: { ...MACROS_DEUS_KATEX },
      trust: confiar_html ? evaluarConfianzaHtml : false,
    });
  }, [expresion, en_bloque, confiar_html]);

  const Etiqueta = en_bloque ? "div" : "span";

  return (
    <Etiqueta
      role={etiqueta_aria ? "math" : undefined}
      aria-label={etiqueta_aria}
      className={combinarClases(
        en_bloque ? "formula-katex-bloque" : "inline-block align-baseline",
        clase_extra,
      )}
      dangerouslySetInnerHTML={{ __html: html_renderizado }}
    />
  );
}
