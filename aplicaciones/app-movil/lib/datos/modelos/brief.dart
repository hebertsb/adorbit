/// Forma real de contratos/openapi/ms-creatividades.yaml (componente Brief) --
/// src/domain/brief.ts es la fuente de verdad del backend, estos son sus mismos campos.
enum EstadoBrief { recibido, enCreacion, enRevision, aprobado, rechazado }

extension EstadoBriefX on EstadoBrief {
  String get etiqueta => switch (this) {
        EstadoBrief.recibido => 'Recibido',
        EstadoBrief.enCreacion => 'En creación',
        EstadoBrief.enRevision => 'En revisión',
        EstadoBrief.aprobado => 'Aprobado',
        EstadoBrief.rechazado => 'Rechazado',
      };

  static EstadoBrief desdeTexto(String valor) => switch (valor) {
        'recibido' => EstadoBrief.recibido,
        'en_creacion' => EstadoBrief.enCreacion,
        'en_revision' => EstadoBrief.enRevision,
        'aprobado' => EstadoBrief.aprobado,
        'rechazado' => EstadoBrief.rechazado,
        _ => EstadoBrief.recibido,
      };
}

class Brief {
  const Brief({
    required this.id,
    required this.campanaId,
    this.clienteId,
    required this.titulo,
    this.descripcion,
    required this.estado,
    required this.version,
    this.creadoEn,
    this.actualizadoEn,
  });

  final String id;
  final String campanaId;
  final String? clienteId;
  final String titulo;
  final String? descripcion;
  final EstadoBrief estado;
  final int version;
  final DateTime? creadoEn;
  final DateTime? actualizadoEn;

  factory Brief.desdeJson(Map<String, dynamic> j) => Brief(
        id: j['id'] as String,
        campanaId: j['campanaId'] as String,
        clienteId: j['clienteId'] as String?,
        titulo: j['titulo'] as String,
        descripcion: j['descripcion'] as String?,
        estado: EstadoBriefX.desdeTexto(j['estado'] as String),
        version: j['version'] as int? ?? 1,
        creadoEn: j['creadoEn'] != null ? DateTime.tryParse(j['creadoEn'] as String) : null,
        actualizadoEn: j['actualizadoEn'] != null ? DateTime.tryParse(j['actualizadoEn'] as String) : null,
      );

  Map<String, dynamic> aJson() => {
        'id': id,
        'campanaId': campanaId,
        'clienteId': clienteId,
        'titulo': titulo,
        'descripcion': descripcion,
        'estado': switch (estado) {
          EstadoBrief.recibido => 'recibido',
          EstadoBrief.enCreacion => 'en_creacion',
          EstadoBrief.enRevision => 'en_revision',
          EstadoBrief.aprobado => 'aprobado',
          EstadoBrief.rechazado => 'rechazado',
        },
        'version': version,
        'creadoEn': creadoEn?.toIso8601String(),
        'actualizadoEn': actualizadoEn?.toIso8601String(),
      };
}

enum EstadoPieza { enRevision, aprobada, bloqueadaSaga, rechazada }

extension EstadoPiezaX on EstadoPieza {
  String get etiqueta => switch (this) {
        EstadoPieza.enRevision => 'Pendiente',
        EstadoPieza.aprobada => 'Aprobada',
        EstadoPieza.bloqueadaSaga => 'Bloqueada',
        EstadoPieza.rechazada => 'Rechazada',
      };

  static EstadoPieza desdeTexto(String valor) => switch (valor) {
        'en_revision' => EstadoPieza.enRevision,
        'aprobada' => EstadoPieza.aprobada,
        'bloqueada_saga' => EstadoPieza.bloqueadaSaga,
        'rechazada' => EstadoPieza.rechazada,
        _ => EstadoPieza.enRevision,
      };
}

enum TipoPieza { imagen, video, copy, audio }

extension TipoPiezaX on TipoPieza {
  String get valorApi => switch (this) {
        TipoPieza.imagen => 'imagen',
        TipoPieza.video => 'video',
        TipoPieza.copy => 'copy',
        TipoPieza.audio => 'audio',
      };

  static TipoPieza desdeTexto(String valor) => switch (valor) {
        'imagen' => TipoPieza.imagen,
        'video' => TipoPieza.video,
        'copy' => TipoPieza.copy,
        'audio' => TipoPieza.audio,
        _ => TipoPieza.imagen,
      };
}

class ArchivoPieza {
  const ArchivoPieza({required this.ruta, required this.mime, required this.tamano});

  final String ruta;
  final String mime;
  final num tamano;

  factory ArchivoPieza.desdeJson(Map<String, dynamic> j) =>
      ArchivoPieza(ruta: j['ruta'] as String, mime: j['mime'] as String, tamano: j['tamano'] as num);

  /// "JPG · 1080×1920" no viene del backend (solo guarda ruta/mime/tamano, nunca
  /// dimensiones) -- se muestra el mime en mayusculas y el peso, que si es real.
  String get resumen {
    final ext = mime.split('/').last.toUpperCase();
    final kb = tamano / 1024;
    return kb >= 1024 ? '$ext · ${(kb / 1024).toStringAsFixed(1)} MB' : '$ext · ${kb.toStringAsFixed(0)} KB';
  }
}

class Pieza {
  const Pieza({
    required this.id,
    required this.briefId,
    required this.campanaId,
    required this.nombre,
    required this.tipo,
    required this.versionNumero,
    this.archivo,
    required this.estado,
    required this.version,
    this.creadoEn,
    // La confianza de vision (vision_resultados.confianza en ms-ia) es de la tarea 6,
    // todavia no existe un endpoint que la exponga -- queda nula hasta entonces, nunca
    // inventada en el cliente.
    this.confianza,
  });

  final String id;
  final String briefId;
  final String campanaId;
  final String nombre;
  final TipoPieza tipo;
  final int versionNumero;
  final ArchivoPieza? archivo;
  final EstadoPieza estado;
  final int version;
  final DateTime? creadoEn;
  final double? confianza;

  factory Pieza.desdeJson(Map<String, dynamic> j) => Pieza(
        id: j['id'] as String,
        briefId: j['briefId'] as String,
        campanaId: j['campanaId'] as String,
        nombre: j['nombre'] as String,
        tipo: TipoPiezaX.desdeTexto(j['tipo'] as String),
        versionNumero: j['versionNumero'] as int? ?? 1,
        archivo: j['archivo'] != null ? ArchivoPieza.desdeJson(j['archivo'] as Map<String, dynamic>) : null,
        estado: EstadoPiezaX.desdeTexto(j['estado'] as String),
        version: j['version'] as int? ?? 1,
        creadoEn: j['creadoEn'] != null ? DateTime.tryParse(j['creadoEn'] as String) : null,
      );
}
