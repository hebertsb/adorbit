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

/// Usado por "Solo sincronizar con Wi-Fi" (ver cola_sincronizacion_pagina.dart) para
/// distinguir Wi-Fi de datos moviles -- EstadoConexion de arriba no hace esa distincion.
Future<bool> hayConexionWifi() async {
  final resultados = await Connectivity().checkConnectivity();
  return resultados.contains(ConnectivityResult.wifi);
}
