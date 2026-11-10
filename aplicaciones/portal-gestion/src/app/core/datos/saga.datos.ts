import { Injectable, inject } from '@angular/core';
import { EstadoSaga, PasoSaga, EstadoPasoSaga } from './saga.modelo';
import { AutenticacionService } from '../auth/autenticacion.service';
import { CampanasDatos } from './campanas.datos';

const ES_DEV_LOCAL = typeof window !== 'undefined' && window.location.port === '4200';
const URL_GATEWAY_SAGA = ES_DEV_LOCAL ? 'http://localhost:8000/api/v1/sagas' : '/api/v1/sagas';

@Injectable({ providedIn: 'root' })
export class SagaDatos {
  private readonly auth = inject(AutenticacionService);
  private readonly campanas = inject(CampanasDatos);

  async consultarSaga(idSaga: string): Promise<EstadoSaga> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = this.auth.token();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${URL_GATEWAY_SAGA}/${idSaga}`, { headers });
      if (res.ok) {
        const d = await res.json();
        return this.mapearRespuestaSaga(d);
      }
      throw new Error(`No se pudo consultar la SAGA (${res.status})`);
    } catch (error) {
      throw error instanceof Error ? error : new Error('No se pudo consultar la SAGA');
    }
  }

  private mapearRespuestaSaga(d: any): EstadoSaga {
    const estadoGeneral = d.estado as string;
    let resultado: 'en_progreso' | 'completada' | 'rechazada' = 'en_progreso';
    if (estadoGeneral === 'completada') resultado = 'completada';
    else if (estadoGeneral === 'rechazada' || estadoGeneral === 'compensada' || estadoGeneral === 'fallida') {
      resultado = 'rechazada';
    }

    const pasoActual = d.estado as string;
    const numeroPasoActual =
      typeof d.paso_actual === 'number' && d.paso_actual > 0
        ? d.paso_actual
        : this.ordenDePaso(pasoActual);

    const pasosDefinicion: { orden: number; servicio: string; titulo: string; pasoClave: string }[] = [
      { orden: 1, servicio: 'ms-campanas', titulo: 'Reservar presupuesto', pasoClave: 'reservando_presupuesto' },
      { orden: 2, servicio: 'ms-clientes-crm', titulo: 'Reservar crédito del cliente', pasoClave: 'reservando_credito' },
      { orden: 3, servicio: 'ms-creatividades', titulo: 'Bloquear piezas aprobadas', pasoClave: 'bloqueando_piezas' },
      { orden: 4, servicio: 'ms-facturacion', titulo: 'Emitir factura', pasoClave: 'facturando' },
      { orden: 5, servicio: 'ms-campanas', titulo: 'Activar campaña', pasoClave: 'completada' },
    ];

    const pasos: PasoSaga[] = pasosDefinicion.map((def) => {
      let estadoPaso: EstadoPasoSaga = 'pendiente';
      let detalle = '';

      if (resultado === 'completada') {
        estadoPaso = 'completado';
        detalle = 'Paso verificado y confirmado exitosamente.';
      } else if (resultado === 'rechazada') {
        if (def.orden === numeroPasoActual) {
          estadoPaso = 'fallido';
          detalle = d.motivo_fallo || 'Rechazo o fallo registrado en este paso.';
        } else if (def.orden < numeroPasoActual) {
          estadoPaso = 'compensado';
          detalle = 'Operación revertida por compensación SAGA.';
        } else {
          estadoPaso = 'omitido';
          detalle = 'Omitido tras la compensación de la transacción.';
        }
      } else {
        // En progreso
        if (def.orden === numeroPasoActual) {
          estadoPaso = 'en_curso';
          detalle = 'Ejecutando y esperando confirmación del participante…';
        } else if (def.orden < numeroPasoActual) {
          estadoPaso = 'completado';
          detalle = 'Confirmado exitosamente.';
        } else {
          estadoPaso = 'pendiente';
          detalle = 'En espera de los pasos precedentes.';
        }
      }

      return {
        orden: def.orden,
        servicio: def.servicio,
        titulo: def.titulo,
        detalle,
        estado: estadoPaso,
      };
    });

    const campanaReal = d.campana_id ? this.campanas.buscarPorId(d.campana_id) : undefined;
    return {
      idCampana: d.campana_id || campanaReal?.id || '',
      nombreCampana:
        campanaReal?.nombre ||
        (d.campana_id ? `Campaña ${d.campana_id.substring(0, 8)}` : 'Campaña Contratada'),
      cliente: campanaReal?.cliente || 'Cliente Anunciante',
      resultado,
      motivoRechazo: d.motivo_fallo,
      pasos,
    };
  }

  private ordenDePaso(paso: string): number {
    switch (paso) {
      case 'iniciada':
      case 'reservando_presupuesto':
        return 1;
      case 'reservando_credito':
        return 2;
      case 'bloqueando_piezas':
        return 3;
      case 'facturando':
        return 4;
      case 'completada':
        return 5;
      default:
        return 1;
    }
  }

  enProgreso(id?: string): EstadoSaga {
    return {
      idCampana: id || '2',
      nombreCampana: 'Campaña Institucional Créditos',
      cliente: 'Tienda Andina',
      resultado: 'en_progreso',
      pasos: [
        {
          orden: 1,
          servicio: 'ms-campanas',
          titulo: 'Reservar presupuesto',
          detalle: 'Bs 52.500,00 reservados exitosamente.',
          estado: 'completado',
        },
        {
          orden: 2,
          servicio: 'ms-clientes-crm',
          titulo: 'Reservar crédito del cliente',
          detalle: 'Crédito disponible verificado: Bs 180.000,00 de Bs 250.000,00.',
          estado: 'completado',
        },
        {
          orden: 3,
          servicio: 'ms-creatividades',
          titulo: 'Bloquear piezas aprobadas',
          detalle: 'Bloqueando piezas creativas aprobadas…',
          estado: 'en_curso',
        },
        {
          orden: 4,
          servicio: 'ms-facturacion',
          titulo: 'Emitir factura',
          detalle: 'En espera del bloqueo de piezas creativas.',
          estado: 'pendiente',
        },
        {
          orden: 5,
          servicio: 'ms-campanas',
          titulo: 'Activar campaña',
          detalle: 'Cambiará el estado de la campaña a Activa.',
          estado: 'pendiente',
        },
      ],
    };
  }

  conFallo(): EstadoSaga {
    return {
      idCampana: '2',
      nombreCampana: 'Campaña Institucional Créditos',
      cliente: 'Tienda Andina',
      resultado: 'rechazada',
      motivoRechazo: 'Línea de crédito insuficiente en ms-clientes-crm. Se ejecutaron las compensaciones requeridas.',
      pasos: [
        {
          orden: 1,
          servicio: 'ms-campanas',
          titulo: 'Reservar presupuesto',
          detalle: 'Compensado: Presupuesto liberado y devuelto al saldo de la cuenta.',
          estado: 'compensado',
        },
        {
          orden: 2,
          servicio: 'ms-clientes-crm',
          titulo: 'Reservar crédito del cliente',
          detalle: 'Fallo: Crédito disponible insuficiente para la cobertura del presupuesto.',
          estado: 'fallido',
        },
        {
          orden: 3,
          servicio: 'ms-creatividades',
          titulo: 'Bloquear piezas aprobadas',
          detalle: 'Omitido: La transacción fue abortada antes de alcanzar este paso.',
          estado: 'omitido',
        },
        {
          orden: 4,
          servicio: 'ms-facturacion',
          titulo: 'Emitir factura',
          detalle: 'Omitido: No se generó ningún comprobante ni factura contable.',
          estado: 'omitido',
        },
        {
          orden: 5,
          servicio: 'ms-campanas',
          titulo: 'Activar campaña',
          detalle: 'Omitido: La campaña no fue activada.',
          estado: 'omitido',
        },
      ],
    };
  }
}
