import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/entorno.dart';
import 'api_excepcion.dart';

/// Cliente HTTP delgado para ms-creatividades: agrega el token Bearer, serializa JSON
/// y traduce el cuerpo de error uniforme del backend ({codigo, mensaje, detalle}) a
/// ApiExcepcion. No es un paquete generico multi-servicio a proposito (D11 del
/// proyecto: sin librerias de runtime compartidas entre apps) -- si app-movil llega a
/// hablar con otro servicio, se crea su propio cliente delgado igual que este.
class ApiCliente {
  ApiCliente({required String token}) : _token = token;

  final String _token;
  static const _timeout = Duration(seconds: 20);

  Uri _uri(String path, [Map<String, String>? query]) => Uri.parse(
    '${Entorno.baseUrlCreatividades}$path',
  ).replace(queryParameters: query);

  Map<String, String> _encabezados({String? idempotencyKey}) => {
    'Authorization': 'Bearer $_token',
    'Content-Type': 'application/json',
    'Idempotency-Key': ?idempotencyKey,
  };

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
  }) async {
    final respuesta = await http
        .get(_uri(path, query), headers: _encabezados())
        .timeout(_timeout);
    return _decodificar(respuesta) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> post(
    String path, {
    required Map<String, dynamic> body,
    required String idempotencyKey,
  }) async {
    final respuesta = await http
        .post(
          _uri(path),
          headers: _encabezados(idempotencyKey: idempotencyKey),
          body: jsonEncode(body),
        )
        .timeout(_timeout);
    return _decodificar(respuesta) as Map<String, dynamic>;
  }

  dynamic _decodificar(http.Response respuesta) {
    final cuerpo = respuesta.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(respuesta.body);
    if (respuesta.statusCode >= 200 && respuesta.statusCode < 300)
      return cuerpo;

    final mapa = cuerpo is Map<String, dynamic> ? cuerpo : <String, dynamic>{};
    throw ApiExcepcion(
      status: respuesta.statusCode,
      codigo: mapa['codigo'] as String? ?? 'error_desconocido',
      mensaje:
          mapa['mensaje'] as String? ??
          'Error ${respuesta.statusCode} sin detalle',
      detalle: mapa['detalle'],
    );
  }

  /// Sube bytes directo a una URL firmada de Supabase Storage (nunca pasa por
  /// ms-creatividades, ver SolicitarSubidaPieza.ts). PUT con el mismo content-type
  /// declarado al pedir la URL -- contrato REST de Supabase Storage para subidas
  /// firmadas, no un endpoint propio de AdOrbit.
  static Future<void> subirArchivoFirmado({
    required String urlSubida,
    required List<int> bytes,
    required String mime,
  }) async {
    final respuesta = await http.put(
      Uri.parse(urlSubida),
      headers: {'Content-Type': mime},
      body: bytes,
    );
    if (respuesta.statusCode < 200 || respuesta.statusCode >= 300) {
      throw ApiExcepcion(
        status: respuesta.statusCode,
        codigo: 'subida_archivo_fallo',
        mensaje:
            'Supabase Storage respondio ${respuesta.statusCode} al subir el archivo',
      );
    }
  }
}
