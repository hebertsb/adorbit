import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { AlmacenamientoPuerto, SolicitudSubidaArchivo } from '../../domain/puertos';

// TODO Hebert: crear el bucket real en Supabase Storage (ADORBIT_CREATIVIDADES_SUPABASE_BUCKET
// en .env.ejemplo) antes de usar esto contra el proyecto real.
let cliente: SupabaseClient | undefined;

function obtenerCliente(): SupabaseClient {
  if (!cliente) {
    const url = process.env.ADORBIT_CREATIVIDADES_SUPABASE_URL;
    const claveServicio = process.env.ADORBIT_CREATIVIDADES_SUPABASE_SERVICE_KEY;
    if (!url || !claveServicio) {
      throw new Error(
        'Faltan ADORBIT_CREATIVIDADES_SUPABASE_URL / ADORBIT_CREATIVIDADES_SUPABASE_SERVICE_KEY',
      );
    }
    cliente = createClient(url, claveServicio);
  }
  return cliente;
}

export class AlmacenamientoSupabase implements AlmacenamientoPuerto {
  async crearUrlSubida(ruta: string): Promise<SolicitudSubidaArchivo> {
    const bucket = process.env.ADORBIT_CREATIVIDADES_SUPABASE_BUCKET ?? 'piezas-creatividades';
    const { data, error } = await obtenerCliente().storage.from(bucket).createSignedUploadUrl(ruta);
    if (error || !data) {
      throw new Error(`No se pudo generar la URL firmada de subida: ${error?.message ?? 'sin detalle'}`);
    }
    return { ruta: data.path, urlSubida: data.signedUrl, token: data.token };
  }
}
