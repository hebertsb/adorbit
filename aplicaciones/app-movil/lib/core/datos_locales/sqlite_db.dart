import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';

/// Base SQLite local. Hoy solo persiste bandeja_salida_local (ver 01-arquitectura.md
/// "Offline y conflictos"): cada escritura offline queda aqui hasta poder reenviarse
/// con el mismo Idempotency-Key.
class SqliteDb {
  SqliteDb._();

  static final SqliteDb instancia = SqliteDb._();

  Database? _db;

  Future<Database> abrir() async {
    final abierta = _db;
    if (abierta != null) return abierta;

    if (kIsWeb) {
      databaseFactory = databaseFactoryFfiWeb;
    }

    final db = await openDatabase(
      'adorbit_local.db',
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE bandeja_salida_local (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clave_idempotencia TEXT NOT NULL UNIQUE,
            tipo TEXT NOT NULL,
            carga TEXT NOT NULL,
            estado TEXT NOT NULL,
            intentos INTEGER NOT NULL DEFAULT 0,
            creado_en TEXT NOT NULL
          )
        ''');
      },
    );
    _db = db;
    return db;
  }
}
