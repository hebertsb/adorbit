import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../datos_locales/bandeja_salida_dao.dart';
import '../red/api_cliente.dart';
import 'preferencias_sync.dart';

/// Drena bandeja_salida_local contra el backend real de ms-creatividades. Hoy solo
/// conoce piezas subidas y validaciones de IA local, con el
/// mismo flujo de 3 pasos que usa SolicitarSubidaPieza.ts del lado del servidor:
/// 1) crear la Pieza (sin archivo), 2) pedir una URL firmada de Supabase Storage,
/// 3) subir los bytes reales directo a esa URL (nunca pasan por ms-creatividades).
/// Cada paso reenvia el mismo claveIdempotencia (con un sufijo por paso) en cada
/// intento, para que un reintento tras una falla a medio camino no duplique nada.
/// Los bytes de la foto viajan en base64 dentro de la propia fila de la bandeja (no
/// una ruta de archivo): funciona igual en movil, escritorio y web sin ramas por
/// plataforma, a costa de ~33% mas de espacio en SQLite -- aceptable para fotos.
class SincronizadorService {
  SincronizadorService({required String token})
    : _api = ApiCliente(token: token);

  final ApiCliente _api;
  final BandejaSalidaDao _dao = BandejaSalidaDao();

  /// Envia cada fila "pendiente" de la bandeja. Devuelve cuantas se sincronizaron.
  Future<int> drenarPendientes() async {
    final elementos = await _dao.listar();
    final pendientes = elementos.where((e) => e.estado == 'pendiente');

    var enviados = 0;
    for (final item in pendientes) {
      final id = item.id;
      if (id == null) continue;
      try {
        await _enviar(item);
        await _dao.marcarEstado(id, 'sincronizado');
        enviados++;
      } catch (e) {
        // ignore: avoid_print
        print('ao-sync-error [${item.claveIdempotencia}]: $e');
        await _dao.incrementarIntento(id);
      }
    }
    if (enviados > 0) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        clavePrefsUltimaSincronizacion,
        DateTime.now().toIso8601String(),
      );
    }
    return enviados;
  }

  Future<void> _enviar(ElementoBandeja item) async {
    final carga = jsonDecode(item.carga) as Map<String, dynamic>;

    if (item.tipo == 'validacion_local') {
      await _api.post(
        '/api/v1/piezas/${carga['piezaId']}/validaciones',
        idempotencyKey: item.claveIdempotencia,
        body: {
          'resultado': carga['resultado'],
          'origen': 'ia',
          'detalles': carga['detalles'],
        },
      );
      return;
    }

    if (item.tipo != 'pieza_subida') {
      throw UnsupportedError('Tipo de elemento de bandeja desconocido: ${item.tipo}');
    }

    final pieza = await _api.post(
      '/api/v1/briefs/${carga['briefId']}/piezas',
      idempotencyKey: '${item.claveIdempotencia}-crear',
      body: {'nombre': carga['nombre'], 'tipo': carga['tipo']},
    );
    final piezaId = pieza['id'] as String;

    final subida = await _api.post(
      '/api/v1/piezas/$piezaId/archivo',
      idempotencyKey: '${item.claveIdempotencia}-archivo',
      body: {
        'mime': carga['mime'],
        'tamano': carga['tamano'],
        if (carga['huellaImagen'] != null)
          'huella_imagen': carga['huellaImagen'],
      },
    );

    final bytes = base64Decode(carga['archivoBase64'] as String);
    await ApiCliente.subirArchivoFirmado(
      urlSubida: subida['urlSubida'] as String,
      bytes: bytes,
      mime: carga['mime'] as String,
    );
  }
}
