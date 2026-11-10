import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { useAutenticacion } from './autenticacion/contexto';
import { Cargando } from './componentes/estados-de-carga';
import { Disposicion } from './componentes/disposicion';
import { variablesFaltantes } from './configuracion';
import { PaginaContratos } from './paginas/contratos';
import { PaginaCredito } from './paginas/credito';
import { PaginaEmpresa } from './paginas/empresa';
import { PaginaFacturaDetalle } from './paginas/factura-detalle';
import { PaginaFacturas } from './paginas/facturas';
import {
  PaginaNoEncontrada,
  PaginaRetorno,
  PantallaConfiguracionIncompleta,
  PantallaIngreso,
  PantallaSinAcceso,
} from './paginas/pantallas-de-acceso';
import { PaginaResumen } from './paginas/resumen';

/** Solo entra quien tiene sesion, rol "cliente" y un cliente_id en el token. Los servicios vuelven a validarlo. */
function AreaProtegida() {
  const { fase, usuario } = useAutenticacion();
  const ubicacion = useLocation();
  if (fase === 'cargando') return <Cargando etiqueta="Verificando su sesion" />;
  if (fase === 'anonimo') return <PantallaIngreso volverA={`${ubicacion.pathname}${ubicacion.search}`} />;
  if (!usuario?.roles.includes('cliente') || !usuario.clienteId) return <PantallaSinAcceso />;
  return <Disposicion />;
}

export function Aplicacion() {
  if (variablesFaltantes().length > 0) return <PantallaConfiguracionIncompleta />;
  const basename =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/portal-cliente')
      ? '/portal-cliente'
      : undefined;
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/autenticado" element={<PaginaRetorno />} />
        <Route element={<AreaProtegida />}>
          <Route index element={<PaginaResumen />} />
          <Route path="facturas" element={<PaginaFacturas />} />
          <Route path="facturas/:id" element={<PaginaFacturaDetalle />} />
          <Route path="contratos" element={<PaginaContratos />} />
          <Route path="credito" element={<PaginaCredito />} />
          <Route path="empresa" element={<PaginaEmpresa />} />
          <Route path="*" element={<PaginaNoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
