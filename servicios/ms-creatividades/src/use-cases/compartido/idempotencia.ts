import { createHash } from 'node:crypto';

import { ExcepcionDominio } from '../../domain/errores';
import type { IdempotenciaRepositorio, Sesion, UnidadDeTrabajo } from '../../domain/puertos';

/** Huella SHA-256 de los campos de negocio de la solicitud (nunca incluye la clave misma). */
export function calcularHuella(datos: unknown): string {
  return createHash('sha256').update(JSON.stringify(datos)).digest('hex');
}

/** 14 dias — dentro del rango 7-30 dias que exige CLAUDE.md, igual que el comentario de base_de_datos/ms-creatividades.mongo.js. */
const DIAS_VIGENCIA_IDEMPOTENCIA = 14;

export function calcularVencimientoIdempotencia(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + DIAS_VIGENCIA_IDEMPOTENCIA * 24 * 60 * 60 * 1000);
}

export interface ResultadoIdempotente<T> {
  resultado: T;
  /** true si la clave de idempotencia ya se habia procesado antes con los mismos datos. */
  repetida: boolean;
}

/**
 * Envuelve una escritura idempotente: misma clave + mismos datos ⇒ replay (reconstruye
 * el resultado sin repetir el trabajo); misma clave + datos distintos ⇒
 * idempotencia_conflicto; clave nueva ⇒ ejecuta `ejecutar` y guarda el registro de
 * idempotencia en la MISMA transaccion (via UnidadDeTrabajo) — mismo patron que
 * ServicioEmitirFactura de ms-facturacion, adaptado a Mongo.
 */
export async function conIdempotencia<T>(args: {
  idempotencia: IdempotenciaRepositorio;
  unidadDeTrabajo: UnidadDeTrabajo;
  clave: string;
  datosHuella: unknown;
  /** undefined = no se pudo reconstruir (error); cualquier otro valor, incluido null, cuenta como resultado valido. */
  reconstruirReplay: (datosGuardados: Record<string, unknown>) => Promise<T | undefined>;
  ejecutar: (sesion: Sesion) => Promise<{ resultado: T; datosGuardados: Record<string, unknown> }>;
}): Promise<ResultadoIdempotente<T>> {
  const huella = calcularHuella(args.datosHuella);
  const existente = await args.idempotencia.buscarPorClave(args.clave);

  if (existente) {
    if (existente.huellaSolicitud !== huella) {
      throw new ExcepcionDominio(
        'idempotencia_conflicto',
        'La clave de idempotencia ya se uso con datos distintos',
      );
    }
    const datosGuardados = JSON.parse(existente.respuesta ?? '{}') as Record<string, unknown>;
    const resultado = await args.reconstruirReplay(datosGuardados);
    if (resultado === undefined) {
      throw new ExcepcionDominio('error_interno', 'No se pudo recuperar el resultado de una solicitud repetida');
    }
    return { resultado, repetida: true };
  }

  let resultadoFinal!: T;
  await args.unidadDeTrabajo.ejecutar(async (sesion) => {
    const { resultado, datosGuardados } = await args.ejecutar(sesion);
    resultadoFinal = resultado;
    await args.idempotencia.crear(
      {
        clave: args.clave,
        huellaSolicitud: huella,
        estado: 'completado',
        respuesta: JSON.stringify(datosGuardados),
        creadoEn: new Date(),
        venceEn: calcularVencimientoIdempotencia(),
      },
      sesion,
    );
  });

  return { resultado: resultadoFinal, repetida: false };
}
