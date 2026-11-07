import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../../core/config/entorno.dart';
import '../../core/red/api_excepcion.dart';
import '../modelos/vision_resultado.dart';

/// Cliente delgado propio para ms-ia (D11 del proyecto: sin librerias de runtime
/// compartidas entre servicios -- ver comentario en core/red/api_cliente.dart, que es
/// el equivalente para ms-creatividades). Solo conoce POST /api/v1/vision/analizar,
/// multipart real (no JSON) porque el endpoint recibe el archivo como UploadFile.
class VisionRepo {
  VisionRepo({required String token}) : _token = token;

  final String _token;
  static const _timeout = Duration(seconds: 30);

  Future<VisionResultado> analizar({
    required String piezaId,
    required List<int> bytes,
    String? campanaId,
    String origen = 'movil_local',
  }) async {
    final uri = Uri.parse('${Entorno.baseUrlIa}/api/v1/vision/analizar');
    final solicitud = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $_token'
      ..fields['pieza_id'] = piezaId
      ..fields['origen'] = origen
      ..files.add(
        http.MultipartFile.fromBytes(
          'archivo',
          bytes,
          filename: 'auditoria.jpg',
          contentType: MediaType('image', 'jpeg'),
        ),
      );
    if (campanaId != null) solicitud.fields['campana_id'] = campanaId;

    final respuestaFlujo = await solicitud.send().timeout(_timeout);
    final respuesta = await http.Response.fromStream(respuestaFlujo);

    final cuerpo = respuesta.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(respuesta.body) as Map<String, dynamic>;

    if (respuesta.statusCode < 200 || respuesta.statusCode >= 300) {
      throw ApiExcepcion(
        status: respuesta.statusCode,
        codigo: cuerpo['codigo'] as String? ?? 'error_desconocido',
        mensaje:
            cuerpo['mensaje'] as String? ??
            'ms-ia respondio ${respuesta.statusCode} sin detalle',
        detalle: cuerpo['detalle'],
      );
    }
    return VisionResultado.desdeJson(cuerpo);
  }
}
