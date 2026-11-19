import type { EscenarioLaboratorio } from "./simulacion";

export type ColorSemantico =
  | "azul"
  | "rojo"
  | "verde"
  | "morado"
  | "naranja"
  | "ambar"
  | "vector_e"
  | "vector_d"
  | "vector_b"
  | "vector_h"
  | "vector_jc"
  | "vector_jd"
  | "vector_n";

export type FormaEcuacionMaxwell =
  | "integral_medios"
  | "diferencial_medios"
  | "integral_vacio"
  | "fasorial";

export interface TerminoEcuacion {
  id: string;
  latex: string;
  etiqueta: string;
  unidades_si: string;
  explicacion: string;
  nota_historica?: string;
  color_semantico: ColorSemantico;
  clave_resaltado_3d?: string;
}

export interface EcuacionInteractiva {
  forma: FormaEcuacionMaxwell;
  titulo: string;
  subtitulo: string;
  latex_completo: string;
  terminos: TerminoEcuacion[];
}

export interface PasoDerivacion {
  numero: number;
  titulo: string;
  expresion_latex: string;
  nota_conceptual?: string;
  explicacion_breve: string;
}

export interface HitoHistorico {
  id: string;
  anio: string;
  cientifico: string;
  titulo: string;
  ecuacion_latex: string;
  aporte_clave: string;
  limitacion_resuelta: string;
  escenario_vinculado: EscenarioLaboratorio;
  preset_sugerido_id?: string;
}
