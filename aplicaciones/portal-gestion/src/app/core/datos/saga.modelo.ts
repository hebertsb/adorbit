export type EstadoPasoSaga = 'completado' | 'en_curso' | 'pendiente' | 'fallido' | 'compensado' | 'omitido';

export interface PasoSaga {
  orden: number;
  servicio: string;
  titulo: string;
  detalle: string;
  estado: EstadoPasoSaga;
}

export interface EstadoSaga {
  idCampana: string;
  nombreCampana: string;
  cliente: string;
  pasos: PasoSaga[];
  resultado: 'en_progreso' | 'completada' | 'rechazada';
  motivoRechazo?: string;
}
