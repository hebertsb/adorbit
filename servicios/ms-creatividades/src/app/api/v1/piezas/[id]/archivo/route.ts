import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { AlmacenamientoSupabase } from '../../../../../../adapters/almacenamiento/supabaseStorage';
import { obtenerClaveIdempotencia } from '../../../../../../adapters/http/claveIdempotencia';
import { IdempotenciaRepositorioMongo } from '../../../../../../adapters/mongo/idempotenciaRepositorioMongo';
import { OutboxRepositorioMongo } from '../../../../../../adapters/mongo/outboxRepositorioMongo';
import { PiezaRepositorioMongo } from '../../../../../../adapters/mongo/piezasRepositorioMongo';
import { UnidadDeTrabajoMongo } from '../../../../../../adapters/mongo/unidadDeTrabajoMongo';
import { exigirRol, verificarJwt } from '../../../../../../adapters/seguridad/verificarJwt';
import { manejarError } from '../../../../../../manejadorErrores';
import { SolicitarSubidaPieza } from '../../../../../../use-cases/solicitarSubidaPieza';

const esquemaSolicitudArchivo = z
  .object({
    mime: z.enum(['image/jpeg', 'image/png', 'video/mp4', 'application/pdf']),
    tamano: z.number().positive(),
    huella_imagen: z.string().optional(),
  })
  .strict();

const piezas = new PiezaRepositorioMongo();
const almacenamiento = new AlmacenamientoSupabase();
const outbox = new OutboxRepositorioMongo();
const idempotencia = new IdempotenciaRepositorioMongo();
const unidadDeTrabajo = new UnidadDeTrabajoMongo();

/** POST /api/v1/piezas/{id}/archivo — escritura: ejecutivo|creativo|gerente. Devuelve una URL firmada de subida. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente']);
    const clave = obtenerClaveIdempotencia(req);

    const { id } = await params;
    const cuerpo = esquemaSolicitudArchivo.parse(await req.json());

    const { resultado, repetida } = await new SolicitarSubidaPieza(
      piezas,
      almacenamiento,
      outbox,
      idempotencia,
      unidadDeTrabajo,
    ).ejecutar(clave, {
      piezaId: id,
      mime: cuerpo.mime,
      tamano: cuerpo.tamano,
      huellaImagen: cuerpo.huella_imagen,
    });

    return NextResponse.json(resultado, { status: repetida ? 200 : 201 });
  } catch (error) {
    return manejarError(error);
  }
}
