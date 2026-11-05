import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { obtenerClaveIdempotencia } from '../../../../../../adapters/http/claveIdempotencia';
import { IdempotenciaRepositorioMongo } from '../../../../../../adapters/mongo/idempotenciaRepositorioMongo';
import { PiezaRepositorioMongo } from '../../../../../../adapters/mongo/piezasRepositorioMongo';
import { UnidadDeTrabajoMongo } from '../../../../../../adapters/mongo/unidadDeTrabajoMongo';
import { ValidacionAuditoriaRepositorioMongo } from '../../../../../../adapters/mongo/validacionesAuditoriaRepositorioMongo';
import { exigirRol, verificarJwt } from '../../../../../../adapters/seguridad/verificarJwt';
import { manejarError } from '../../../../../../manejadorErrores';
import { RegistrarValidacion } from '../../../../../../use-cases/registrarValidacion';

const esquemaValidacion = z
  .object({
    resultado: z.enum(['ok', 'observada', 'rechazada']),
    origen: z.enum(['manual', 'ia']),
    detalles: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const piezas = new PiezaRepositorioMongo();
const auditoria = new ValidacionAuditoriaRepositorioMongo();
const idempotencia = new IdempotenciaRepositorioMongo();
const unidadDeTrabajo = new UnidadDeTrabajoMongo();

/** POST /api/v1/piezas/{id}/validaciones — escritura: ejecutivo|creativo|gerente. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente']);
    const clave = obtenerClaveIdempotencia(req);

    const { id } = await params;
    const cuerpo = esquemaValidacion.parse(await req.json());

    const { repetida } = await new RegistrarValidacion(piezas, auditoria, idempotencia, unidadDeTrabajo).ejecutar(
      clave,
      {
        piezaId: id,
        resultado: cuerpo.resultado,
        origen: cuerpo.origen,
        usuario: identidad.usuarioId,
        detalles: cuerpo.detalles,
      },
    );

    return NextResponse.json({ registrado: true }, { status: repetida ? 200 : 201 });
  } catch (error) {
    return manejarError(error);
  }
}
