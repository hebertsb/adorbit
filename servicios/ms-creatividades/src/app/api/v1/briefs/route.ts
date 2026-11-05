import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { BriefRepositorioMongo } from '../../../../adapters/mongo/briefsRepositorioMongo';
import { IdempotenciaRepositorioMongo } from '../../../../adapters/mongo/idempotenciaRepositorioMongo';
import { OutboxRepositorioMongo } from '../../../../adapters/mongo/outboxRepositorioMongo';
import { UnidadDeTrabajoMongo } from '../../../../adapters/mongo/unidadDeTrabajoMongo';
import { obtenerClaveIdempotencia } from '../../../../adapters/http/claveIdempotencia';
import { exigirRol, verificarJwt } from '../../../../adapters/seguridad/verificarJwt';
import { manejarError } from '../../../../manejadorErrores';
import { CrearBrief } from '../../../../use-cases/crearBrief';
import { ListarBriefs } from '../../../../use-cases/listarBriefs';

const esquemaUuid = z.string().uuid();

const esquemaCrearBrief = z
  .object({
    campana_id: esquemaUuid,
    cliente_id: esquemaUuid.optional(),
    titulo: z.string().min(1).max(200),
    descripcion: z.string().max(2000).optional(),
  })
  .strict();

const briefs = new BriefRepositorioMongo();
const outbox = new OutboxRepositorioMongo();
const idempotencia = new IdempotenciaRepositorioMongo();
const unidadDeTrabajo = new UnidadDeTrabajoMongo();

/** GET /api/v1/briefs?campana_id=&page=&size= — lectura: ejecutivo|creativo|gerente|cliente (cliente acotado a su cliente_id). */
export async function GET(req: NextRequest) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente', 'cliente']);

    const url = new URL(req.url);
    const campanaId = url.searchParams.get('campana_id') ?? undefined;
    const pagina = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const tamano = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? '20') || 20));

    const clienteId = identidad.roles.includes('cliente') ? identidad.clienteId : undefined;

    const resultado = await new ListarBriefs(briefs).ejecutar({ campanaId, clienteId, pagina, tamano });
    return NextResponse.json({
      items: resultado.items.map((b) => b.aPropiedades()),
      total: resultado.total,
      page: resultado.pagina,
      size: resultado.tamano,
    });
  } catch (error) {
    return manejarError(error);
  }
}

/** POST /api/v1/briefs — escritura: ejecutivo|creativo|gerente (el rol cliente no crea briefs). */
export async function POST(req: NextRequest) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente']);
    const clave = obtenerClaveIdempotencia(req);

    const cuerpo = esquemaCrearBrief.parse(await req.json());
    const { resultado: brief, repetida } = await new CrearBrief(
      briefs,
      outbox,
      idempotencia,
      unidadDeTrabajo,
    ).ejecutar(clave, {
      campanaId: cuerpo.campana_id,
      clienteId: cuerpo.cliente_id,
      titulo: cuerpo.titulo,
      descripcion: cuerpo.descripcion,
    });

    return NextResponse.json(brief.aPropiedades(), { status: repetida ? 200 : 201 });
  } catch (error) {
    return manejarError(error);
  }
}
