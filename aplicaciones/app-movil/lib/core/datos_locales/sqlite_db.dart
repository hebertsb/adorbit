import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';

/// Base SQLite local. Persiste bandeja_salida_local (outbox offline, ver
/// 01-arquitectura.md "Offline y conflictos") y cache_lectura (ultima respuesta buena
/// de cada GET, para que listas/detalle sigan mostrando algo sin red -- nunca para
/// escrituras, esas solo viven en la bandeja de salida).
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
      version: 2,
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
        await db.execute('''
          CREATE TABLE cache_lectura (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            guardado_en TEXT NOT NULL
          )
        ''');
      },
      onUpgrade: (db, versionAnterior, versionNueva) async {
        if (versionAnterior < 2) {
          await db.execute('''
            CREATE TABLE IF NOT EXISTS cache_lectura (
              clave TEXT PRIMARY KEY,
              valor TEXT NOT NULL,
              guardado_en TEXT NOT NULL
            )
          ''');
        }
      },
    );
    _db = db;
    return db;
  }
}
