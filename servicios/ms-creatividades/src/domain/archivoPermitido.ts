import { ExcepcionDominio } from './errores';

/** Whitelist + tamanos maximos — ver CLAUDE.md "Validacion de entrada" (subida de archivos). */
const TAMANOS_MAXIMOS_BYTES: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'video/mp4': 200 * 1024 * 1024,
  'application/pdf': 10 * 1024 * 1024,
};

const EXTENSION_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
  'application/pdf': 'pdf',
};

export function validarArchivo(mime: string, tamano: number): void {
  const maximo = TAMANOS_MAXIMOS_BYTES[mime];
  if (!maximo) {
    throw new ExcepcionDominio(
      'archivo_invalido',
      `Tipo de archivo no permitido: ${mime}. Permitidos: ${Object.keys(TAMANOS_MAXIMOS_BYTES).join(', ')}`,
    );
  }
  if (tamano <= 0 || tamano > maximo) {
    throw new ExcepcionDominio('archivo_invalido', `El archivo supera el tamano maximo permitido para ${mime}`);
  }
}

export function extensionPara(mime: string): string {
  return EXTENSION_POR_MIME[mime] ?? 'bin';
}
