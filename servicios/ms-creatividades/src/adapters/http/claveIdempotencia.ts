import { ExcepcionDominio } from '../../domain/errores';

/** Exige y valida el encabezado Idempotency-Key (8-120 caracteres) en toda escritura — regla del proyecto. */
export function obtenerClaveIdempotencia(req: Request): string {
  const clave = req.headers.get('idempotency-key');
  if (!clave || clave.length < 8 || clave.length > 120) {
    throw new ExcepcionDominio(
      'clave_idempotencia_invalida',
      'El encabezado Idempotency-Key es obligatorio (8-120 caracteres)',
    );
  }
  return clave;
}
