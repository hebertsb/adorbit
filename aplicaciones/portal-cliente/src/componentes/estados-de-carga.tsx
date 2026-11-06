import { ErrorApi } from '../api/cliente-http';

export function Cargando({ etiqueta = 'Cargando' }: { etiqueta?: string }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="cargando__giro" aria-hidden="true" />
      <span>{etiqueta}…</span>
    </div>
  );
}

function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApi) {
    if (error.estado === 404) return 'No encontramos lo que busca.';
    if (error.estado === 403) return 'No tiene permiso para ver esta informacion.';
    return error.message;
  }
  return 'No pudimos conectar con el servidor. Revise su conexion e intente de nuevo.';
}

export function ErrorConsulta({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  return (
    <div className="aviso aviso--peligro" role="alert">
      <p>{mensajeDe(error)}</p>
      {reintentar && (
        <button type="button" className="boton boton--secundario" onClick={reintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SinDatos({ children }: { children: string }) {
  return <p className="sin-datos">{children}</p>;
}
