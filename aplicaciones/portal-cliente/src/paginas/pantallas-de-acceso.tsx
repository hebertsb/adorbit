import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAutenticacion } from '../autenticacion/contexto';
import { obtenerAdministrador } from '../autenticacion/oidc';
import { variablesFaltantes } from '../configuracion';
import { Cargando } from '../componentes/estados-de-carga';

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="pantalla-central" id="contenido">
      <section className="tarjeta tarjeta--central">
        <img src="/favicon.svg" alt="" width="56" height="56" />
        <h1>{titulo}</h1>
        {children}
      </section>
    </main>
  );
}

export function PantallaIngreso({ volverA }: { volverA: string }) {
  const { iniciarSesion } = useAutenticacion();
  const [fallo, setFallo] = useState(false);
  return (
    <Tarjeta titulo="Portal del cliente">
      <p>Ingrese para consultar sus facturas, contratos y credito.</p>
      {fallo && (
        <p className="aviso aviso--peligro" role="alert">
          No pudimos abrir el inicio de sesion. Intente de nuevo en unos minutos.
        </p>
      )}
      <button
        type="button"
        className="boton boton--primario"
        onClick={() => void iniciarSesion(volverA).catch(() => setFallo(true))}
      >
        Ingresar
      </button>
    </Tarjeta>
  );
}

export function PantallaSinAcceso() {
  const { usuario, cerrarSesion } = useAutenticacion();
  const esCliente = usuario?.roles.includes('cliente');
  return (
    <Tarjeta titulo="Sin acceso a este portal">
      {esCliente ? (
        <p>Su usuario no esta asociado a ninguna empresa cliente. Comuniquese con su ejecutivo de cuenta.</p>
      ) : (
        <p>Este portal es para clientes. Si trabaja en la agencia, use el portal de gestion.</p>
      )}
      <button type="button" className="boton boton--secundario" onClick={() => void cerrarSesion()}>
        Salir
      </button>
    </Tarjeta>
  );
}

export function PantallaConfiguracionIncompleta() {
  return (
    <Tarjeta titulo="Configuracion incompleta">
      <p>Faltan variables de entorno de la aplicacion:</p>
      <ul>
        {variablesFaltantes().map((v) => (
          <li key={v}>
            <code>{v}</code>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

/** Pagina a la que Keycloak devuelve al usuario (/autenticado?code=...). */
export function PaginaRetorno() {
  const { sesionIniciada } = useAutenticacion();
  const navegar = useNavigate();
  const [fallo, setFallo] = useState(false);
  const yaProcesado = useRef(false); // StrictMode ejecuta los efectos dos veces; el codigo solo sirve una vez

  useEffect(() => {
    if (yaProcesado.current) return;
    yaProcesado.current = true;
    obtenerAdministrador()
      .signinRedirectCallback()
      .then(async (usuario) => {
        await sesionIniciada();
        const estado = usuario.state as { volverA?: string } | undefined;
        void navegar(estado?.volverA ?? '/', { replace: true });
      })
      .catch(() => setFallo(true));
  }, [navegar, sesionIniciada]);

  if (fallo) {
    return (
      <Tarjeta titulo="No pudimos iniciar su sesion">
        <p>El inicio de sesion no se completo.</p>
        <Link to="/" className="boton boton--primario">
          Volver a intentar
        </Link>
      </Tarjeta>
    );
  }
  return <Cargando etiqueta="Iniciando sesion" />;
}

export function PaginaNoEncontrada() {
  return (
    <>
      <h1>Pagina no encontrada</h1>
      <p>
        <Link to="/">Volver al resumen</Link>
      </p>
    </>
  );
}
