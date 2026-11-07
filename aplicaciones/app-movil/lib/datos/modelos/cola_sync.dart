import '../../core/i18n/idioma_controller.dart';

enum EstadoSincronizacion {
  sincronizado,
  enviando,
  conflicto,
  error,
  pendiente,
}

extension EstadoSincronizacionX on EstadoSincronizacion {
  String etiqueta(Idioma idioma) => idioma == Idioma.en
      ? switch (this) {
          EstadoSincronizacion.sincronizado => 'Synced',
          EstadoSincronizacion.enviando => 'Sending',
          EstadoSincronizacion.conflicto => 'Conflict detected',
          EstadoSincronizacion.error => 'Failed attempts',
          EstadoSincronizacion.pendiente => 'Pending',
        }
      : switch (this) {
          EstadoSincronizacion.sincronizado => 'Sincronizado',
          EstadoSincronizacion.enviando => 'Enviando',
          EstadoSincronizacion.conflicto => 'Conflicto detectado',
          EstadoSincronizacion.error => 'Intentos fallidos',
          EstadoSincronizacion.pendiente => 'Pendiente',
        };
}

class ElementoColaSync {
  const ElementoColaSync({
    required this.titulo,
    required this.subtitulo,
    required this.estado,
    this.progreso,
    this.detalle,
    this.intentos,
  });

  final String titulo;
  final String subtitulo;
  final EstadoSincronizacion estado;

  /// 0..1, solo para estado == enviando.
  final double? progreso;
  final String? detalle;
  final int? intentos;
}
