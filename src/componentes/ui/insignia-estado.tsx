import type { ReactNode } from "react";
import { combinarClases } from "@/lib/utils";

export type VarianteInsigniaEstado =
  | "azul"
  | "rojo"
  | "verde"
  | "morado"
  | "naranja"
  | "ambar"
  | "neutro";

export interface PropiedadesInsigniaEstado {
  variante?: VarianteInsigniaEstado;
  con_punto?: boolean;
  pulso?: boolean;
  tamano?: "sm" | "md";
  clase_extra?: string;
  children: ReactNode;
}

const CLASES_VARIANTE_INSIGNIA: Record<VarianteInsigniaEstado, string> = {
  azul: "border-azul-activo/35 bg-azul-activo/12 text-azul-activo",
  rojo: "border-rojo-anulado/40 bg-rojo-anulado/12 text-rojo-anulado",
  verde: "border-verde-inducido/35 bg-verde-inducido/12 text-verde-inducido",
  morado: "border-morado-frontera/35 bg-morado-frontera/12 text-morado-frontera",
  naranja: "border-naranja-constante/35 bg-naranja-constante/12 text-naranja-constante",
  ambar: "border-ambar-destacar/40 bg-ambar-destacar/12 text-ambar-destacar",
  neutro: "border-borde-panel bg-panel/80 text-texto-secundario",
};

const CLASES_PUNTO_INSIGNIA: Record<VarianteInsigniaEstado, string> = {
  azul: "bg-azul-activo",
  rojo: "bg-rojo-anulado",
  verde: "bg-verde-inducido",
  morado: "bg-morado-frontera",
  naranja: "bg-naranja-constante",
  ambar: "bg-ambar-destacar",
  neutro: "bg-texto-secundario",
};

export function InsigniaEstado(_propiedades: PropiedadesInsigniaEstado) {
  const {
    variante = "neutro",
    con_punto = false,
    pulso = false,
    tamano = "sm",
    clase_extra,
    children,
  } = _propiedades;

  return (
    <span
      className={combinarClases(
        "inline-flex items-center gap-1.5 rounded-full border font-mono font-medium tracking-wide",
        tamano === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        CLASES_VARIANTE_INSIGNIA[variante],
        clase_extra,
      )}
    >
      {con_punto && (
        <span
          aria-hidden="true"
          className={combinarClases(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            CLASES_PUNTO_INSIGNIA[variante],
            pulso ? "animate-pulse" : "",
          )}
        />
      )}
      {children}
    </span>
  );
}
