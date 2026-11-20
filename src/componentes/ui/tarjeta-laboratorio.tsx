import type { ReactNode } from "react";
import { combinarClases } from "@/lib/utils";

export type VarianteTarjetaLaboratorio = "base" | "elevada" | "alerta" | "exito";

export interface PropiedadesTarjetaLaboratorio {
  titulo?: string;
  subtitulo?: string;
  etiqueta_superior?: string;
  icono?: ReactNode;
  acciones_derecha?: ReactNode;
  variante?: VarianteTarjetaLaboratorio;
  sin_relleno_cuerpo?: boolean;
  clase_extra?: string;
  clase_cuerpo?: string;
  id?: string;
  children: ReactNode;
}

const CLASES_VARIANTE_TARJETA: Record<VarianteTarjetaLaboratorio, string> = {
  base: "panel-laboratorio",
  elevada: "panel-laboratorio-elevado",
  alerta:
    "rounded-2xl border border-rojo-anulado/40 bg-rojo-anulado/[0.07] shadow-[0_12px_32px_-12px_rgba(127,29,29,0.55)] claro:shadow-[0_10px_28px_-14px_rgba(220,38,38,0.2)] backdrop-blur-md",
  exito:
    "rounded-2xl border border-verde-inducido/35 bg-verde-inducido/[0.06] shadow-[0_12px_32px_-12px_rgba(6,78,59,0.5)] claro:shadow-[0_10px_28px_-14px_rgba(5,150,105,0.18)] backdrop-blur-md",
};

const CLASES_ETIQUETA_VARIANTE: Record<VarianteTarjetaLaboratorio, string> = {
  base: "text-azul-activo",
  elevada: "text-azul-activo",
  alerta: "text-rojo-anulado",
  exito: "text-verde-inducido",
};

export function TarjetaLaboratorio(_propiedades: PropiedadesTarjetaLaboratorio) {
  const {
    titulo,
    subtitulo,
    etiqueta_superior,
    icono,
    acciones_derecha,
    variante = "base",
    sin_relleno_cuerpo = false,
    clase_extra,
    clase_cuerpo,
    id,
    children,
  } = _propiedades;

  const tiene_encabezado = Boolean(
    titulo || subtitulo || etiqueta_superior || icono || acciones_derecha,
  );

  return (
    <section
      id={id}
      className={combinarClases(
        "rounded-2xl transition-colors",
        CLASES_VARIANTE_TARJETA[variante],
        clase_extra,
      )}
    >
      {tiene_encabezado && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-borde-panel px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icono && (
              <div
                aria-hidden="true"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-borde-panel bg-fondo-base/70 text-azul-activo"
              >
                {icono}
              </div>
            )}
            <div className="min-w-0">
              {etiqueta_superior && (
                <p
                  className={combinarClases(
                    "font-mono text-[11px] font-medium uppercase tracking-[0.18em]",
                    CLASES_ETIQUETA_VARIANTE[variante],
                  )}
                >
                  {etiqueta_superior}
                </p>
              )}
              {titulo && (
                <h2 className="font-display text-base font-semibold tracking-tight text-texto-principal sm:text-lg">
                  {titulo}
                </h2>
              )}
              {subtitulo && (
                <p className="mt-0.5 text-xs leading-relaxed text-texto-secundario sm:text-sm">
                  {subtitulo}
                </p>
              )}
            </div>
          </div>
          {acciones_derecha && (
            <div className="flex shrink-0 items-center gap-2">
              {acciones_derecha}
            </div>
          )}
        </header>
      )}
      <div className={combinarClases(sin_relleno_cuerpo ? "" : "p-5", clase_cuerpo)}>
        {children}
      </div>
    </section>
  );
}
