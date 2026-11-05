enum EstadoBrief { activo, enRevision, completado }

extension EstadoBriefX on EstadoBrief {
  String get etiqueta => switch (this) {
        EstadoBrief.activo => 'Activo',
        EstadoBrief.enRevision => 'En revisión',
        EstadoBrief.completado => 'Completado',
      };
}

class Brief {
  const Brief({
    required this.id,
    required this.cliente,
    required this.campana,
    required this.estado,
    required this.subEstado,
    required this.piezas,
  });

  final String id;
  final String cliente;
  final String campana;
  final EstadoBrief estado;
  final String subEstado;
  final List<Pieza> piezas;

  int get totalPiezas => piezas.length;
  int get piezasAprobadas => piezas.where((p) => p.estado == EstadoPieza.aprobada).length;
}

enum EstadoPieza { aprobada, pendiente, bloqueada, rechazada }

extension EstadoPiezaX on EstadoPieza {
  String get etiqueta => switch (this) {
        EstadoPieza.aprobada => 'Aprobada',
        EstadoPieza.pendiente => 'Pendiente',
        EstadoPieza.bloqueada => 'Bloqueada',
        EstadoPieza.rechazada => 'Rechazada',
      };
}

class Pieza {
  const Pieza({
    required this.id,
    required this.titulo,
    required this.formato,
    required this.estado,
    required this.confianza,
    this.observacion,
    this.notaBloqueo,
  });

  final String id;
  final String titulo;
  final String formato;
  final EstadoPieza estado;

  /// Fraccion 0..1 — igual que vision_resultados.confianza en el contrato real de ms-ia.
  final double confianza;
  final String? observacion;
  final String? notaBloqueo;

  int get confianzaPorcentaje => (confianza * 100).round();
}
