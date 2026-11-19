import type { PasoAnalitico } from "./calculadora";
import type { EscenarioLaboratorio } from "./simulacion";

export type TipoPreguntaEvaluacion = "conceptual" | "numerica";

export type CategoriaEvaluacion =
  | "paradoja_desplazamiento"
  | "poynting_energia"
  | "regimen_perdidas"
  | "alta_frecuencia_bessel"
  | "magnetostatica_ampere"
  | "ondas_em";

export interface OpcionPregunta {
  id: string;
  texto: string;
  expresion_latex?: string;
}

export interface PreguntaAutoevaluacion {
  id: string;
  numero: number;
  tipo: TipoPreguntaEvaluacion;
  categoria: CategoriaEvaluacion;
  referencia_fiuba: string;
  enunciado: string;
  enunciado_latex?: string;
  opciones: OpcionPregunta[];
  id_opcion_correcta: string;
  pista: string;
  demostracion_pasos: PasoAnalitico[];
  escenario_vinculado: EscenarioLaboratorio;
  preset_vinculado_id?: string;
}

export interface MisionVerificacion {
  id: string;
  titulo: string;
  descripcion: string;
  referencia_fiuba: string;
  escenario: EscenarioLaboratorio;
  criterio_texto: string;
}
