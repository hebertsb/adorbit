import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/logo_adorbit.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/i18n/idioma_controller.dart';
import '../../core/i18n/textos.dart';
import '../../core/red/api_excepcion.dart';
import '../../core/red/conectividad_service.dart';
import '../../core/tema/colores_ao.dart';
import '../../core/tema/tema_controller.dart';

class LoginPagina extends ConsumerStatefulWidget {
  const LoginPagina({super.key});

  @override
  ConsumerState<LoginPagina> createState() => _LoginPaginaState();
}

class _LoginPaginaState extends ConsumerState<LoginPagina> {
  bool _conectando = false;
  bool _bannerOcultoManualmente = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Sesion ya restaurada (ver main.dart) -- si habia un token guardado, nos saltamos
    // el boton. post-frame porque go_router no navega de forma segura desde initState.
    if (ref.read(sesionControllerProvider).autenticado) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/briefs');
      });
    }
  }

  /// Mientras Roly no tenga el Keycloak real corriendo, inicia sesion contra el emisor
  /// de JWT de prueba (ver core/auth/sesion_controller.dart) -- el mismo que ya usa
  /// ms-ia. No es un bypass: ms-creatividades verifica el token con su codigo real.
  /// TODO Hebert: reemplazar por flutter_appauth contra el realm real de Keycloak (OIDC/OAuth2).
  Future<void> _iniciarSesion() async {
    setState(() {
      _conectando = true;
      _error = null;
    });
    try {
      await ref
          .read(sesionControllerProvider.notifier)
          .iniciarSesionDev(rol: 'creativo');
      if (!mounted) return;
      context.go('/briefs');
    } on ApiExcepcion catch (error) {
      if (!mounted) return;
      setState(() => _error = error.mensaje);
    } finally {
      if (mounted) setState(() => _conectando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final modoOscuro = Theme.of(context).brightness == Brightness.dark;
    final idioma = ref.watch(idiomaControllerProvider);
    String t(String clave) => Textos.t(idioma, clave);
    final conexion =
        ref.watch(conectividadProvider).value ?? EstadoConexion.enLinea;
    final sinConexion = conexion == EstadoConexion.sinConexion;

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            Positioned(
              top: 4,
              right: 48,
              child: IconButton(
                tooltip: t('login.idioma_tooltip'),
                icon: const Icon(Icons.translate),
                onPressed: () =>
                    ref.read(idiomaControllerProvider.notifier).alternar(),
              ),
            ),
            Positioned(
              top: 4,
              right: 4,
              child: IconButton(
                tooltip: t('login.tema_tooltip'),
                icon: Icon(
                  modoOscuro
                      ? Icons.light_mode_outlined
                      : Icons.dark_mode_outlined,
                ),
                onPressed: () =>
                    ref.read(temaControllerProvider.notifier).alternar(),
              ),
            ),
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (sinConexion && !_bannerOcultoManualmente)
                      TarjetaAo(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(
                              Icons.wifi_off_rounded,
                              color: c.aviso,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                t('login.banner_offline'),
                                style: TextStyle(
                                  color: c.textoSuave,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () => setState(
                                () => _bannerOcultoManualmente = true,
                              ),
                              child: Text(t('login.ocultar')),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 28),
                    LogoAdorbit(tamano: 72, color: c.marca),
                    const SizedBox(height: 16),
                    Text(
                      'AdOrbit',
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: c.texto,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      t('app.subtitulo'),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.textoSuave),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _conectando ? null : _iniciarSesion,
                        child: _conectando
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(t('login.conectando')),
                                ],
                              )
                            : Text(t('login.boton')),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      t('login.nota_conexion'),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.textoTenue, fontSize: 12),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      TarjetaAo(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(
                              Icons.error_outline,
                              color: c.peligro,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _error!,
                                style: TextStyle(
                                  color: c.peligro,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
