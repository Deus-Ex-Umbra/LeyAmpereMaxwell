const UMBRAL_SERIE_BESSEL = 14;

// Pares simétricos (nodo, peso) de Gauss-Legendre de 16 puntos en [-1, 1].
const NODOS_GL16 = [
  0.09501250983763744,
  0.28160355077925891,
  0.45801677765722739,
  0.61787624440264375,
  0.75540440835500303,
  0.86563120238783174,
  0.94457502307323258,
  0.98940093499164993,
] as const;

const PESOS_GL16 = [
  0.1894506104550685,
  0.18260341504492359,
  0.16915651939500254,
  0.14959598881657673,
  0.12462897125553387,
  0.09515851168249278,
  0.06225352393864789,
  0.02715245941175409,
] as const;

// Expansión asintótica de Hankel con corte óptimo cuando la serie diverge.
function evaluarHankelAsintotico(_orden: 0 | 1, _u: number): number {
  const mu = 4 * _orden * _orden;
  const ocho_u = 8 * _u;
  const chi = _u - (_orden * 0.5 + 0.25) * Math.PI;

  let suma_p = 1;
  let suma_q = 0;
  let termino = 1;
  let signo_p = 1;
  let signo_q = 1;

  for (let indice = 1; indice <= 30; indice += 1) {
    const impar = 2 * indice - 1;
    const siguiente = termino * ((mu - impar * impar) / (indice * ocho_u));
    if (Math.abs(siguiente) > Math.abs(termino)) {
      break;
    }
    termino = siguiente;

    if (indice % 2 === 0) {
      signo_p = -signo_p;
      suma_p += signo_p * termino;
    } else {
      suma_q += signo_q * termino;
      signo_q = -signo_q;
    }

    if (Math.abs(termino) < 1e-16) {
      break;
    }
  }

  return (
    Math.sqrt(2 / (Math.PI * _u)) *
    (suma_p * Math.cos(chi) - suma_q * Math.sin(chi))
  );
}

export function evaluarBesselJ0(_x: number): number {
  const u = Math.abs(_x);
  if (u === 0) {
    return 1;
  }

  if (u <= UMBRAL_SERIE_BESSEL) {
    const cuarto_u2 = (u * u) * 0.25;
    let suma = 1;
    let termino = 1;

    for (let m = 1; m <= 60; m += 1) {
      termino = (-termino * cuarto_u2) / (m * m);
      suma += termino;
      if (Math.abs(termino) <= 1e-16 * Math.max(1, Math.abs(suma))) {
        break;
      }
    }
    return suma;
  }

  return evaluarHankelAsintotico(0, u);
}

export function evaluarBesselJ1(_x: number): number {
  if (_x === 0) {
    return 0;
  }

  const signo = _x < 0 ? -1 : 1;
  const u = Math.abs(_x);

  if (u <= UMBRAL_SERIE_BESSEL) {
    const cuarto_u2 = (u * u) * 0.25;
    let termino = u * 0.5;
    let suma = termino;

    for (let m = 1; m <= 60; m += 1) {
      termino = (-termino * cuarto_u2) / (m * (m + 1));
      suma += termino;
      if (Math.abs(termino) <= 1e-16 * Math.max(1, Math.abs(suma))) {
        break;
      }
    }
    return signo * suma;
  }

  return signo * evaluarHankelAsintotico(1, u);
}

export function integrarGaussLegendre16(
  _funcion: (_x: number) => number,
  _limite_inferior: number,
  _limite_superior: number,
): number {
  if (_limite_inferior === _limite_superior) {
    return 0;
  }

  const punto_medio = 0.5 * (_limite_inferior + _limite_superior);
  const semiancho = 0.5 * (_limite_superior - _limite_inferior);
  let suma = 0;

  for (let i = 0; i < NODOS_GL16.length; i += 1) {
    const desplazamiento = semiancho * NODOS_GL16[i];
    suma +=
      PESOS_GL16[i] *
      (_funcion(punto_medio - desplazamiento) +
        _funcion(punto_medio + desplazamiento));
  }

  return semiancho * suma;
}

export function errorRelativoCuasiestaticoE(_krho: number): number {
  return Math.abs(1 - evaluarBesselJ0(_krho));
}

export function errorRelativoCuasiestaticoB(_krho: number): number {
  const u = Math.abs(_krho);
  if (u < 1e-12) {
    return 0;
  }
  return Math.abs(1 - (2 * evaluarBesselJ1(u)) / u);
}
