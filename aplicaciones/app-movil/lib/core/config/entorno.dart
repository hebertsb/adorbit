import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

/// URLs base configurables por --dart-define (ver README "Correr contra el backend
/// real"), con defaults razonables para emulador Android/iOS, Chrome y escritorio.
///
/// El emulador de Android no ve "localhost" como el equipo anfitrion: 10.0.2.2 es el
/// alias que Android reserva para eso. Un dispositivo fisico necesita la IP LAN real
/// del equipo (pasarla con --dart-define=ADORBIT_CREATIVIDADES_BASE_URL=http://192.168.x.x:3000).
class Entorno {
  Entorno._();

  static String get baseUrlCreatividades => const String.fromEnvironment(
        'ADORBIT_CREATIVIDADES_BASE_URL',
        defaultValue: '',
      ).isNotEmpty
      ? const String.fromEnvironment('ADORBIT_CREATIVIDADES_BASE_URL')
      : 'http://$_hostLocal:8083';

  /// Simulador de Keycloak compartido de todo el proyecto
  /// (herramientas/keycloak-simulado.mjs, de Luis) mientras Roly no tenga el Keycloak
  /// real (plataforma/keycloak) corriendo. Ya usado por n8n, ms-ia, portal-cliente y
  /// panel-inteligencia -- ver "Probar local sin Keycloak" en el README.
  static String get baseUrlEmisorPrueba => const String.fromEnvironment(
        'ADORBIT_EMISOR_PRUEBA_BASE_URL',
        defaultValue: '',
      ).isNotEmpty
      ? const String.fromEnvironment('ADORBIT_EMISOR_PRUEBA_BASE_URL')
      : 'http://$_hostLocal:8180';

  static String get _hostLocal {
    if (kIsWeb) return 'localhost';
    if (defaultTargetPlatform == TargetPlatform.android) return '10.0.2.2';
    return 'localhost';
  }
}
