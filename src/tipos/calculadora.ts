import type { DireccionRC, ModoCapacitor } from "./fisica";

export type CasoCalculadora =
  | "caso_a_capacitor"
  | "caso_b_conductor"
  | "caso_c_armonico";

export type ModoCapacitorCalculadora = Exclude<
  ModoCapacitor,
  "alta_frecuencia_bessel"
>;

export type TipoConductorCalculadora =
  | "conductor_cilindrico"
  | "cable_coaxial";

export interface ParametrosCasoACapacitor {
  modo: ModoCapacitorCalculadora;
  radio_placa: number;
  separacion_placas: number;
  tension_pico: number;
  frecuencia: number;
  permitividad_relativa: number;
  conductividad_s_m: number;
  campo_ruptura_v_m: number;
  resistencia_ohm: number;
  direccion_rc: DireccionRC;
  tiempo_normalizado_rc: number;
  fase_rad: number;
  radio_evaluacion: number;
}

export interface ParametrosCasoBConductor {
  tipo: TipoConductorCalculadora;
  corriente: number;
  radio_interior: number;
  radio_medio: number;
  radio_exterior: number;
  factor_retorno_coaxial: number;
  permeabilidad_relativa_nucleo: number;
  radio_evaluacion: number;
}

export interface ParametrosCasoCArmonico {
  amplitud_e0: number;
  frecuencia: number;
  permitividad_relativa: number;
  permeabilidad_relativa: number;
  conductividad_s_m: number;
  radio_evaluacion: number;
  dimension_caracteristica: number;
  tiempo_s: number;
}

export interface MagnitudResumen {
  etiqueta: string;
  simbolo_latex: string;
  valor_formateado: string;
  color_token:
    | "azul"
    | "rojo"
    | "verde"
    | "morado"
    | "naranja"
    | "ambar"
    | "cian";
}

export interface PasoAnalitico {
  numero: number;
  titulo: string;
  expresion_latex: string;
  nota_conceptual?: string;
  verificacion_dimensional?: string;
}

export interface ResultadoCalculadora {
  caso_id: CasoCalculadora;
  titulo: string;
  referencia_fiuba: string;
  resumen_magnitudes: MagnitudResumen[];
  pasos: PasoAnalitico[];
  verificacion_invariante: {
    cumple: boolean;
    etiqueta: string;
    error_relativo: number;
  };
  alertas: string[];
}
