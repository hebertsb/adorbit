/** Maximo "redondo" >= valor y paso entre marcas: 1, 2, 2.5 o 5 por potencia de diez. */
export function escalaAmigable(maximo: number, marcas = 4): { maximo: number; paso: number } {
  if (!(maximo > 0)) return { maximo: 1, paso: 1 / marcas };
  const bruto = maximo / marcas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const fraccion = bruto / potencia;
  const base = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 2.5 ? 2.5 : fraccion <= 5 ? 5 : 10;
  const paso = base * potencia;
  return { maximo: Math.ceil(maximo / paso - 1e-9) * paso, paso };
}

/** Marcas del eje desde 0 hasta el maximo. */
export function marcasDelEje(maximo: number, paso: number): number[] {
  const marcas: number[] = [];
  for (let v = 0; v <= maximo + paso / 1000; v += paso) marcas.push(Number(v.toFixed(10)));
  return marcas;
}

/** 0 / 500 / 1K / 2,5K / 1,2M. Compacto desde 1.000, como pide la guia de visualizacion. */
export function formatoCompacto(n: number): string {
  const absoluto = Math.abs(n);
  const redondo = (v: number) => String(Number(v.toFixed(1))).replace('.', ',');
  if (absoluto >= 1_000_000) return `${redondo(n / 1_000_000)}M`;
  if (absoluto >= 1_000) return `${redondo(n / 1_000)}K`;
  return redondo(n);
}
