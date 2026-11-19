"use client";

import { AlertTriangle, CheckCircle2, Layers, Zap, ZapOff } from "lucide-react";
import { FormulaKatex } from "@/componentes/ecuaciones/formula-katex";
import { InsigniaEstado, TarjetaLaboratorio } from "@/componentes/ui";
import { formatearUnidadSI } from "@/lib/fisica";
import { combinarClases } from "@/lib/utils";
import type {
  InstantaneaCapacitor,
  ParametrosCapacitor,
  SuperficieAmperiana,
} from "@/tipos";

export interface PropiedadesPanelParadojaSuperficies {
  parametros: ParametrosCapacitor;
  instantanea: InstantaneaCapacitor;
  alCambiarSuperficie?: (_superficie: SuperficieAmperiana) => void;
  alAlternarMaxwell?: (_incluir: boolean) => void;
  clase_extra?: string;
}

export function PanelParadojaSuperficies(
  _propiedades: PropiedadesPanelParadojaSuperficies,
) {
  const {
    parametros,
    instantanea,
    alCambiarSuperficie,
    alAlternarMaxwell,
    clase_extra,
  } = _propiedades;

  const { superficie_s1, superficie_s2, superficie_entrehierro } = instantanea;
  const maxwell_activo = parametros.incluir_maxwell;
  const hay_contradiccion = !maxwell_activo;

  const s1_enfocada =
    parametros.superficie_activa === "S1" ||
    parametros.superficie_activa === "ambas";
  const s2_enfocada =
    parametros.superficie_activa === "S2" ||
    parametros.superficie_activa === "ambas";

  function formatearCorriente(_valor: number): string {
    return formatearUnidadSI(_valor, "A", {
      decimales: 2,
      mostrar_signo: true,
    }).texto;
  }

  return (
    <TarjetaLaboratorio
      etiqueta_superior="Paradoja de Ampère-Maxwell · Cap. 5"
      titulo="Comparación de Superficies S₁ vs S₂"
      subtitulo="Mismo lazo amperiano C acotando dos superficies distintas (Teorema de Stokes)"
      icono={
        hay_contradiccion ? (
          <AlertTriangle className="h-4 w-4 text-rojo-anulado" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-verde-inducido" />
        )
      }
      variante={hay_contradiccion ? "alerta" : "exito"}
      clase_extra={clase_extra}
      acciones_derecha={
        <div className="flex flex-wrap items-center gap-2">
          <InsigniaEstado
            variante={hay_contradiccion ? "rojo" : "verde"}
            con_punto
            pulso={hay_contradiccion}
          >
            {hay_contradiccion
              ? "¡Contradicción S₁ ≠ S₂!"
              : "Consistencia S₁ = S₂"}
          </InsigniaEstado>
          {alAlternarMaxwell && (
            <button
              type="button"
              onClick={() => alAlternarMaxwell(!maxwell_activo)}
              className={combinarClases(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                hay_contradiccion
                  ? "border-morado-frontera/50 bg-morado-frontera/20 text-morado-frontera hover:bg-morado-frontera/30"
                  : "border-rojo-anulado/40 bg-rojo-anulado/12 text-rojo-anulado hover:bg-rojo-anulado/20",
              )}
            >
              {hay_contradiccion ? (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Activar ∂D/∂t
                </>
              ) : (
                <>
                  <ZapOff className="h-3.5 w-3.5" />
                  Apagar ∂D/∂t
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      {/* Tarjetas comparativas lado a lado: S1 vs S2 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Superficie S1 */}
        <div
          className={combinarClases(
            "flex flex-col gap-2.5 rounded-xl border p-3.5 transition-colors",
            s1_enfocada
              ? "border-ambar-destacar/45 bg-ambar-destacar/[0.06]"
              : "border-borde-panel bg-fondo-base/65",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ambar-destacar">
                Superficie S₁ (plana)
              </p>
              <p className="text-xs text-texto-secundario">
                Corta el cable conductor externo
              </p>
            </div>
            {alCambiarSuperficie && (
              <button
                type="button"
                onClick={() => alCambiarSuperficie("S1")}
                className="rounded-md border border-ambar-destacar/35 bg-ambar-destacar/10 px-2 py-0.5 font-mono text-[10px] text-ambar-destacar transition-colors hover:bg-ambar-destacar/20"
              >
                Enfocar S₁
              </button>
            )}
          </div>

          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-fondo-base/75 px-2.5 py-1.5">
              <dt className="text-texto-secundario">
                Conducción <FormulaKatex expresion="I_c(S_1)" />
              </dt>
              <dd className="font-mono font-semibold tabular-nums text-ambar-destacar">
                {formatearCorriente(superficie_s1.corriente_conduccion)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-fondo-base/75 px-2.5 py-1.5">
              <dt className="text-texto-secundario">
                Desplazamiento <FormulaKatex expresion="I_d(S_1)" />
              </dt>
              <dd className="font-mono tabular-nums text-texto-tenue">
                {formatearCorriente(superficie_s1.corriente_desplazamiento)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-ambar-destacar/30 bg-ambar-destacar/10 px-2.5 py-1.5">
              <dt className="font-medium text-texto-principal">
                <FormulaKatex expresion="\oint_C \vec{H}\cdot d\vec{l}\big|_{S_1}" />
              </dt>
              <dd className="font-mono text-sm font-bold tabular-nums text-ambar-destacar">
                {formatearCorriente(superficie_s1.corriente_efectiva)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Superficie S2 */}
        <div
          className={combinarClases(
            "flex flex-col gap-2.5 rounded-xl border p-3.5 transition-colors",
            hay_contradiccion
              ? "border-rojo-anulado/50 bg-rojo-anulado/[0.08]"
              : s2_enfocada
                ? "border-morado-frontera/45 bg-morado-frontera/[0.07]"
                : "border-borde-panel bg-fondo-base/65",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-morado-frontera">
                Superficie S₂ (deformada de Maxwell)
              </p>
              <p className="text-xs text-texto-secundario">
                Cruza el entrehierro entre las placas
              </p>
            </div>
            {alCambiarSuperficie && (
              <button
                type="button"
                onClick={() => alCambiarSuperficie("S2")}
                className="rounded-md border border-morado-frontera/35 bg-morado-frontera/10 px-2 py-0.5 font-mono text-[10px] text-morado-frontera transition-colors hover:bg-morado-frontera/20"
              >
                Enfocar S₂
              </button>
            )}
          </div>

          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-fondo-base/75 px-2.5 py-1.5">
              <dt className="text-texto-secundario">
                Conducción <FormulaKatex expresion="I_c(S_2)" />
              </dt>
              <dd
                className={combinarClases(
                  "font-mono tabular-nums",
                  Math.abs(superficie_s2.corriente_conduccion) > 1e-18
                    ? "font-semibold text-ambar-destacar"
                    : "text-texto-tenue",
                )}
              >
                {formatearCorriente(superficie_s2.corriente_conduccion)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-fondo-base/75 px-2.5 py-1.5">
              <dt className="text-texto-secundario">
                Desplazamiento <FormulaKatex expresion="I_d(S_2)" />
              </dt>
              <dd
                className={combinarClases(
                  "font-mono font-semibold tabular-nums",
                  hay_contradiccion
                    ? "text-rojo-anulado line-through decoration-2"
                    : "text-morado-frontera",
                )}
              >
                {formatearCorriente(superficie_s2.corriente_desplazamiento)}
                {hay_contradiccion && (
                  <span className="ml-1.5 inline-block text-[10px] no-underline">
                    (omitida)
                  </span>
                )}
              </dd>
            </div>
            <div
              className={combinarClases(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5",
                hay_contradiccion
                  ? "border-rojo-anulado/45 bg-rojo-anulado/15"
                  : "border-morado-frontera/35 bg-morado-frontera/10",
              )}
            >
              <dt className="font-medium text-texto-principal">
                <FormulaKatex expresion="\oint_C \vec{H}\cdot d\vec{l}\big|_{S_2}" />
              </dt>
              <dd
                className={combinarClases(
                  "font-mono text-sm font-bold tabular-nums",
                  hay_contradiccion
                    ? "text-rojo-anulado"
                    : "text-morado-frontera",
                )}
              >
                {formatearCorriente(superficie_s2.corriente_efectiva)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Veredicto físico inequívoco */}
      <div
        className={combinarClases(
          "mt-3 flex flex-col gap-2 rounded-xl border px-3.5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between",
          hay_contradiccion
            ? "border-rojo-anulado/45 bg-rojo-anulado/12 text-red-100"
            : "border-verde-inducido/35 bg-verde-inducido/10 text-emerald-100",
        )}
      >
        <div className="space-y-1">
          <p className="font-semibold">
            {hay_contradiccion
              ? "¡Contradicción de Ampère (S₁ ≠ S₂)! El mismo contorno C produce dos circulaciones incompatibles."
              : "Consistencia restaurada (S₁ = S₂): la corriente de desplazamiento ∂D/∂t garantiza la independencia de superficie."}
          </p>
          <p className="text-[11px] opacity-85">
            {hay_contradiccion
              ? instantanea.hay_paradoja
                ? `Discrepancia instantánea |ΔI| = ${formatearUnidadSI(instantanea.diferencia_paradoja, "A").texto}. Sin ∂D/∂t se viola la ecuación de continuidad ∇·j + ∂ρ/∂t = 0.`
                : "En este instante I(t) cruza por cero, pero al avanzar la fase S₁ y S₂ divergen inmediatamente sin ∂D/∂t."
              : `Residuo relativo |S₁ − S₂| / |I| = ${superficie_s2.residuo_relativo.toExponential(1)} · ∇·(j + ∂D/∂t) = 0 verificada.`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px]">
          <FormulaKatex
            expresion={
              hay_contradiccion
                ? "\\rojo{S_1 \\neq S_2}"
                : "\\verde{S_1 = S_2}"
            }
          />
        </div>
      </div>

      {/* Lectura auxiliar del lazo en el entrehierro a radio ρ */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borde-panel bg-fondo-base/55 px-3 py-2 text-[11px] text-texto-secundario">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-azul-activo" />
          Disco interior en ρ ={" "}
          <span className="font-mono text-texto-principal">
            {formatearUnidadSI(parametros.radio_lazo, "m").texto}
          </span>
          :
        </span>
        <span className="font-mono tabular-nums text-texto-principal">
          I_ef(ρ) = {formatearCorriente(superficie_entrehierro.corriente_efectiva)} ·
          ∮H·dl = {formatearCorriente(superficie_entrehierro.circulacion_h)}
        </span>
      </div>
    </TarjetaLaboratorio>
  );
}
