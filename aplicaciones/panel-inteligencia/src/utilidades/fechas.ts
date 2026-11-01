/** "2026-11-05" -> fecha local (evita el corrimiento de zona horaria de `new Date("2026-11-05")`). */
export function desdeIso(fechaIso: string): Date {
  const [anio = 1970, mes = 1, dia = 1] = fechaIso.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

const formato = new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatearFecha(fechaIso: string | null | undefined): string {
  return fechaIso ? formato.format(desdeIso(fechaIso)) : '—';
}

/** Dias desde `hoy` hasta la fecha (negativo = ya paso). */
export function diasHasta(fechaIso: string, hoy: Date = new Date()): number {
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((desdeIso(fechaIso).getTime() - inicioHoy.getTime()) / 86_400_000);
}
