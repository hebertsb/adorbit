import '../datos_locales/bandeja_salida_dao.dart';

/// Intenta drenar la bandeja de salida local contra el backend real.
///
/// TODO Hebert: reemplazar _enviar por el POST/PUT real contra ms-creatividades,
/// reenviando el mismo claveIdempotencia en el header Idempotency-Key en cada
/// intento (ver documentacion/03-contratos.md "Sincronizacion movil"). Hoy solo
/// simula una llamada exitosa para que el pipeline de cola/reintentos sea real
/// de punta a punta mientras no hay endpoint que llamar.
class SincronizadorService {
  final BandejaSalidaDao _dao = BandejaSalidaDao();

  /// Envia cada fila "pendiente" de la bandeja. Devuelve cuantas se sincronizaron.
  Future<int> drenarPendientes() async {
    final elementos = await _dao.listar();
    final pendientes = elementos.where((e) => e.estado == 'pendiente');

    var enviados = 0;
    for (final item in pendientes) {
      final ok = await _enviar(item);
      final id = item.id;
      if (id == null) continue;
      if (ok) {
        await _dao.marcarEstado(id, 'sincronizado');
        enviados++;
      } else {
        await _dao.incrementarIntento(id);
      }
    }
    return enviados;
  }

  Future<bool> _enviar(ElementoBandeja item) async {
    await Future.delayed(const Duration(milliseconds: 400));
    return true;
  }
}
