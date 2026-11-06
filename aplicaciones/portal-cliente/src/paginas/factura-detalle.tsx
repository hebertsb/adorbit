import { Link, useParams } from 'react-router';
import { useFactura } from '../api/consultas';
import { useClienteId } from '../autenticacion/usar-cliente-id';
import { EtiquetaFactura } from '../componentes/etiqueta-estado';
import { Cargando, ErrorConsulta, SinDatos } from '../componentes/estados-de-carga';
import { Icono } from '../componentes/iconos';
import { formatearDinero } from '../utilidades/dinero';
import { formatearFecha } from '../utilidades/fechas';

export function PaginaFacturaDetalle() {
  const clienteId = useClienteId();
  const { id = '' } = useParams();
  const consulta = useFactura(clienteId, id);

  if (consulta.isPending) return <Cargando etiqueta="Cargando la factura" />;
  if (consulta.isError) {
    return (
      <>
        <Link to="/facturas" className="volver">
          <Icono nombre="atras" tamano={18} /> Facturas
        </Link>
        <ErrorConsulta error={consulta.error} reintentar={() => void consulta.refetch()} />
      </>
    );
  }
  const f = consulta.data;
  const dinero = (monto: string) => formatearDinero(monto, f.moneda);

  return (
    <>
      <Link to="/facturas" className="volver">
        <Icono nombre="atras" tamano={18} /> Facturas
      </Link>
      <div className="encabezado-detalle">
        <div>
          <h1>Factura del {formatearFecha(f.fecha_emision)}</h1>
          <p className="identificador">N.° {f.id}</p>
        </div>
        <EtiquetaFactura estado={f.estado} />
      </div>

      <section className="tarjeta" aria-labelledby="titulo-fechas">
        <h2 id="titulo-fechas" className="solo-lectores">
          Datos de la factura
        </h2>
        <dl className="datos">
          <div>
            <dt>Emision</dt>
            <dd>{formatearFecha(f.fecha_emision)}</dd>
          </div>
          <div>
            <dt>Vencimiento</dt>
            <dd>{formatearFecha(f.fecha_vencimiento)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{dinero(f.total)}</dd>
          </div>
          <div>
            <dt>Saldo pendiente</dt>
            <dd className={f.estado === 'vencida' ? 'texto-peligro' : ''}>{dinero(f.saldo)}</dd>
          </div>
        </dl>
      </section>

      <h2>Detalle</h2>
      <table className="tabla">
        <caption className="solo-lectores">Items de la factura</caption>
        <thead>
          <tr>
            <th scope="col">Descripcion</th>
            <th scope="col" className="num">
              Cant.
            </th>
            <th scope="col" className="num">
              Precio
            </th>
            <th scope="col" className="num">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {f.items.map((item) => (
            <tr key={item.numero}>
              <td data-etiqueta="Descripcion">{item.descripcion}</td>
              <td data-etiqueta="Cantidad" className="num">
                {item.cantidad}
              </td>
              <td data-etiqueta="Precio" className="num">
                {dinero(item.precio_unitario)}
              </td>
              <td data-etiqueta="Subtotal" className="num">
                {dinero(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="totales">
        <div>
          <dt>Subtotal</dt>
          <dd>{dinero(f.subtotal)}</dd>
        </div>
        <div>
          <dt>Impuestos</dt>
          <dd>{dinero(f.impuestos)}</dd>
        </div>
        <div className="totales__final">
          <dt>Total</dt>
          <dd>{dinero(f.total)}</dd>
        </div>
      </dl>

      <h2>Pagos recibidos</h2>
      {f.cobros.length === 0 ? (
        <SinDatos>Aun no se registraron pagos para esta factura.</SinDatos>
      ) : (
        <ul className="lista-pagos">
          {f.cobros.map((c) => (
            <li key={c.id}>
              <span>
                {formatearFecha(c.fecha)}
                {c.referencia ? ` · ${c.referencia}` : ''}
              </span>
              <strong>{dinero(c.monto)}</strong>
            </li>
          ))}
        </ul>
      )}

      <p className="acciones-pie">
        <button type="button" className="boton boton--secundario" onClick={() => window.print()}>
          <Icono nombre="imprimir" tamano={18} /> Imprimir
        </button>
      </p>
    </>
  );
}
