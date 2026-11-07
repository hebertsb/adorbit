import 'dart:convert';

import 'package:uuid/uuid.dart';

import '../../core/datos_locales/cache_lectura_dao.dart';
import '../../core/red/api_cliente.dart';
import '../modelos/brief.dart';

/// GET /api/v1/briefs (+ /briefs/{id}, /briefs/{id}/piezas) contra ms-creatividades real.
/// Cache-aside simple: intenta la red primero; si falla (sin cobertura, backend caido),
/// devuelve la ultima respuesta buena guardada en SQLite en vez de tumbar la pantalla
/// (mismo espiritu offline-first que la bandeja de salida, aplicado a lecturas).
class BriefsRepo {
  BriefsRepo({required String token}) : _api = ApiCliente(token: token);

  final ApiCliente _api;
  final _cache = CacheLecturaDao();

  Future<List<Brief>> listar() async {
    const clave = 'briefs';
    try {
      final respuesta = await _api.get(
        '/api/v1/briefs',
        query: const {'size': '50'},
      );
      final items = (respuesta['items'] as List).cast<Map<String, dynamic>>();
      await _cache.guardar(clave, jsonEncode(items));
      return items.map(Brief.desdeJson).toList();
    } catch (_) {
      final guardado = await _cache.leer(clave);
      if (guardado == null) rethrow;
      final items = (jsonDecode(guardado) as List).cast<Map<String, dynamic>>();
      return items.map(Brief.desdeJson).toList();
    }
  }

  Future<Brief> obtener(String id) async {
    final clave = 'brief:$id';
    try {
      final respuesta = await _api.get('/api/v1/briefs/$id');
      await _cache.guardar(clave, jsonEncode(respuesta));
      return Brief.desdeJson(respuesta);
    } catch (_) {
      final guardado = await _cache.leer(clave);
      if (guardado == null) rethrow;
      return Brief.desdeJson(jsonDecode(guardado) as Map<String, dynamic>);
    }
  }

  Future<List<Pieza>> listarPiezas(String briefId) async {
    final clave = 'piezas:$briefId';
    try {
      final respuesta = await _api.get('/api/v1/briefs/$briefId/piezas');
      final items = (respuesta['items'] as List).cast<Map<String, dynamic>>();
      await _cache.guardar(clave, jsonEncode(items));
      return items.map(Pieza.desdeJson).toList();
    } catch (_) {
      final guardado = await _cache.leer(clave);
      if (guardado == null) rethrow;
      final items = (jsonDecode(guardado) as List).cast<Map<String, dynamic>>();
      return items.map(Pieza.desdeJson).toList();
    }
  }

  Future<Brief> crear({
    required String campanaId,
    required String titulo,
    String? descripcion,
  }) async {
    final respuesta = await _api.post(
      '/api/v1/briefs',
      idempotencyKey: const Uuid().v4(),
      body: {
        'campana_id': campanaId,
        'titulo': titulo,
        if (descripcion != null && descripcion.isNotEmpty)
          'descripcion': descripcion,
      },
    );
    return Brief.desdeJson(respuesta);
  }

  Future<Pieza> aprobar(String piezaId, {required bool aprobar}) async {
    final respuesta = await _api.post(
      '/api/v1/piezas/$piezaId/aprobar',
      idempotencyKey: const Uuid().v4(),
      body: {'decision': aprobar ? 'aprobar' : 'rechazar'},
    );
    return Pieza.desdeJson(respuesta);
  }
}
