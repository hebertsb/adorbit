/** Tipos del contrato propuesto en contratos/openapi/ms-ia.yaml. */
export type Moneda = 'BOB' | 'USD';
export type TipoColumna = 'texto' | 'numero' | 'dinero' | 'fecha' | 'porcentaje';

export interface Columna {
  clave: string;
  etiqueta: string;
  tipo: TipoColumna;
  moneda?: Moneda;
}

export interface Indicador {
  etiqueta: string;
  valor: string;
  tipo: 'numero' | 'dinero' | 'porcentaje';
  moneda?: Moneda;
}

export interface Grafico {
  tipo: 'barras' | 'linea';
  x: string;
  y: string;
}

export type Fila = Record<string, string | number | null | undefined>;

export interface Reporte {
  id: string;
  pregunta: string;
  titulo: string;
  generado_en: string;
  interpretacion: { herramienta: string; parametros: Record<string, unknown> };
  columnas: Columna[];
  filas: Fila[];
  indicadores?: Indicador[];
  grafico?: Grafico | null;
  advertencias?: string[];
}

export type FormatoExportacion = 'pdf' | 'xlsx';
