import { NextResponse } from 'next/server';

/** Liveness: el proceso esta arriba. Publico, sin JWT (ver verificarJwt.ts). */
export function GET() {
  return NextResponse.json({ estado: 'ok' });
}
