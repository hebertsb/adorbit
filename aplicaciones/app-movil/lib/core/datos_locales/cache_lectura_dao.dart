import 'package:sqflite/sqflite.dart';

import 'sqlite_db.dart';

/// Ultima respuesta buena de un GET, por clave (ej. "briefs", `brief:<id>`). Solo
/// lectura de respaldo offline -- nunca la fuente de verdad, siempre se intenta la red
/// primero (ver BriefsRepo).
class CacheLecturaDao {
  Future<void> guardar(String clave, String valorJson) async {
    final db = await SqliteDb.instancia.abrir();
    await db.insert(
      'cache_lectura',
      {'clave': clave, 'valor': valorJson, 'guardado_en': DateTime.now().toIso8601String()},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> leer(String clave) async {
    final db = await SqliteDb.instancia.abrir();
    final filas = await db.query('cache_lectura', where: 'clave = ?', whereArgs: [clave], limit: 1);
    if (filas.isEmpty) return null;
    return filas.first['valor'] as String;
  }
}
