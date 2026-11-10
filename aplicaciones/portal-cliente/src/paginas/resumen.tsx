import { Link } from 'react-router';
import { useContratos, useCredito, useFacturas } from '../api/consultas';
import { useClienteId } from '../autenticacion/usar-cliente-id';
import { BarraUso } from '../componentes/barra-uso';
import { Cargando, ErrorConsulta } from '../componentes/estados-de-carga';
import { formatearDinero, porcentaje } from '../utilidades/dinero';
import { diasHasta, formatearFecha } from '../utilidades/fechas';
import { resumirFacturas } from '../utilidades/resumen';

export function PaginaResumen() {
  const clienteId = useClienteId();
  const facturas = useFacturas(clienteId, '', 0, 100);
  const credito = useCredito(clienteId);
  const contratos = useContratos(clienteId, 0, 100);

  const fallo = facturas.error ?? credito.error ?? contratos.error;
  if (fallo) {
    return (
      <ErrorConsulta
        error={fallo}
        reintentar={() => {
          void facturas.refetch();
          void credito.refetch();
          void contratos.refetch();
        }}
      />
    );
  }
  const datosFacturas = facturas.data;
  const datosCredito = credito.data;
  const datosContratos = contratos.data;
  if (!datosFacturas || !datosCredito || !datosContratos) return <Cargando etiqueta="Cargando su resumen" />;

  const resumenes = resumirFacturas(datosFacturas.contenido);
  const vigentes = datosContratos.contenido.filter((c) => c.estado === 'vigente').length;
  const linea = datosCredito.linea_credito;
  const usoCredito = porcentaje(linea.usado, linea.limite);
  const hayMasFacturas = datosFacturas.total_elementos > datosFacturas.contenido.length;
  const hayMasContratos = datosContratos.total_elementos > datosContratos.contenido.length;

  return (
    <>
      <h1>Resumen</h1>
      <section aria-labelledby="titulo-saldos" className="rejilla">
        <h2 id="titulo-saldos" className="solo-lectores">
          Saldos pendientes
        </h2>
        {resumenes.length === 0 && (
          <article className="tarjeta tarjeta--ok">
            <p className="tarjeta__titulo">Saldo pendiente</p>
            <p className="tarjeta__valor">{hayMasFacturas ? 'Sin saldo en esta muestra' : 'Al dia'}</p>
            <p className="tarjeta__pie">
              {hayMasFacturas ? 'Podría haber facturas abiertas en otras páginas.' : 'No tiene facturas abiertas.'}
            </p>
          </article>
        )}
        {resumenes.map((r) => (
          <article key={r.moneda} className={`tarjeta ${r.facturasVencidas > 0 ? 'tarjeta--peligro' : ''}`}>
            <p className="tarjeta__titulo">Saldo pendiente ({r.moneda})</p>
            <p className="tarjeta__valor">{formatearDinero(r.saldoPendiente, r.moneda)}</p>
            <p className="tarjeta__pie">
              {r.facturasAbiertas} {r.facturasAbiertas === 1 ? 'factura abierta' : 'facturas abiertas'}
              {r.facturasVencidas > 0 && (
                <>
                  {' · '}
                  <strong>
                    {r.facturasVencidas} vencida{r.facturasVencidas === 1 ? '' : 's'} (
                    {formatearDinero(r.saldoVencido, r.moneda)})
                  </strong>
                </>
              )}
              {r.proximoVencimiento && (
                <>
                  <br />
                  Proximo vencimiento: {formatearFecha(r.proximoVencimiento)} (
                  {diasHasta(r.proximoVencimiento) === 0 ? 'hoy' : `en ${diasHasta(r.proximoVencimiento)} d`})
                </>
              )}
            </p>
          </article>
        ))}

        <article className="tarjeta">
          <p className="tarjeta__titulo">Credito disponible</p>
          <p className="tarjeta__valor">{formatearDinero(datosCredito.disponible, linea.moneda)}</p>
          <BarraUso porcentaje={usoCredito} etiqueta="Uso de la linea de credito" />
          <p className="tarjeta__pie">
            {usoCredito}% usado de {formatearDinero(linea.limite, linea.moneda)} ·{' '}
            <Link to="/credito">ver detalle</Link>
          </p>
        </article>

        <article className="tarjeta">
          <p className="tarjeta__titulo">Contratos vigentes</p>
          <p className="tarjeta__valor">{vigentes}</p>
          <p className="tarjeta__pie">
            <Link to="/contratos">ver contratos</Link>
          </p>
        </article>
      </section>
      {hayMasFacturas && (
        <p className="nota">
          El resumen considera únicamente las {datosFacturas.contenido.length} facturas de la primera página; los saldos y vencimientos podrían estar incompletos.{' '}
          <Link to="/facturas">Ver todas</Link>
        </p>
      )}
      {hayMasContratos && (
        <p className="nota">
          El conteo de contratos vigentes considera únicamente la primera página.{' '}
          <Link to="/contratos">Ver todos</Link>
        </p>
      )}
    </>
  );
}
