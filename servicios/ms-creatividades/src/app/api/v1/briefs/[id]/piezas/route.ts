import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { obtenerClaveIdempotencia } from '../../../../../../adapters/http/claveIdempotencia';
import { BriefRepositorioMongo } from '../../../../../../adapters/mongo/briefsRepositorioMongo';
import { IdempotenciaRepositorioMongo } from '../../../../../../adapters/mongo/idempotenciaRepositorioMongo';
import { OutboxRepositorioMongo } from '../../../../../../adapters/mongo/outboxRepositorioMongo';
import { PiezaRepositorioMongo } from '../../../../../../adapters/mongo/piezasRepositorioMongo';
import { UnidadDeTrabajoMongo } from '../../../../../../adapters/mongo/unidadDeTrabajoMongo';
import { exigirRol, verificarJwt } from '../../../../../../adapters/seguridad/verificarJwt';
import { manejarError } from '../../../../../../manejadorErrores';
import { SubirPieza } from '../../../../../../use-cases/subirPieza';

const esquemaSubirPieza = z
  .object({
    nombre: z.string().min(1).max(200),
    tipo: z.enum(['imagen', 'video', 'copy', 'audio']),
    archivo: z
      .object({
        ruta: z.string().min(1),
        mime: z.string().min(1),
        tamano: z.number().nonnegative(),
      })
      .strict()
      .optional(),
    huella_imagen: z.string().optional(),
  })
  .strict();

const briefs = new BriefRepositorioMongo();
const piezas = new PiezaRepositorioMongo();
const outbox = new OutboxRepositorioMongo();
const idempotencia = new IdempotenciaRepositorioMongo();
const unidadDeTrabajo = new UnidadDeTrabajoMongo();

/** POST /api/v1/briefs/{id}/piezas — escritura: ejecutivo|creativo|gerente. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente']);
    const clave = obtenerClaveIdempotencia(req);

    const { id } = await params;
    const cuerpo = esquemaSubirPieza.parse(await req.json());

    const { resultado: pieza, repetida } = await new SubirPieza(
      briefs,
      piezas,
      outbox,
      idempotencia,
      unidadDeTrabajo,
    ).ejecutar(clave, {
      briefId: id,
      nombre: cuerpo.nombre,
      tipo: cuerpo.tipo,
      archivo: cuerpo.archivo,
      huellaImagen: cuerpo.huella_imagen,
    });

    return NextResponse.json(pieza.aPropiedades(), { status: repetida ? 200 : 201 });
  } catch (error) {
    return manejarError(error);
  }
}
