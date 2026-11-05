import { NextResponse, type NextRequest } from 'next/server';

import { BriefRepositorioMongo } from '../../../../../adapters/mongo/briefsRepositorioMongo';
import { PiezaRepositorioMongo } from '../../../../../adapters/mongo/piezasRepositorioMongo';
import { exigirRol, verificarJwt } from '../../../../../adapters/seguridad/verificarJwt';
import { ExcepcionDominio } from '../../../../../domain/errores';
import { manejarError } from '../../../../../manejadorErrores';
import { ObtenerPieza } from '../../../../../use-cases/obtenerPieza';

const briefs = new BriefRepositorioMongo();
const piezas = new PiezaRepositorioMongo();

/** GET /api/v1/piezas/{id} — lectura: ejecutivo|creativo|gerente|cliente (cliente solo si el brief es suyo). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identidad = await verificarJwt(req);
    exigirRol(identidad, ['ejecutivo', 'creativo', 'gerente', 'cliente']);

    const { id } = await params;
    const pieza = await new ObtenerPieza(piezas).ejecutar(id);

    if (identidad.roles.includes('cliente')) {
      const brief = await briefs.buscarPorId(pieza.briefId);
      if (!brief || brief.clienteId !== identidad.clienteId) {
        // No se distingue "no existe" de "no es tuyo" para no filtrar que el recurso existe.
        throw new ExcepcionDominio('pieza_no_encontrada', `No existe la pieza ${id}`);
      }
    }

    return NextResponse.json(pieza.aPropiedades());
  } catch (error) {
    return manejarError(error);
  }
}
