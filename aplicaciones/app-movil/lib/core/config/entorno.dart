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
      : 'http://$_hostLocal:3000';

  /// Emisor de JWT de prueba (servicios/ms-ia/herramientas/emisor_jwt_prueba.py),
  /// reusado aqui tal cual mientras Roly no tenga Keycloak real corriendo — ver su
  /// docstring: "emisor JWKS GENERICO para todo el proyecto".
  static String get baseUrlEmisorPrueba => const String.fromEnvironment(
        'ADORBIT_EMISOR_PRUEBA_BASE_URL',
        defaultValue: '',
      ).isNotEmpty
      ? const String.fromEnvironment('ADORBIT_EMISOR_PRUEBA_BASE_URL')
      : 'http://$_hostLocal:8099';

  static String get _hostLocal {
    if (kIsWeb) return 'localhost';
    if (defaultTargetPlatform == TargetPlatform.android) return '10.0.2.2';
    return 'localhost';
  }
}
