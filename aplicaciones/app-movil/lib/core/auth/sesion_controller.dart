import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/entorno.dart';
import '../red/api_excepcion.dart';

/// Publicas (no privadas de este archivo) porque sincronizacion_background.dart
/// tambien las lee -- el callback de workmanager corre en un isolate aparte que no
/// comparte el ProviderContainer de Riverpod, asi que no puede leer sesionControllerProvider.
const clavePrefsToken = 'adorbit_token_acceso';
const clavePrefsRol = 'adorbit_token_rol';

/// Sesion del usuario actual. Mientras Roly no tenga el Keycloak real
/// (plataforma/keycloak) corriendo, el unico camino para conseguir un token es el
/// simulador compartido de todo el proyecto (herramientas/keycloak-simulado.mjs, de
/// Luis -- ya usado por n8n, ms-ia, portal-cliente y panel-inteligencia) -- NO es un
/// bypass: ms-creatividades verifica ese token con el mismo codigo real
/// (jose/jwtVerify contra un JWKS), solo que el JWKS es de juguete.
/// TODO Hebert: reemplazar iniciarSesionDev por flutter_appauth contra el realm real en
/// cuanto Keycloak este arriba (ver login_pagina.dart).
final sesionControllerProvider =
    NotifierProvider<SesionController, SesionEstado>(SesionController.new);

class SesionEstado {
  const SesionEstado({this.token, this.rol});

  final String? token;
  final String? rol;

  bool get autenticado => token != null;

  /// Claims reales del JWT (payload, sin verificar firma -- solo para mostrar en la UI;
  /// ms-creatividades es quien valida la firma de verdad). Ver keycloak-simulado.mjs:
  /// el atajo /emitir solo pone sub + realm_access.roles, no name/email.
  Map<String, dynamic>? get claims {
    final t = token;
    if (t == null) return null;
    final partes = t.split('.');
    if (partes.length != 3) return null;
    try {
      var payload = partes[1].replaceAll('-', '+').replaceAll('_', '/');
      payload = payload.padRight((payload.length + 3) ~/ 4 * 4, '=');
      return jsonDecode(utf8.decode(base64.decode(payload)))
          as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// "usuario-simulado" tal como lo emite el simulador de Keycloak -- ver claims.
  String? get sub => claims?['sub'] as String?;
}

class SesionController extends Notifier<SesionEstado> {
  @override
  SesionEstado build() => const SesionEstado();

  /// Carga un token guardado de una sesion anterior (si lo hay) al arrancar la app.
  Future<void> restaurar() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(clavePrefsToken);
    final rol = prefs.getString(clavePrefsRol);
    if (token != null) state = SesionEstado(token: token, rol: rol);
  }

  Future<void> iniciarSesionDev({String rol = 'creativo'}) async {
    // keycloak-simulado.mjs ya trae ms-creatividades en sus audiencias por defecto
    // (ver AUDIENCIAS en el script), asi que el atajo /emitir no necesita parametro aud.
    final uri = Uri.parse(
      '${Entorno.baseUrlEmisorPrueba}/emitir',
    ).replace(queryParameters: {'roles': rol});

    http.Response respuesta;
    try {
      respuesta = await http.get(uri).timeout(const Duration(seconds: 6));
    } catch (error) {
      throw ApiExcepcion(
        status: 0,
        codigo: 'emisor_prueba_no_disponible',
        mensaje:
            'No se pudo contactar el simulador de Keycloak en ${Entorno.baseUrlEmisorPrueba}. '
            '¿Esta corriendo "node herramientas/keycloak-simulado.mjs" desde la raíz del repo?',
      );
    }

    if (respuesta.statusCode != 200) {
      throw ApiExcepcion(
        status: respuesta.statusCode,
        codigo: 'emisor_prueba_error',
        mensaje: 'El emisor de prueba respondio ${respuesta.statusCode}',
      );
    }

    final cuerpo = jsonDecode(respuesta.body) as Map<String, dynamic>;
    final token = cuerpo['access_token'] as String;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(clavePrefsToken, token);
    await prefs.setString(clavePrefsRol, rol);

    state = SesionEstado(token: token, rol: rol);
  }

  Future<void> cerrarSesion() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(clavePrefsToken);
    await prefs.remove(clavePrefsRol);
    state = const SesionEstado();
  }
}
