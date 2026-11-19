export default function CargandoLaboratorio() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-6">
      <div className="panel-laboratorio flex flex-col items-center gap-4 rounded-2xl px-8 py-7 text-center">
        <div
          aria-hidden="true"
          className="h-9 w-9 animate-spin rounded-full border-2 border-azul-activo/25 border-t-azul-activo"
        />
        <div>
          <p className="font-display text-base font-medium text-texto-principal">
            Inicializando Laboratorio Virtual
          </p>
          <p className="mt-1 font-mono text-xs text-texto-secundario">
            Cargando motor electromagnético y entorno 3D…
          </p>
        </div>
      </div>
    </main>
  );
}
