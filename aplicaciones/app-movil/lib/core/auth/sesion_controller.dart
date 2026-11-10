import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/entorno.dart';
import '../red/api_excepcion.dart';

const clavePrefsToken = 'adorbit_token_acceso';
const clavePrefsRol = 'adorbit_token_rol';
const clavePrefsRefreshToken = 'adorbit_refresh_token';
const clavePrefsIdToken = 'adorbit_id_token';
const clavePrefsExpiracion = 'adorbit_token_expiracion';

final sesionControllerProvider =
    NotifierProvider<SesionController, SesionEstado>(SesionController.new);

class SesionEstado {
  const SesionEstado({
    this.token,
    this.rol,
    this.refreshToken,
    this.idToken,
    this.expiraEn,
  });

  final String? token;
  final String? rol;
  final String? refreshToken;
  final String? idToken;
  final DateTime? expiraEn;

  bool get autenticado => token != null && (expiraEn == null || expiraEn!.isAfter(DateTime.now()));

  Map<String, dynamic>? get claims => _decodificarJwt(token);
  String? get sub => claims?['sub'] as String?;
}

class SesionController extends Notifier<SesionEstado> {
  static const FlutterAppAuth _appAuth = FlutterAppAuth();

  @override
  SesionEstado build() => const SesionEstado();

  Future<void> restaurar() async {
    final prefs = await SharedPreferences.getInstance();
    final expiraTexto = prefs.getString(clavePrefsExpiracion);
    state = SesionEstado(
      token: prefs.getString(clavePrefsToken),
      rol: prefs.getString(clavePrefsRol),
      refreshToken: prefs.getString(clavePrefsRefreshToken),
      idToken: prefs.getString(clavePrefsIdToken),
      expiraEn: expiraTexto == null ? null : DateTime.tryParse(expiraTexto),
    );
    if (state.token == null) return;
    final debeRenovar = state.expiraEn != null &&
        state.expiraEn!.isBefore(DateTime.now().add(const Duration(minutes: 1)));
    if (debeRenovar && state.refreshToken != null && !kIsWeb) {
      try {
        await renovar();
      } catch (_) {
        await _limpiarLocal();
      }
    } else if (debeRenovar) {
      await _limpiarLocal();
    }
  }

  /// Inicia Authorization Code + PKCE en el navegador seguro del sistema.
  Future<void> iniciarSesion() async {
    if (kIsWeb) {
      throw ApiExcepcion(
        status: 0,
        codigo: 'oidc_nativo_no_disponible_web',
        mensaje: 'Use el portal PWA para iniciar sesión desde un navegador.',
      );
    }
    try {
      final respuesta = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          Entorno.clienteOidc,
          Entorno.redireccionOidc,
          issuer: Entorno.emisorOidc,
          scopes: const ['openid'],
          allowInsecureConnections: Entorno.permitirHttpOidc,
        ),
      );
      await _guardarRespuesta(
        accessToken: respuesta.accessToken,
        refreshToken: respuesta.refreshToken,
        idToken: respuesta.idToken,
        accessTokenExpirationDateTime: respuesta.accessTokenExpirationDateTime,
      );
    } on FlutterAppAuthUserCancelledException {
      throw ApiExcepcion(status: 0, codigo: 'inicio_cancelado', mensaje: 'Inicio de sesión cancelado.');
    } on FlutterAppAuthPlatformException catch (error) {
      throw ApiExcepcion(
        status: 0,
        codigo: error.code,
        mensaje: error.message ?? 'No se pudo completar el inicio de sesión OIDC.',
      );
    }
  }

  Future<void> renovar() async {
    final refreshToken = state.refreshToken;
    if (refreshToken == null) throw StateError('No existe refresh token.');
    final respuesta = await _appAuth.token(
      TokenRequest(
        Entorno.clienteOidc,
        Entorno.redireccionOidc,
        issuer: Entorno.emisorOidc,
        refreshToken: refreshToken,
        scopes: const ['openid'],
        allowInsecureConnections: Entorno.permitirHttpOidc,
      ),
    );
    await _guardarRespuesta(
      accessToken: respuesta.accessToken,
      refreshToken: respuesta.refreshToken ?? refreshToken,
      idToken: respuesta.idToken ?? state.idToken,
      accessTokenExpirationDateTime: respuesta.accessTokenExpirationDateTime,
    );
  }

  /// Atajo deliberado para desarrollo web/local. Está deshabilitado por defecto.
  Future<void> iniciarSesionDev({String rol = 'creativo'}) async {
    if (!Entorno.permitirEmisorPrueba) {
      throw ApiExcepcion(
        status: 403,
        codigo: 'emisor_prueba_deshabilitado',
        mensaje: 'El emisor directo de desarrollo está deshabilitado.',
      );
    }
    final uri = Uri.parse('${Entorno.baseUrlEmisorPrueba}/emitir')
        .replace(queryParameters: {'roles': rol});
    final respuesta = await http.get(uri).timeout(const Duration(seconds: 6));
    if (respuesta.statusCode != 200) {
      throw ApiExcepcion(
        status: respuesta.statusCode,
        codigo: 'emisor_prueba_error',
        mensaje: 'El emisor de desarrollo respondió ${respuesta.statusCode}.',
      );
    }
    final token = (jsonDecode(respuesta.body) as Map<String, dynamic>)['access_token'] as String;
    await _guardarRespuesta(accessToken: token, accessTokenExpirationDateTime: _expiracionJwt(token));
  }

  Future<void> cerrarSesion() async {
    final idToken = state.idToken;
    await _limpiarLocal();
    if (!kIsWeb && idToken != null) {
      try {
        await _appAuth.endSession(
          EndSessionRequest(
            idTokenHint: idToken,
            postLogoutRedirectUrl: Entorno.redireccionSalidaOidc,
            issuer: Entorno.emisorOidc,
            allowInsecureConnections: Entorno.permitirHttpOidc,
          ),
        );
      } catch (_) {
        // La sesión local ya quedó cerrada; una falla del navegador no la restaura.
      }
    }
  }

  Future<void> _guardarRespuesta({
    required String? accessToken,
    String? refreshToken,
    String? idToken,
    DateTime? accessTokenExpirationDateTime,
  }) async {
    if (accessToken == null) throw StateError('El proveedor no devolvió access_token.');
    final claims = _decodificarJwt(accessToken);
    final roles = ((claims?['realm_access'] as Map<String, dynamic>?)?['roles'] as List?)
            ?.whereType<String>()
            .toList() ??
        const <String>[];
    final rol = roles.contains('creativo') ? 'creativo' : (roles.isEmpty ? null : roles.first);
    final expira = accessTokenExpirationDateTime ?? _expiracionJwt(accessToken);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(clavePrefsToken, accessToken);
    if (rol != null) await prefs.setString(clavePrefsRol, rol);
    if (refreshToken != null) await prefs.setString(clavePrefsRefreshToken, refreshToken);
    if (idToken != null) await prefs.setString(clavePrefsIdToken, idToken);
    if (expira != null) await prefs.setString(clavePrefsExpiracion, expira.toIso8601String());
    state = SesionEstado(
      token: accessToken,
      rol: rol,
      refreshToken: refreshToken,
      idToken: idToken,
      expiraEn: expira,
    );
  }

  Future<void> _limpiarLocal() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.remove(clavePrefsToken),
      prefs.remove(clavePrefsRol),
      prefs.remove(clavePrefsRefreshToken),
      prefs.remove(clavePrefsIdToken),
      prefs.remove(clavePrefsExpiracion),
    ]);
    state = const SesionEstado();
  }
}

Map<String, dynamic>? _decodificarJwt(String? token) {
  if (token == null) return null;
  final partes = token.split('.');
  if (partes.length != 3) return null;
  try {
    final payload = base64Url.normalize(partes[1]);
    return jsonDecode(utf8.decode(base64Url.decode(payload))) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}

DateTime? _expiracionJwt(String token) {
  final exp = _decodificarJwt(token)?['exp'];
  return exp is num ? DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000) : null;
}
