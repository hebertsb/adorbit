import { NavLink, Outlet } from 'react-router';
import { useAutenticacion } from '../autenticacion/contexto';
import { BannerSinConexion } from './banner-sin-conexion';
import { Icono, type NombreIcono } from './iconos';

const ENLACES: { ruta: string; texto: string; icono: NombreIcono; fin?: boolean }[] = [
  { ruta: '/', texto: 'Resumen', icono: 'inicio', fin: true },
  { ruta: '/facturas', texto: 'Facturas', icono: 'factura' },
  { ruta: '/contratos', texto: 'Contratos', icono: 'contrato' },
  { ruta: '/credito', texto: 'Credito', icono: 'credito' },
  { ruta: '/empresa', texto: 'Mi empresa', icono: 'empresa' },
];

export function Disposicion() {
  const { usuario, cerrarSesion } = useAutenticacion();
  return (
    <div className="app">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="barra-superior">
        <div className="marca">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>
            AdOrbit <small>Portal del cliente</small>
          </span>
        </div>
        <div className="usuario">
          <span className="usuario__nombre">{usuario?.nombre}</span>
          <button type="button" className="boton boton--fantasma" onClick={() => void cerrarSesion()}>
            <Icono nombre="salir" tamano={18} />
            <span>Salir</span>
          </button>
        </div>
      </header>
      <nav className="navegacion" aria-label="Principal">
        {ENLACES.map((enlace) => (
          <NavLink key={enlace.ruta} to={enlace.ruta} end={enlace.fin} className="navegacion__enlace">
            <Icono nombre={enlace.icono} />
            <span>{enlace.texto}</span>
          </NavLink>
        ))}
      </nav>
      <main id="contenido" className="contenido" tabIndex={-1}>
        <BannerSinConexion />
        <Outlet />
      </main>
    </div>
  );
}
