enum EstadoFisicoValla { bueno, deterioro, danado }

extension EstadoFisicoVallaX on EstadoFisicoValla {
  String get etiqueta => switch (this) {
        EstadoFisicoValla.bueno => 'Bueno',
        EstadoFisicoValla.deterioro => 'Deterioro',
        EstadoFisicoValla.danado => 'Dañado',
      };

  String get detalle => switch (this) {
        EstadoFisicoValla.bueno => 'Activo',
        EstadoFisicoValla.deterioro => 'Desgaste',
        EstadoFisicoValla.danado => 'Crítico',
      };
}

class ActivoOoh {
  const ActivoOoh({
    required this.codigo,
    required this.cliente,
    required this.campana,
    required this.descripcion,
    required this.direccion,
    required this.precisionGps,
    required this.coincidenciaVisual,
    required this.historial,
  });

  final String codigo;
  final String cliente;
  final String campana;
  final String descripcion;
  final String direccion;
  final String precisionGps;
  final double coincidenciaVisual;
  final List<RegistroAuditoria> historial;
}

class RegistroAuditoria {
  const RegistroAuditoria({
    required this.resumen,
    required this.estado,
    required this.fecha,
    required this.auditor,
    this.nota,
  });

  final String resumen;
  final EstadoFisicoValla estado;
  final String fecha;
  final String auditor;
  final String? nota;
}
