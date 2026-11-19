import type { MarcoCoordenadas, Vector3D } from "../../tipos/fisica";

export const MARCO_EJE_HORIZONTAL: MarcoCoordenadas = {
  nombre: "eje_horizontal",
  eje_x_fisico: { x: 0, y: 1, z: 0 },
  eje_y_fisico: { x: 0, y: 0, z: 1 },
  eje_z_fisico: { x: 1, y: 0, z: 0 },
};

export const MARCO_EJE_VERTICAL: MarcoCoordenadas = {
  nombre: "eje_vertical",
  eje_x_fisico: { x: 0, y: 0, z: 1 },
  eje_y_fisico: { x: 1, y: 0, z: 0 },
  eje_z_fisico: { x: 0, y: 1, z: 0 },
};

export const MARCO_ONDA_PLANA: MarcoCoordenadas = {
  nombre: "onda_plana",
  eje_x_fisico: { x: 1, y: 0, z: 0 },
  eje_y_fisico: { x: 0, y: 1, z: 0 },
  eje_z_fisico: { x: 0, y: 0, z: 1 },
};

export function productoPunto(_a: Vector3D, _b: Vector3D): number {
  return _a.x * _b.x + _a.y * _b.y + _a.z * _b.z;
}

export function productoCruz(_a: Vector3D, _b: Vector3D): Vector3D {
  return {
    x: _a.y * _b.z - _a.z * _b.y,
    y: _a.z * _b.x - _a.x * _b.z,
    z: _a.x * _b.y - _a.y * _b.x,
  };
}

export function normaVector(_v: Vector3D): number {
  return Math.hypot(_v.x, _v.y, _v.z);
}

export function determinanteMarco(_marco: MarcoCoordenadas): number {
  return productoPunto(
    productoCruz(_marco.eje_x_fisico, _marco.eje_y_fisico),
    _marco.eje_z_fisico,
  );
}

export function combinarEnMarco(
  _marco: MarcoCoordenadas,
  _cx: number,
  _cy: number,
  _cz: number,
): Vector3D {
  return {
    x:
      _cx * _marco.eje_x_fisico.x +
      _cy * _marco.eje_y_fisico.x +
      _cz * _marco.eje_z_fisico.x,
    y:
      _cx * _marco.eje_x_fisico.y +
      _cy * _marco.eje_y_fisico.y +
      _cz * _marco.eje_z_fisico.y,
    z:
      _cx * _marco.eje_x_fisico.z +
      _cy * _marco.eje_y_fisico.z +
      _cz * _marco.eje_z_fisico.z,
  };
}

export function vectorUnitarioRadial(
  _marco: MarcoCoordenadas,
  _angulo_phi: number,
): Vector3D {
  return combinarEnMarco(
    _marco,
    Math.cos(_angulo_phi),
    Math.sin(_angulo_phi),
    0,
  );
}

export function vectorUnitarioAzimutal(
  _marco: MarcoCoordenadas,
  _angulo_phi: number,
): Vector3D {
  return combinarEnMarco(
    _marco,
    -Math.sin(_angulo_phi),
    Math.cos(_angulo_phi),
    0,
  );
}

export function cilindricoAMundo(
  _marco: MarcoCoordenadas,
  _radio: number,
  _angulo_phi: number,
  _altura_z: number,
): Vector3D {
  return combinarEnMarco(
    _marco,
    _radio * Math.cos(_angulo_phi),
    _radio * Math.sin(_angulo_phi),
    _altura_z,
  );
}

export function campoCilindricoAMundo(
  _marco: MarcoCoordenadas,
  _angulo_phi: number,
  _comp_rho: number,
  _comp_phi: number,
  _comp_z: number,
): Vector3D {
  const cos_phi = Math.cos(_angulo_phi);
  const sin_phi = Math.sin(_angulo_phi);
  const comp_x = _comp_rho * cos_phi - _comp_phi * sin_phi;
  const comp_y = _comp_rho * sin_phi + _comp_phi * cos_phi;
  return combinarEnMarco(_marco, comp_x, comp_y, _comp_z);
}
