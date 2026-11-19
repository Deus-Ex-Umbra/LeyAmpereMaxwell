# Laboratorio Virtual — Ley de Ampère-Maxwell

Plataforma web educativa e interactiva en 3D dedicada a la **Ley de Ampère-Maxwell**, construida con **Next.js 16 (App Router)**, **React 19**, **TypeScript estricto**, **Tailwind CSS v4**, **Three.js** y **KaTeX**. El rigor físico y los experimentos guiados siguen los apuntes de *Electromagnetismo* de Juan C. Fernández (FIUBA, 2004 — Capítulos 1, 2, 3 y 5).

## Módulos de la aplicación

1. **Simulador Interactivo 3D y Telemetría (`src/componentes/simulador/`, `src/componentes/escenas/`, `src/componentes/graficas/`)**
   - **Capacitor Circular (Ej. 5-9, Ej. 5-10, Prob. 5.4 y 5.8):** placas de radio $a$ y separación $d$, catálogo de dieléctricos reales ($\varepsilon_r$ y campo de ruptura $E_r$), conductividad $\sigma \ge 0$, excitación en 3 modos (`transitorio_rc`, `ac_cuasiestatico`, `alta_frecuencia_bessel` con funciones exactas $J_0/J_1$), alternancia de superficies amperianas $S_1$ y $S_2$, interruptor de Maxwell $\partial\mathbf{D}/\partial t$ (ON/OFF), vectores 3D toggleables ($\mathbf{E}, \mathbf{D}, \mathbf{B}/\mathbf{H}, \mathbf{J}_c, \mathbf{J}_d, \mathbf{N}=\mathbf{E}\times\mathbf{H}$), perfil radial $|\mathbf{B}(\rho)|$, osciloscopio temporal, diagrama de Bode $\sigma$ vs $\omega\varepsilon$ y diagrama fasorial.
   - **Geometrías Clásicas de Ampère (Cap. 3):** conductor cilíndrico grueso (Ej. 3-18/3-19 con $\mu_r$), cable coaxial (Ej. 3-20 con apantallamiento exterior), solenoide largo (Ej. 3-16) y toroide (Prob. 3.11).
   - **Onda Electromagnética Acoplada (Cap. 5):** acoplamiento Faraday + Ampère-Maxwell ($\gamma = \alpha + i\beta$, $\eta = |\eta|e^{i\theta_\eta}$, $v_p = 1/\sqrt{\mu\varepsilon}$), criterio cuasi-estático $\lambda \ge 10D$ y colapso sin $\partial\mathbf{D}/\partial t$.
2. **Calculadora Analítica Paso a Paso (`src/componentes/calculadora/`)**
   - Resolución paso a paso estilo `deus-parcial` con verificación dimensional SI, invariantes y exportación a bloque LaTeX para **Caso A** (capacitor circular DC/RC/AC), **Caso B** (conductor cilíndrico y cable coaxial) y **Caso C** (campo armónico, pérdidas $\sigma$ vs $\omega\varepsilon$ y criterio Bessel).
3. **Fundamento Teórico e Historia (`src/componentes/teoria/`, `src/lib/datos/teoria-maxwell.ts`)**
   - Comparador interactivo término a término (formas integral, diferencial y fasorial $e^{+i\omega t}$), derivación desde la ecuación de continuidad, Teorema de Poynting, deducción de $c = 1/\sqrt{\mu_0\varepsilon_0}$, tablas de materiales y línea histórica 1820–1888 (Oersted → Ampère → Faraday → Maxwell → Hertz).
4. **Laboratorio de Autoevaluación y Misiones (`src/componentes/evaluacion/`, `src/lib/datos/banco-evaluacion.ts`)**
   - 10 reactivos nivel FIUBA con pistas progresivas, demostración en KaTeX y acceso directo al preset 3D, más 5 misiones interactivas verificadas en vivo desde el simulador.

## Arquitectura y estándar de código

```text
src/
├── app/                     # App Router (layout.tsx, page.tsx, globals.css, loading.tsx, error.tsx)
├── tipos/                   # Contratos TypeScript estrictos del dominio físico y UI
├── hooks/                   # Reloj de simulación por requestAnimationFrame
├── lib/
│   ├── fisica/              # Motor físico puro TS (constantes, Bessel J0/J1, capacitor, geometrías, ondas, invariantes)
│   ├── datos/               # Contenidos teóricos FIUBA, banco de preguntas y misiones
│   ├── three/               # Primitivas científicas WebGL (InstancedMesh, OrbitControls, sprites, disposal)
│   └── utils.ts             # Utilidad combinarClases
└── componentes/
    ├── aplicacion/          # Orquestador principal LaboratorioMaxwellApp y evaluador de misiones
    ├── navegacion/          # EncabezadoLaboratorio
    ├── ui/                  # Instrumentación científica accesible
    ├── ecuaciones/          # FormulaKatex (macros deus-parcial) y PasoAnaliticoDeus
    ├── fondo/               # FondoEcuacionesMaxwell
    ├── escenas/             # Visores Three.js y ContenedorEscena3D con respaldo sin WebGL
    ├── graficas/            # Gráficas 2D SVG puras (perfil radial, osciloscopio, Bode, fasorial)
    ├── simulador/           # Controles, paradoja S1/S2, pizarra viva y ModuloSimulador
    ├── calculadora/         # ModuloCalculadora
    ├── teoria/              # DesgloseEcuacionInteractivo y ModuloTeoria
    └── evaluacion/          # ModuloEvaluacion
```

Convenciones aplicadas en todo el repositorio (Regla 07): 100 % en español, `snake_case` en variables/propiedades, `_snake_case` con prefijo `_` en parámetros de funciones, `camelCase` en funciones, `UPPER_SNAKE_CASE` en constantes, `PascalCase` en componentes/tipos, `kebab-case` en archivos y cero uso de `any`.

## Scripts y verificación local

```bash
npm install
npm run dev                  # Alias: npm run iniciar:desarrollo
npm run typecheck            # Alias: npm run verificar:tipos (tsc --noEmit)
npm run lint                 # Alias: npm run revisar (ESLint 9 flat config)
npm run build                # Alias: npm run compilar (Next.js producción)
node scripts/verificar-fisica.mts  # Suite de invariantes físicos y renderizado KaTeX
```

## Despliegue en Vercel

El repositorio incluye `vercel.json` configurado con `"framework": "nextjs"` y encabezados de seguridad HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), además de `next.config.ts` optimizado para compilación estática sin dependencias externas de servidor.
