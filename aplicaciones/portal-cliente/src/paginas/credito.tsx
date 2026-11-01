import { useCredito } from '../api/consultas';
import { useClienteId } from '../autenticacion/usar-cliente-id';
import { BarraUso } from '../componentes/barra-uso';
import { Cargando, ErrorConsulta, SinDatos } from '../componentes/estados-de-carga';
import { formatearDinero, porcentaje } from '../utilidades/dinero';

export function PaginaCredito() {
  const clienteId = useClienteId();
  const consulta = useCredito(clienteId);

  if (consulta.isPending) return <Cargando etiqueta="Cargando su credito" />;
  if (consulta.isError)
    return <ErrorConsulta error={consulta.error} reintentar={() => void consulta.refetch()} />;

  const { linea_credito: linea, disponible, reservas_activas: reservas } = consulta.data;
  const uso = porcentaje(linea.usado, linea.limite);
  const dinero = (monto: string) => formatearDinero(monto, linea.moneda);

  return (
    <>
      <h1>Linea de credito</h1>
      <section className="tarjeta" aria-labelledby="titulo-linea">
        <h2 id="titulo-linea" className="solo-lectores">
          Uso de la linea de credito
        </h2>
        <p className="tarjeta__titulo">Disponible</p>
        <p className="tarjeta__valor">{dinero(disponible)}</p>
        <BarraUso porcentaje={uso} etiqueta="Uso de la linea de credito" />
        <dl className="datos">
          <div>
            <dt>Limite</dt>
            <dd>{dinero(linea.limite)}</dd>
          </div>
          <div>
            <dt>Usado</dt>
            <dd>
              {dinero(linea.usado)} ({uso}%)
            </dd>
          </div>
        </dl>
      </section>

      <h2>Reservas por campanas en curso</h2>
      {reservas.length === 0 ? (
        <SinDatos>No hay credito reservado actualmente.</SinDatos>
      ) : (
        <ul className="lista-pagos">
          {reservas.map((r) => (
            <li key={r.reserva_id}>
              <span>Campana {r.campana_id.slice(0, 8)}</span>
              <strong>{dinero(r.monto)}</strong>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
