const TRAZOS = {
  microfono: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  enviar: 'M4 12 20 4l-5 16-3-7z',
  descargar: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  historial: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4M12 8v4l3 2',
  alerta: 'M12 4 3 20h18zM12 10v4M12 17h.01',
  bloqueo: 'M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6zM9 12l2 2 4-4',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tamano = 20 }: { nombre: NombreIcono; tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
