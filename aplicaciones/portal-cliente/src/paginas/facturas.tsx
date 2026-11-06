import { Link, useSearchParams } from 'react-router';
import { useFacturas } from '../api/consultas';
import type { EstadoFactura } from '../api/tipos';
import { useClienteId } from '../autenticacion/usar-cliente-id';
import { ESTADOS_FACTURA, EtiquetaFactura } from '../componentes/etiqueta-estado';
import { Cargando, ErrorConsulta, SinDatos } from '../componentes/estados-de-carga';
import { formatearDinero } from '../utilidades/dinero';
import { formatearFecha } from '../utilidades/fechas';

const TAMANO = 10;
const VALIDOS = new Set(ESTADOS_FACTURA.map((e) => e.valor));

export function PaginaFacturas() {
  const clienteId = useClienteId();
  const [parametros, fijarParametros] = useSearchParams();
  const crudo = parametros.get('estado') ?? '';
  const estado = (VALIDOS.has(crudo as EstadoFactura) ? crudo : '') as EstadoFactura | '';
  const pagina = Math.max(0, Number(parametros.get('pagina') ?? 0) || 0);
  const consulta = useFacturas(clienteId, estado, pagina, TAMANO);

  const cambiar = (cambios: Record<string, string>) => {
    const siguiente = new URLSearchParams(parametros);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) siguiente.set(clave, valor);
      else siguiente.delete(clave);
    }
    fijarParametros(siguiente);
  };

  return (
    <>
      <h1>Facturas</h1>
      <div className="filtros" role="group" aria-label="Filtrar por estado">
        {ESTADOS_FACTURA.map((e) => (
          <button
            key={e.valor || 'todas'}
            type="button"
            className={`filtro ${estado === e.valor ? 'filtro--activo' : ''}`}
            aria-pressed={estado === e.valor}
            onClick={() => cambiar({ estado: e.valor, pagina: '' })}
          >
            {e.texto}
          </button>
        ))}
      </div>

      {consulta.isPending && <Cargando etiqueta="Cargando facturas" />}
      {consulta.isError && (
        <ErrorConsulta error={consulta.error} reintentar={() => void consulta.refetch()} />
      )}
      {consulta.data && consulta.data.contenido.length === 0 && (
        <SinDatos>No hay facturas para mostrar.</SinDatos>
      )}
      {consulta.data && consulta.data.contenido.length > 0 && (
        <>
          <table className="tabla">
            <caption className="solo-lectores">Facturas</caption>
            <thead>
              <tr>
                <th scope="col">Emision</th>
                <th scope="col">Vencimiento</th>
                <th scope="col">Estado</th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col" className="num">
                  Saldo
                </th>
                <th scope="col">
                  <span className="solo-lectores">Detalle</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {consulta.data.contenido.map((f) => (
                <tr key={f.id}>
                  <td data-etiqueta="Emision">{formatearFecha(f.fecha_emision)}</td>
                  <td data-etiqueta="Vencimiento">{formatearFecha(f.fecha_vencimiento)}</td>
                  <td data-etiqueta="Estado">
                    <EtiquetaFactura estado={f.estado} />
                  </td>
                  <td data-etiqueta="Total" className="num">
                    {formatearDinero(f.total, f.moneda)}
                  </td>
                  <td data-etiqueta="Saldo" className="num">
                    {formatearDinero(f.saldo, f.moneda)}
                  </td>
                  <td className="acciones">
                    <Link to={`/facturas/${f.id}`} className="boton boton--secundario">
                      Ver<span className="solo-lectores"> factura del {formatearFecha(f.fecha_emision)}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <nav className="paginacion" aria-label="Paginacion">
            <button
              type="button"
              className="boton boton--secundario"
              disabled={pagina === 0}
              onClick={() => cambiar({ pagina: String(pagina - 1) })}
            >
              Anterior
            </button>
            <span>
              Pagina {pagina + 1} de {Math.max(1, Math.ceil(consulta.data.total_elementos / TAMANO))}
            </span>
            <button
              type="button"
              className="boton boton--secundario"
              disabled={(pagina + 1) * TAMANO >= consulta.data.total_elementos}
              onClick={() => cambiar({ pagina: String(pagina + 1) })}
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
    </>
  );
}
