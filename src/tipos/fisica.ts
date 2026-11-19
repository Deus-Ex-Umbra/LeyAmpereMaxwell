export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface NumeroComplejo {
  real: number;
  imaginario: number;
  modulo: number;
  fase_rad: number;
}

export interface MarcoCoordenadas {
  nombre: string;
  eje_x_fisico: Vector3D;
  eje_y_fisico: Vector3D;
  eje_z_fisico: Vector3D;
}

export interface MaterialDielectrico {
  id: string;
  nombre: string;
  permitividad_relativa: number;
  campo_ruptura_v_m: number;
  conductividad_s_m: number;
  permeabilidad_relativa: number;
  nota_fisica: string;
  referencia_fiuba: string;
}

export interface MedioElectromagnetico {
  id: string;
  nombre: string;
  conductividad_s_m: number;
  permitividad_relativa: number;
  permeabilidad_relativa: number;
  campo_ruptura_v_m: number;
  nota_fisica: string;
  referencia_fiuba: string;
}

export type ModoCapacitor =
  | "transitorio_rc"
  | "ac_cuasiestatico"
  | "alta_frecuencia_bessel";

export type SuperficieAmperiana = "S1" | "S2" | "ambas" | "S_entrehierro";

export type DireccionRC = "carga" | "descarga";

export interface ParametrosCapacitor {
  modo: ModoCapacitor;
  radio_placa: number;
  separacion_placas: number;
  tension_pico: number;
  frecuencia: number;
  permitividad_relativa: number;
  permeabilidad_relativa: number;
  conductividad_s_m: number;
  campo_ruptura_v_m: number;
  resistencia_ohm: number;
  direccion_rc: DireccionRC;
  radio_lazo: number;
  superficie_activa: SuperficieAmperiana;
  incluir_maxwell: boolean;
  fase_o_tiempo_norm: number;
}

export interface EvaluacionSuperficie {
  id_superficie: "S1" | "S2" | "S_entrehierro";
  corriente_conduccion: number;
  corriente_desplazamiento: number;
  corriente_efectiva: number;
  circulacion_h: number;
  circulacion_b: number;
  residuo_absoluto: number;
  residuo_relativo: number;
  es_consistente: boolean;
}

export interface PuntoCampoCapacitor {
  radio: number;
  campo_e_z: number;
  desplazamiento_d_z: number;
  densidad_jc_z: number;
  densidad_jd_z: number;
  campo_h_phi: number;
  campo_b_phi: number;
  poynting_n_rho: number;
}

export interface InstantaneaCapacitor {
  capacitancia: number;
  conductancia: number;
  constante_tiempo_rc: number;
  tiempo_relajacion: number;
  frecuencia_cruce: number;
  numero_onda_k: number;
  argumento_bessel_borde: number;
  velocidad_fase: number;
  impedancia_medio: number;
  longitud_onda: number;
  razon_longitud_onda_diametro: number;
  es_cuasiestatico_valido: boolean;
  tension_instantanea: number;
  carga_placa: number;
  flujo_electrico_total: number;
  flujo_desplazamiento_total: number;
  corriente_cable: number;
  corriente_conduccion_entrehierro: number;
  corriente_desplazamiento_entrehierro: number;
  campo_e_eje: number;
  desplazamiento_d_eje: number;
  polarizacion_p_eje: number;
  densidad_jc_eje: number;
  densidad_jd_eje: number;
  campo_h_borde: number;
  campo_b_borde: number;
  campo_h_lazo: number;
  campo_b_lazo: number;
  poynting_borde: number;
  potencia_entrante_poynting: number;
  potencia_joule: number;
  energia_electrica: number;
  tasa_energia_electrica: number;
  campo_electrico_maximo: number;
  razon_ruptura_dielectrica: number;
  hay_ruptura_dielectrica: boolean;
  superficie_s1: EvaluacionSuperficie;
  superficie_s2: EvaluacionSuperficie;
  superficie_entrehierro: EvaluacionSuperficie;
  diferencia_paradoja: number;
  hay_paradoja: boolean;
  evaluarEnRadio: (_radio: number) => PuntoCampoCapacitor;
}

export interface PuntoPerfilRadialCapacitor {
  radio: number;
  radio_normalizado: number;
  magnitud_b: number;
  campo_b_phi: number;
  magnitud_h: number;
  campo_h_phi: number;
  campo_e_z: number;
  magnitud_b_cuasiestatico: number;
  campo_e_cuasiestatico: number;
}

export interface MuestraTemporalCapacitor {
  etiqueta_eje: number;
  tiempo_s: number;
  tension_v: number;
  corriente_conduccion: number;
  corriente_desplazamiento: number;
  corriente_total: number;
  campo_e_eje: number;
  campo_b_lazo: number;
  potencia_entrante: number;
}

export type TipoGeometriaAmpere =
  | "conductor_cilindrico"
  | "cable_coaxial"
  | "solenoide_largo"
  | "toroide";

export interface ParametrosGeometriaAmpere {
  tipo: TipoGeometriaAmpere;
  corriente: number;
  radio_interior: number;
  radio_medio: number;
  radio_exterior: number;
  factor_retorno_coaxial: number;
  espiras_por_metro: number;
  numero_espiras_total: number;
  longitud_solenoide: number;
  usar_solenoide_finito: boolean;
  largo_lazo_rectangular: number;
  radio_lazo: number;
  radio_lazo_secundario: number;
  permeabilidad_relativa_nucleo: number;
}

export interface ResultadoGeometriaAmpere {
  tipo: TipoGeometriaAmpere;
  region_descripcion: string;
  corriente_encerrada: number;
  campo_h: number;
  campo_b: number;
  campo_b_solenoide_ideal: number;
  circulacion_h: number;
  circulacion_b: number;
  residuo_relativo: number;
  es_consistente: boolean;
  esta_apantallado: boolean;
  evaluarEnRadio: (_radio: number) => {
    campo_h: number;
    campo_b: number;
    corriente_encerrada: number;
  };
}

export interface PuntoPerfilGeometria {
  radio: number;
  campo_h: number;
  campo_b: number;
  campo_h_hilo_fino?: number;
  region: string;
}

export type RegimenConduccion =
  | "buen_conductor"
  | "transicion"
  | "buen_dielectrico";

export interface ParametrosRegimenConduccion {
  amplitud_e0: number;
  frecuencia: number;
  conductividad_s_m: number;
  permitividad_relativa: number;
  permeabilidad_relativa: number;
  radio_evaluacion: number;
  dimension_caracteristica: number;
  fase_omega_t: number;
}

export interface FasorCorriente {
  jc_real: number;
  jd_imaginario: number;
  j_total_modulo: number;
  j_total_angulo_rad: number;
  jc_instantaneo: number;
  jd_instantaneo: number;
  j_total_instantaneo: number;
  campo_e_instantaneo: number;
}

export interface ResultadoRegimenConduccion {
  frecuencia_angular: number;
  permitividad: number;
  permeabilidad: number;
  conductividad_equivalente: NumeroComplejo;
  permitividad_equivalente: NumeroComplejo;
  tiempo_relajacion: number;
  frecuencia_cruce: number;
  tangente_perdidas: number;
  razon_jc_sobre_jd: number;
  angulo_fase_jd_rad: number;
  angulo_fase_jd_grados: number;
  regimen: RegimenConduccion;
  fasor: FasorCorriente;
  numero_onda_k: number;
  longitud_onda: number;
  argumento_bessel_krho: number;
  razon_longitud_onda_dimension: number;
  es_cuasiestatico_valido: boolean;
  campo_b_cuasiestatico_pico: number;
  campo_b_bessel_pico: number;
  error_relativo_cuasiestatico_e: number;
  error_relativo_cuasiestatico_b: number;
}

export interface PuntoBarridoBode {
  frecuencia: number;
  log10_frecuencia: number;
  modulo_sigma: number;
  modulo_omega_epsilon: number;
  tangente_perdidas: number;
  regimen: RegimenConduccion;
}

export type TipoPolarizacionOnda = "lineal" | "circular_derecha";

export type RegimenModelado =
  | "cuasiestatico"
  | "distribuido"
  | "campo_completo";

export interface ParametrosOndaEM {
  amplitud_e0: number;
  frecuencia: number;
  permitividad_relativa: number;
  permeabilidad_relativa: number;
  conductividad_s_m: number;
  dimension_caracteristica: number;
  polarizacion: TipoPolarizacionOnda;
  incluir_maxwell: boolean;
}

export interface MuestraEspacialOnda {
  posicion_x: number;
  posicion_normalizada: number;
  campo_e: Vector3D;
  campo_h: Vector3D;
  campo_b: Vector3D;
  poynting_n: Vector3D;
  factor_atenuacion: number;
}

export interface ResultadoOndaEM {
  frecuencia_angular: number;
  constante_atenuacion_alfa: number;
  constante_fase_beta: number;
  constante_propagacion_cuadrada_esperada: NumeroComplejo;
  impedancia_intrinseca: NumeroComplejo;
  desfasaje_h_atraso_rad: number;
  desfasaje_h_atraso_grados: number;
  velocidad_fase: number;
  indice_refraccion: number;
  longitud_onda: number;
  profundidad_pelicular: number;
  poynting_promedio_origen: number;
  tangente_perdidas: number;
  razon_longitud_onda_dimension: number;
  regimen_modelado: RegimenModelado;
  propagacion_activa: boolean;
  evaluarEnPosicion: (
    _posicion_x: number,
    _fase_omega_t: number,
  ) => MuestraEspacialOnda;
  generarMuestrasEspaciales: (
    _num_puntos: number,
    _num_longitudes_onda: number,
    _fase_omega_t: number,
  ) => MuestraEspacialOnda[];
}

export interface ResultadoInvariante {
  id: string;
  nombre: string;
  cumple: boolean;
  error_relativo: number;
  tolerancia: number;
  detalle: string;
}

export interface ReporteInvariantes {
  todos_validos: boolean;
  invariantes: ResultadoInvariante[];
}
