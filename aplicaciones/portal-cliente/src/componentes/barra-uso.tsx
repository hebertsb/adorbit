export function BarraUso({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  const nivel = porcentaje >= 90 ? 'peligro' : porcentaje >= 70 ? 'aviso' : 'ok';
  return (
    <div
      className="barra-uso"
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
    >
      <div
        className={`barra-uso__relleno barra-uso__relleno--${nivel}`}
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}
