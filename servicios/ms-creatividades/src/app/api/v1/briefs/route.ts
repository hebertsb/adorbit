import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { BriefRepositorioMongo } from '../../../../adapters/mongo/briefsRepositorioMongo';
import { IdempotenciaRepositorioMongo } from '../../../../adapters/mongo/idempotenciaRepositorioMongo';
import { OutboxRepositorioMongo } from '../../../../adapters/mongo/outboxRepositorioMongo';
import { UnidadDeTrabajoMongo } from '../../../../adapters/mongo/unidadDeTrabajoMongo';
import { obtenerClaveIdempotencia } from '../../../../adapters/http/claveIdempotencia';
import { ErrorAutenticacion, exigirRol, verificarJwt } from '../../../../adapters/seguridad/verificarJwt';
import { manejarError } from '../../../../manejadorErrores';
import { CrearBrief } from '../../../../use-cases/crearBrief';
import { ListarBriefs } from '../../../../use-cases/listarBriefs';

const esquemaUuid = z.string().uuid();
const esquemaConsulta = z.object({
  campana_id: esquemaUuid.optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().safe()).default(1),
  size: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
}).strict();

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

    const parametros = new URL(req.url).searchParams;
    const consulta: Record<string, string | string[]> = {};
    for (const [clave, valor] of parametros) {
      const anterior = consulta[clave];
      consulta[clave] = anterior === undefined ? valor : [valor];
    }
    const { campana_id: campanaId, page: pagina, size: tamano } = esquemaConsulta.parse(consulta);

    const clienteId = identidad.roles.includes('cliente') ? identidad.clienteId : undefined;
    if (identidad.roles.includes('cliente') && !esquemaUuid.safeParse(clienteId).success) {
      throw new ErrorAutenticacion('El token no tiene un cliente_id valido', 403);
    }

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
