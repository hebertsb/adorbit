import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { obtenerClaveIdempotencia } from '../../../../../../adapters/http/claveIdempotencia';
import { IdempotenciaRepositorioMongo } from '../../../../../../adapters/mongo/idempotenciaRepositorioMongo';
import { OutboxRepositorioMongo } from '../../../../../../adapters/mongo/outboxRepositorioMongo';
import { PiezaRepositorioMongo } from '../../../../../../adapters/mongo/piezasRepositorioMongo';
import { UnidadDeTrabajoMongo } from '../../../../../../adapters/mongo/unidadDeTrabajoMongo';
import { exigirRol, verificarJwt } from '../../../../../../adapters/seguridad/verificarJwt';
import { manejarError } from '../../../../../../manejadorErrores';
import { AprobarPieza } from '../../../../../../use-cases/aprobarPieza';

const esquemaDecision = z.object({ decision: z.enum(['aprobar', 'rechazar']) }).strict();

const piezas = new PiezaRepositorioMongo();
const outbox = new OutboxRepositorioMongo();
const idempotencia = new IdempotenciaRepositorioMongo();
const unidadDeTrabajo = new UnidadDeTrabajoMongo();

/** POST /api/v1/piezas/{id}/aprobar — escritura: ejecutivo|creativo|gerente. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente']);
    const clave = obtenerClaveIdempotencia(req);

    const { id } = await params;
    const { decision } = esquemaDecision.parse(await req.json());

    const { resultado: pieza } = await new AprobarPieza(piezas, outbox, idempotencia, unidadDeTrabajo).ejecutar(
      clave,
      id,
      decision,
    );
    return NextResponse.json(pieza.aPropiedades());
  } catch (error) {
    return manejarError(error);
  }
}
