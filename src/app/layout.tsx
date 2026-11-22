import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Outfit, Space_Grotesk, Syne } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { PantallaBloqueoGlitch } from "@/componentes/bloqueo";
import { FondoEcuacionesMaxwell } from "@/componentes/fondo/fondo-ecuaciones-maxwell";
import { CLAVE_ALMACENAMIENTO_TEMA, ProveedorTema } from "@/contextos";

const FUENTE_ESPACIO = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const FUENTE_INTER = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const FUENTE_MONO = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const FUENTE_OUTFIT = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const FUENTE_SYNE = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const SCRIPT_INICIALIZACION_TEMA = `
(function(){
  try {
    var r = document.documentElement;
    if (new URLSearchParams(window.location.search).get("lock") === "1") {
      r.classList.add("bloqueo-dimensional");
    }
    var t = localStorage.getItem(${JSON.stringify(CLAVE_ALMACENAMIENTO_TEMA)});
    if (t === "claro") {
      r.classList.remove("dark");
      r.classList.add("claro");
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", "#f8fafc");
    } else {
      r.classList.remove("claro");
      r.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: "Laboratorio Virtual — Ley de Ampère-Maxwell | Electromagnetismo",
  description:
    "Simulador 3D interactivo, calculadora analítica paso a paso y fundamento teórico de la Ley de Ampère-Maxwell, corriente de desplazamiento, modos de Bessel y ondas electromagnéticas.",
  keywords: [
    "Ley de Ampère-Maxwell",
    "electromagnetismo",
    "corriente de desplazamiento",
    "ecuaciones de Maxwell",
    "simulador 3D",
    "Three.js",
    "física universitaria",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060a13",
};

export default function RootLayout(
  _propiedades: Readonly<{
    children: React.ReactNode;
  }>,
) {
  const { children } = _propiedades;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`dark ${FUENTE_ESPACIO.variable} ${FUENTE_INTER.variable} ${FUENTE_MONO.variable} ${FUENTE_OUTFIT.variable} ${FUENTE_SYNE.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: SCRIPT_INICIALIZACION_TEMA }}
        />
      </head>
      <body className="relative min-h-dvh font-sans antialiased text-texto-principal selection:bg-azul-activo/30 selection:text-texto-principal">
        <ProveedorTema>
          <div className="contenido-principal-laboratorio relative flex min-h-dvh flex-col">
            <FondoEcuacionesMaxwell />
            <div className="relative z-0 flex min-h-dvh flex-col">{children}</div>
          </div>
          <PantallaBloqueoGlitch />
        </ProveedorTema>
      </body>
    </html>
  );
}
