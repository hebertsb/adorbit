import { useContratos } from '../api/consultas';
import { useClienteId } from '../autenticacion/usar-cliente-id';
import { EtiquetaContrato } from '../componentes/etiqueta-estado';
import { Cargando, ErrorConsulta, SinDatos } from '../componentes/estados-de-carga';
import { formatearDinero } from '../utilidades/dinero';
import { formatearFecha } from '../utilidades/fechas';

export function PaginaContratos() {
  const clienteId = useClienteId();
  const consulta = useContratos(clienteId, 0, 50);

  return (
    <>
      <h1>Contratos</h1>
      {consulta.isPending && <Cargando etiqueta="Cargando contratos" />}
      {consulta.isError && (
        <ErrorConsulta error={consulta.error} reintentar={() => void consulta.refetch()} />
      )}
      {consulta.data && consulta.data.contenido.length === 0 && (
        <SinDatos>No tiene contratos registrados.</SinDatos>
      )}
      {consulta.data && consulta.data.contenido.length > 0 && (
        <ul className="rejilla lista-tarjetas">
          {consulta.data.contenido.map((c) => (
            <li key={c.id} className="tarjeta">
              <div className="tarjeta__cabecera">
                <p className="tarjeta__titulo">Contrato</p>
                <EtiquetaContrato estado={c.estado} />
              </div>
              <p className="tarjeta__valor">{formatearDinero(c.monto, c.moneda)}</p>
              <p className="tarjeta__pie">
                {formatearFecha(c.fecha_inicio)} → {formatearFecha(c.fecha_fin)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
