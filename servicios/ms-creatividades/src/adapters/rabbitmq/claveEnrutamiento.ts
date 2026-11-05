/** "PiezasBloqueadas" -> "piezas.bloqueadas" — misma convencion que usa ms-facturacion para que el exchange adorbit.eventos sea interoperable entre servicios. */
export function claveEnrutamiento(tipoEvento: string): string {
  return tipoEvento.replace(/([a-z0-9])([A-Z])/g, '$1.$2').toLowerCase();
}
