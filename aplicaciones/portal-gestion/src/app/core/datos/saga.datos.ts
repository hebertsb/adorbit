import { Injectable } from '@angular/core';
import { EstadoSaga } from './saga.modelo';

// TODO Roly: reemplazar por GET /api/v1/sagas/{id} (polling) o la suscripción GraphQL real.
@Injectable({ providedIn: 'root' })
export class SagaDatos {
  enProgreso(): EstadoSaga {
    return {
      idCampana: '2',
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
      motivoRechazo: 'Crédito insuficiente para reservar el monto solicitado.',
      pasos: [
        {
          orden: 1,
          servicio: 'ms-campanas',
          titulo: 'Reservar presupuesto',
          detalle: 'Reserva compensada: Bs 52.500,00 liberados y devueltos.',
          estado: 'compensado',
        },
        {
          orden: 2,
          servicio: 'ms-clientes-crm',
          titulo: 'Reservar crédito del cliente',
          detalle: 'Crédito insuficiente — monto requerido Bs 52.500,00, disponible Bs 12.400,00.',
          estado: 'fallido',
        },
        {
          orden: 3,
          servicio: 'ms-creatividades',
          titulo: 'Bloquear piezas aprobadas',
          detalle: 'Paso omitido por fallo previo. Las piezas permanecen desbloqueadas.',
          estado: 'omitido',
        },
        {
          orden: 4,
          servicio: 'ms-facturacion',
          titulo: 'Emitir factura',
          detalle: 'Paso omitido por fallo previo. No se generó factura.',
          estado: 'omitido',
        },
        {
          orden: 5,
          servicio: 'ms-campanas',
          titulo: 'Activar campaña',
          detalle: 'Campaña no activada. Estado final: Rechazada.',
          estado: 'fallido',
        },
      ],
    };
  }
}
