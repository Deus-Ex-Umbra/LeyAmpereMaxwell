import type {
  ParametrosCapacitor,
  ParametrosGeometriaAmpere,
  ParametrosOndaEM,
  ParametrosRegimenConduccion,
} from "./fisica";

export type EscenarioLaboratorio =
  | "capacitor_paradoja"
  | "geometrias_ampere"
  | "onda_electromagnetica";

export type PestanaAplicacion =
  | "simulador"
  | "calculadora"
  | "teoria"
  | "autoevaluacion";

export type CamaraPredefinida = "perspectiva" | "lateral" | "frontal";

export interface CapasVisibles3D {
  mostrar_e: boolean;
  mostrar_d: boolean;
  mostrar_b_h: boolean;
  mostrar_jc: boolean;
  mostrar_jd: boolean;
  mostrar_poynting: boolean;
  mostrar_cargas: boolean;
  mostrar_lazo_y_superficie: boolean;
  mostrar_rejilla_y_ejes: boolean;
}

export interface PresetExperimentoFIUBA {
  id: string;
  codigo_fiuba: string;
  titulo: string;
  subtitulo: string;
  escenario: EscenarioLaboratorio;
  pestana_destino: PestanaAplicacion;
  pregunta_guia: string;
  observacion_esperada: string;
  parametros_capacitor?: Partial<ParametrosCapacitor>;
  parametros_geometria?: Partial<ParametrosGeometriaAmpere>;
  parametros_onda?: Partial<ParametrosOndaEM>;
  parametros_regimen?: Partial<ParametrosRegimenConduccion>;
  capas_sugeridas?: Partial<CapasVisibles3D>;
}

export interface EstadoSimuladorGlobal {
  escenario_activo: EscenarioLaboratorio;
  reproduciendo: boolean;
  velocidad_animacion: number;
  termino_resaltado_id: string | null;
  capas_visibles: CapasVisibles3D;
  parametros_capacitor: ParametrosCapacitor;
  parametros_geometria: ParametrosGeometriaAmpere;
  parametros_onda: ParametrosOndaEM;
}
