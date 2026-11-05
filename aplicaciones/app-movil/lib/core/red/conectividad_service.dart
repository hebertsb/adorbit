import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum EstadoConexion { enLinea, sinConexion }

/// Estado de red en vivo. La cola de sincronizacion lo usa para decidir si puede
/// reintentar (ver core/datos_locales/bandeja_salida_dao.dart).
final conectividadProvider = StreamProvider<EstadoConexion>((ref) {
  return Connectivity().onConnectivityChanged.map((resultados) {
    final sinRed = resultados.every((r) => r == ConnectivityResult.none);
    return sinRed ? EstadoConexion.sinConexion : EstadoConexion.enLinea;
  });
});
