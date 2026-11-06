import { useCliente } from '../api/consultas';
import { useClienteId } from '../autenticacion/usar-cliente-id';
import { EtiquetaCliente } from '../componentes/etiqueta-estado';
import { Cargando, ErrorConsulta, SinDatos } from '../componentes/estados-de-carga';

export function PaginaEmpresa() {
  const clienteId = useClienteId();
  const consulta = useCliente(clienteId);

  if (consulta.isPending) return <Cargando etiqueta="Cargando sus datos" />;
  if (consulta.isError)
    return <ErrorConsulta error={consulta.error} reintentar={() => void consulta.refetch()} />;
  const cliente = consulta.data;

  return (
    <>
      <h1>Mi empresa</h1>
      <section className="tarjeta" aria-labelledby="titulo-empresa">
        <div className="tarjeta__cabecera">
          <h2 id="titulo-empresa">{cliente.razon_social}</h2>
          <EtiquetaCliente estado={cliente.estado} />
        </div>
        <dl className="datos">
          <div>
            <dt>NIT</dt>
            <dd>{cliente.nit ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <h2>Contactos</h2>
      {cliente.contactos.length === 0 ? (
        <SinDatos>No hay contactos registrados.</SinDatos>
      ) : (
        <ul className="rejilla lista-tarjetas">
          {cliente.contactos.map((c) => (
            <li key={c.id} className="tarjeta">
              <p className="tarjeta__valor tarjeta__valor--texto">{c.nombre}</p>
              {c.rol && <p className="tarjeta__titulo">{c.rol}</p>}
              <p className="tarjeta__pie">
                {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                {c.email && c.telefono && <br />}
                {c.telefono && <a href={`tel:${c.telefono}`}>{c.telefono}</a>}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="nota">Para cambiar estos datos, comuniquese con su ejecutivo de cuenta.</p>
    </>
  );
}
