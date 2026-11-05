import { NextResponse } from 'next/server';

import { obtenerBaseDatos } from '../../adapters/mongo/cliente';

/** Readiness: el proceso puede atender trafico (incluye ping real a Mongo). Publico, sin JWT. */
export async function GET() {
  try {
    const db = await obtenerBaseDatos();
    await db.command({ ping: 1 });
    return NextResponse.json({ estado: 'ok' });
  } catch {
    return NextResponse.json({ estado: 'no_listo' }, { status: 503 });
  }
}
