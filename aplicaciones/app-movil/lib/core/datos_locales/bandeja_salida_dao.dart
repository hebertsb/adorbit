import 'sqlite_db.dart';

/// Una fila de la bandeja de salida local (outbox del cliente movil).
class ElementoBandeja {
  const ElementoBandeja({
    this.id,
    required this.claveIdempotencia,
    required this.tipo,
    required this.carga,
    required this.estado,
    required this.intentos,
    required this.creadoEn,
  });

  final int? id;
  final String claveIdempotencia;
  final String tipo;
  final String carga;
  final String estado;
  final int intentos;
  final DateTime creadoEn;

  Map<String, Object?> aFila() => {
    'clave_idempotencia': claveIdempotencia,
    'tipo': tipo,
    'carga': carga,
    'estado': estado,
    'intentos': intentos,
    'creado_en': creadoEn.toIso8601String(),
  };

  static ElementoBandeja desdeFila(Map<String, Object?> fila) =>
      ElementoBandeja(
        id: fila['id'] as int?,
        claveIdempotencia: fila['clave_idempotencia'] as String,
        tipo: fila['tipo'] as String,
        carga: fila['carga'] as String,
        estado: fila['estado'] as String,
        intentos: fila['intentos'] as int,
        creadoEn: DateTime.parse(fila['creado_en'] as String),
      );
}

/// Acceso a bandeja_salida_local. La cola de sincronizacion real (TODO Hebert: workmanager)
/// reenviaria cada fila "pendiente" al mismo endpoint REST con su clave_idempotencia.
class BandejaSalidaDao {
  Future<void> encolar(ElementoBandeja item) async {
    final db = await SqliteDb.instancia.abrir();
    await db.insert('bandeja_salida_local', item.aFila());
  }

  Future<List<ElementoBandeja>> listar() async {
    final db = await SqliteDb.instancia.abrir();
    final filas = await db.query(
      'bandeja_salida_local',
      orderBy: 'creado_en DESC',
    );
    return filas.map(ElementoBandeja.desdeFila).toList();
  }

  Future<void> marcarEstado(int id, String estado) async {
    final db = await SqliteDb.instancia.abrir();
    await db.update(
      'bandeja_salida_local',
      {'estado': estado},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> incrementarIntento(int id) async {
    final db = await SqliteDb.instancia.abrir();
    await db.rawUpdate(
      'UPDATE bandeja_salida_local SET intentos = intentos + 1 WHERE id = ?',
      [id],
    );
  }
}
