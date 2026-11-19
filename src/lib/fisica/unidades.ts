export interface OpcionesFormatoSI {
  decimales?: number;
  mostrar_signo?: boolean;
  umbral_cero?: number;
}

export interface ValorFormateadoSI {
  texto: string;
  parte_numerica: string;
  unidad_prefijada: string;
  prefijo: string;
  exponente: number;
}

const PREFIJOS_SI: ReadonlyArray<{ exponente: number; simbolo: string }> = [
  { exponente: 12, simbolo: "T" },
  { exponente: 9, simbolo: "G" },
  { exponente: 6, simbolo: "M" },
  { exponente: 3, simbolo: "k" },
  { exponente: 0, simbolo: "" },
  { exponente: -3, simbolo: "m" },
  { exponente: -6, simbolo: "µ" },
  { exponente: -9, simbolo: "n" },
  { exponente: -12, simbolo: "p" },
  { exponente: -15, simbolo: "f" },
];

export function formatearNotacionCientifica(
  _valor: number,
  _decimales: number = 2,
): string {
  if (!Number.isFinite(_valor)) {
    return Number.isNaN(_valor) ? "—" : _valor > 0 ? "∞" : "-∞";
  }
  if (_valor === 0) {
    return (0).toFixed(_decimales);
  }
  const exponente = Math.floor(Math.log10(Math.abs(_valor)));
  const mantisa = _valor / Math.pow(10, exponente);
  return `${mantisa.toFixed(_decimales)} × 10^${exponente}`;
}

export function formatearAdimensional(
  _valor: number,
  _decimales: number = 3,
  _mostrar_signo: boolean = false,
): string {
  if (!Number.isFinite(_valor)) {
    return Number.isNaN(_valor) ? "—" : _valor > 0 ? "∞" : "-∞";
  }
  const magnitud = Math.abs(_valor);
  if (magnitud < 1e-24) {
    return (0).toFixed(_decimales);
  }
  const signo = _valor < 0 ? "-" : _mostrar_signo ? "+" : "";
  if (magnitud >= 1e-3 && magnitud < 1e4) {
    return `${signo}${magnitud.toFixed(_decimales)}`;
  }
  const exponente = Math.floor(Math.log10(magnitud));
  const mantisa = magnitud / Math.pow(10, exponente);
  return `${signo}${mantisa.toFixed(_decimales)} × 10^${exponente}`;
}

export function formatearAdimensionalLatex(
  _valor: number,
  _decimales: number = 3,
  _mostrar_signo: boolean = false,
): string {
  if (!Number.isFinite(_valor)) {
    return Number.isNaN(_valor) ? "\\text{—}" : _valor > 0 ? "\\infty" : "-\\infty";
  }
  const magnitud = Math.abs(_valor);
  if (magnitud < 1e-24) {
    return (0).toFixed(_decimales);
  }
  const signo = _valor < 0 ? "-" : _mostrar_signo ? "+" : "";
  if (magnitud >= 1e-3 && magnitud < 1e4) {
    return `${signo}${magnitud.toFixed(_decimales)}`;
  }
  const exponente = Math.floor(Math.log10(magnitud));
  const mantisa = (magnitud / Math.pow(10, exponente)).toFixed(_decimales);
  return `${signo}${mantisa}\\times 10^{${exponente}}`;
}

export function formatearUnidadSI(
  _valor: number,
  _unidad_base: string,
  _opciones?: OpcionesFormatoSI,
): ValorFormateadoSI {
  const decimales = _opciones?.decimales ?? 2;
  const mostrar_signo = _opciones?.mostrar_signo ?? false;
  const umbral_cero = _opciones?.umbral_cero ?? 1e-24;
  const sufijo_unidad = _unidad_base.trim();

  if (!Number.isFinite(_valor)) {
    const simbolo = Number.isNaN(_valor) ? "—" : _valor > 0 ? "∞" : "-∞";
    return {
      texto: sufijo_unidad ? `${simbolo} ${sufijo_unidad}` : simbolo,
      parte_numerica: simbolo,
      unidad_prefijada: sufijo_unidad,
      prefijo: "",
      exponente: 0,
    };
  }

  const magnitud = Math.abs(_valor);
  if (magnitud < umbral_cero) {
    const cero_texto = (0).toFixed(decimales);
    return {
      texto: sufijo_unidad ? `${cero_texto} ${sufijo_unidad}` : cero_texto,
      parte_numerica: cero_texto,
      unidad_prefijada: sufijo_unidad,
      prefijo: "",
      exponente: 0,
    };
  }

  // Magnitudes adimensionales nunca llevan prefijos métricos SI (evita confundir "m" con metros).
  if (!sufijo_unidad) {
    const texto_adim = formatearAdimensional(_valor, decimales, mostrar_signo);
    return {
      texto: texto_adim,
      parte_numerica: texto_adim,
      unidad_prefijada: "",
      prefijo: "",
      exponente: magnitud >= 1e-3 && magnitud < 1e4 ? 0 : Math.floor(Math.log10(magnitud)),
    };
  }

  const signo_texto = _valor < 0 ? "-" : mostrar_signo ? "+" : "";

  if (magnitud >= 1e15 || magnitud < 1e-15) {
    const exponente = Math.floor(Math.log10(magnitud));
    const mantisa = magnitud / Math.pow(10, exponente);
    const numero_txt = `${signo_texto}${mantisa.toFixed(decimales)} × 10^${exponente}`;
    return {
      texto: sufijo_unidad ? `${numero_txt} ${sufijo_unidad}` : numero_txt,
      parte_numerica: numero_txt,
      unidad_prefijada: sufijo_unidad,
      prefijo: "",
      exponente,
    };
  }

  let seleccion = PREFIJOS_SI[PREFIJOS_SI.length - 1];
  for (const entrada of PREFIJOS_SI) {
    if (magnitud >= Math.pow(10, entrada.exponente) * (1 - 1e-12)) {
      seleccion = entrada;
      break;
    }
  }

  let escalado = magnitud / Math.pow(10, seleccion.exponente);
  if (Number(escalado.toFixed(decimales)) >= 1000 && seleccion.exponente < 12) {
    const indice_actual = PREFIJOS_SI.indexOf(seleccion);
    if (indice_actual > 0) {
      seleccion = PREFIJOS_SI[indice_actual - 1];
      escalado = magnitud / Math.pow(10, seleccion.exponente);
    }
  }

  const parte_numerica = `${signo_texto}${escalado.toFixed(decimales)}`;
  const unidad_prefijada = `${seleccion.simbolo}${sufijo_unidad}`;
  const texto = unidad_prefijada
    ? `${parte_numerica} ${unidad_prefijada}`
    : parte_numerica;

  return {
    texto,
    parte_numerica,
    unidad_prefijada,
    prefijo: seleccion.simbolo,
    exponente: seleccion.exponente,
  };
}

function envolverUnidadLatex(_unidad: string): string {
  const limpia = _unidad.trim();
  if (!limpia) {
    return "";
  }
  if (/[\\^_{}]/.test(limpia)) {
    return limpia;
  }
  return `\\text{${limpia}}`;
}

export function formatearNumeroLatex(
  _valor: number,
  _unidad_latex: string,
  _opciones?: OpcionesFormatoSI,
): string {
  const decimales = _opciones?.decimales ?? 2;
  const mostrar_signo = _opciones?.mostrar_signo ?? false;
  const umbral_cero = _opciones?.umbral_cero ?? 1e-24;
  const unidad_envuelta = envolverUnidadLatex(_unidad_latex);

  if (!Number.isFinite(_valor)) {
    const simbolo = Number.isNaN(_valor)
      ? "\\text{—}"
      : _valor > 0
        ? "\\infty"
        : "-\\infty";
    return unidad_envuelta ? `${simbolo}\\,${unidad_envuelta}` : simbolo;
  }

  const magnitud = Math.abs(_valor);
  if (magnitud < umbral_cero) {
    const cero = (0).toFixed(decimales);
    return unidad_envuelta ? `${cero}\\,${unidad_envuelta}` : cero;
  }

  const signo = _valor < 0 ? "-" : mostrar_signo ? "+" : "";

  if (magnitud >= 1e15 || magnitud < 1e-15) {
    const exponente = Math.floor(Math.log10(magnitud));
    const mantisa = (magnitud / Math.pow(10, exponente)).toFixed(decimales);
    const cuerpo = `${signo}${mantisa}\\times 10^{${exponente}}`;
    return unidad_envuelta ? `${cuerpo}\\,${unidad_envuelta}` : cuerpo;
  }

  if (!unidad_envuelta) {
    return formatearAdimensionalLatex(_valor, decimales, mostrar_signo);
  }

  const formateado = formatearUnidadSI(_valor, "u", {
    decimales,
    mostrar_signo,
    umbral_cero,
  });

  const prefijo_latex =
    formateado.prefijo === "µ"
      ? "\\mu "
      : formateado.prefijo
        ? `\\text{${formateado.prefijo}}`
        : "";

  return `${formateado.parte_numerica}\\,${prefijo_latex}${unidad_envuelta}`;
}

export function formatearGrados(
  _radianes: number,
  _decimales: number = 1,
): string {
  const grados = (_radianes * 180) / Math.PI;
  return `${grados.toFixed(_decimales)}°`;
}
