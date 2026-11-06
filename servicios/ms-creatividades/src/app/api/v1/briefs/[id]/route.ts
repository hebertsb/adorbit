import { NextResponse, type NextRequest } from 'next/server';

import { BriefRepositorioMongo } from '../../../../../adapters/mongo/briefsRepositorioMongo';
import { exigirRol, verificarJwt } from '../../../../../adapters/seguridad/verificarJwt';
import { ExcepcionDominio } from '../../../../../domain/errores';
import { manejarError } from '../../../../../manejadorErrores';
import { ObtenerBrief } from '../../../../../use-cases/obtenerBrief';

const briefs = new BriefRepositorioMongo();

/** GET /api/v1/briefs/{id} — lectura: ejecutivo|creativo|gerente|cliente (cliente solo si el brief es suyo). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente', 'cliente']);

    const { id } = await params;
    const brief = await new ObtenerBrief(briefs).ejecutar(id);

    if (identidad.roles.includes('cliente') && brief.clienteId !== identidad.clienteId) {
      // No se distingue "no existe" de "no es tuyo" para no filtrar que el recurso existe.
      throw new ExcepcionDominio('brief_no_encontrado', `No existe el brief ${id}`);
    }

    return NextResponse.json(brief.aPropiedades());
  } catch (error) {
    return manejarError(error);
  }
}
