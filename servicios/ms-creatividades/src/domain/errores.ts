/**
 * Error de dominio con un codigo estable (no el tipo de excepcion) que la capa HTTP
 * usa para decidir el status — mismo patron que ExcepcionDominio en ms-facturacion.
 */
export class ExcepcionDominio extends Error {
  readonly codigo: string;
  readonly detalle?: unknown;

  constructor(codigo: string, mensaje: string, detalle?: unknown) {
    super(mensaje);
    this.name = 'ExcepcionDominio';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}
