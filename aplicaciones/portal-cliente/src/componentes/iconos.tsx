const TRAZOS = {
  inicio: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  factura: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  contrato: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  credito: 'M3 7h18v12H3zM3 11h18M7 15h3',
  empresa: 'M4 21V6l8-3v18M12 9h8v12M7 10h2M7 14h2M15 13h2M15 17h2',
  salir: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  atras: 'M15 5l-7 7 7 7',
  imprimir: 'M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  sinConexion: 'M3 3l18 18M8.5 8.5A9 9 0 0 1 21 12M5 12a9 9 0 0 1 2.5-3.7M9 16a4.5 4.5 0 0 1 6 0M12 20h.01',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tamano = 22 }: { nombre: NombreIcono; tamano?: number }) {
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
