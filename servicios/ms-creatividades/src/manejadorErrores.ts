import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { ErrorAutenticacion } from './adapters/seguridad/verificarJwt';
import { ExcepcionDominio } from './domain/errores';

/**
 * Cuerpo de error uniforme para todo el servicio — igual forma que el resto del
 * proyecto (ver documentacion/03-contratos.md "Errores").
 */
export interface CuerpoError {
  codigo: string;
  mensaje: string;
  detalle: unknown;
}

const statusPorCodigo: Record<string, number> = {
  brief_no_encontrado: 404,
  pieza_no_encontrada: 404,
  sin_permiso: 403,
  version_conflicto: 409,
  pieza_no_aprobada: 409,
  pieza_bloqueada: 409,
  idempotencia_conflicto: 422,
};

/**
 * Traduce cualquier error lanzado dentro de un handler de app/api a la respuesta HTTP
 * uniforme del proyecto. Mismo patron que ManejadorErrores de ms-facturacion: el
 * codigo de dominio (no el tipo de excepcion) decide el status.
 */
export function manejarError(error: unknown): NextResponse<CuerpoError> {
  if (error instanceof ErrorAutenticacion) {
    const codigo = error.status === 401 ? 'no_autenticado' : 'sin_permiso';
    return NextResponse.json(
      { codigo, mensaje: error.message, detalle: null },
      { status: error.status },
    );
  }

  if (error instanceof ExcepcionDominio) {
    const status = statusPorCodigo[error.codigo] ?? 400;
    return NextResponse.json(
      { codigo: error.codigo, mensaje: error.message, detalle: error.detalle ?? null },
      { status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        codigo: 'solicitud_invalida',
        mensaje: 'La solicitud no cumple el esquema esperado',
        detalle: error.flatten(),
      },
      { status: 400 },
    );
  }

   
  console.error(error);
  return NextResponse.json(
    { codigo: 'error_interno', mensaje: 'Ocurrio un error inesperado', detalle: null },
    { status: 500 },
  );
}
