"use client";

export function FondoEcuacionesMaxwell() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden bg-fondo-base"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 52% at 18% 8%, rgba(56, 189, 248, 0.09), transparent 68%), radial-gradient(ellipse 56% 48% at 84% 18%, rgba(168, 85, 247, 0.08), transparent 65%), radial-gradient(ellipse 64% 50% at 50% 96%, rgba(16, 185, 129, 0.055), transparent 66%)",
        }}
      />

      <div className="rejilla-tecnica absolute inset-0 opacity-85" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.11]"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="gradiente-lazo-b" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="gradiente-eje-z" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Anillos amperianos concéntricos estilizados y coordenadas cilíndricas */}
        <g transform="translate(1165 250)">
          <ellipse cx="0" cy="0" rx="220" ry="74" stroke="url(#gradiente-lazo-b)" strokeWidth="1.2" strokeDasharray="6 6" />
          <ellipse cx="0" cy="0" rx="148" ry="50" stroke="url(#gradiente-lazo-b)" strokeWidth="1" />
          <ellipse cx="0" cy="0" rx="84" ry="28" stroke="#38bdf8" strokeOpacity="0.45" strokeWidth="0.9" />
          <line x1="0" y1="-165" x2="0" y2="165" stroke="url(#gradiente-eje-z)" strokeWidth="1.2" />
          <line x1="-250" y1="0" x2="250" y2="0" stroke="#94a3b8" strokeOpacity="0.22" strokeWidth="0.8" />
          <circle cx="148" cy="0" r="3" fill="#f43f5e" fillOpacity="0.7" />
          <circle cx="-148" cy="0" r="3" fill="#f43f5e" fillOpacity="0.7" />
          <text x="10" y="-140" fill="#94a3b8" fontSize="13" fontFamily="monospace">ẑ</text>
          <text x="158" y="-10" fill="#f43f5e" fontSize="13" fontFamily="monospace">φ̂ · B(ρ)</text>
          <text x="72" y="20" fill="#38bdf8" fontSize="12" fontFamily="monospace">ρ ≤ a</text>
        </g>

        {/* Onda acoplada E ⊥ B en zona inferior izquierda */}
        <g transform="translate(48 670)">
          <line x1="0" y1="0" x2="460" y2="0" stroke="#94a3b8" strokeOpacity="0.26" strokeWidth="1" />
          <path
            d="M 0 0 C 38 -74, 76 -74, 115 0 C 154 74, 192 74, 230 0 C 268 -74, 306 -74, 345 0 C 384 74, 422 74, 460 0"
            stroke="#38bdf8"
            strokeOpacity="0.65"
            strokeWidth="1.35"
          />
          <path
            d="M 0 0 C 38 -26, 76 -26, 115 0 C 154 26, 192 26, 230 0 C 268 -26, 306 -26, 345 0 C 384 26, 422 26, 460 0"
            stroke="#f43f5e"
            strokeOpacity="0.55"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <text x="412" y="-16" fill="#10b981" fontSize="12" fontFamily="monospace">N = E × H</text>
        </g>

        {/* Marcas de calibración de laboratorio en esquinas */}
        <g stroke="#64748b" strokeOpacity="0.4" strokeWidth="1">
          <path d="M 28 52 L 28 28 L 52 28" />
          <path d="M 1412 52 L 1412 28 L 1388 28" />
          <path d="M 28 848 L 28 872 L 52 872" />
          <path d="M 1412 848 L 1412 872 L 1388 872" />
        </g>
      </svg>

      {/* Ecuaciones de Maxwell sutiles en periferia (baja opacidad) */}
      <div className="hidden lg:block">
        <span className="absolute left-8 top-24 font-mono text-xs tracking-wider text-sky-300/[0.11]">
          ∇ × H = J_c + ∂D/∂t
        </span>
        <span className="absolute right-10 top-20 font-mono text-xs tracking-wider text-purple-300/[0.11]">
          ∮_C H · dl = I_c + dΦ_D/dt
        </span>
        <span className="absolute left-10 top-1/2 font-mono text-[11px] tracking-wider text-slate-300/[0.09]">
          ∇ · J + ∂ρ/∂t = 0
        </span>
        <span className="absolute right-12 top-[56%] font-mono text-[11px] tracking-wider text-rose-300/[0.1]">
          B(ρ, t) = (i ΔV / cL) J₁(kρ) φ̂
        </span>
        <span className="absolute bottom-14 left-12 font-mono text-xs tracking-wider text-emerald-300/[0.11]">
          c = 1 / √(μ₀ ε₀)
        </span>
        <span className="absolute bottom-14 right-10 font-mono text-[11px] tracking-wider text-amber-300/[0.1]">
          σ_eq = σ + iωε · D = ε₀ε_r E
        </span>
      </div>
    </div>
  );
}
