import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/logo_adorbit.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/red/api_excepcion.dart';
import '../../core/tema/colores_ao.dart';
import '../../core/tema/tema_controller.dart';

class LoginPagina extends ConsumerStatefulWidget {
  const LoginPagina({super.key});

  @override
  ConsumerState<LoginPagina> createState() => _LoginPaginaState();
}

class _LoginPaginaState extends ConsumerState<LoginPagina> {
  bool _conectando = false;
  bool _bannerVisible = true;
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
      await ref.read(sesionControllerProvider.notifier).iniciarSesionDev(rol: 'creativo');
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

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            Positioned(
              top: 4,
              right: 4,
              child: IconButton(
                tooltip: 'Cambiar tema',
                icon: Icon(modoOscuro ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
                onPressed: () => ref.read(temaControllerProvider.notifier).alternar(),
              ),
            ),
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_bannerVisible)
                      TarjetaAo(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(Icons.wifi_off_rounded, color: c.aviso, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Sin conexión a internet. Modo offline activado.',
                                style: TextStyle(color: c.textoSuave, fontSize: 12),
                              ),
                            ),
                            TextButton(
                              onPressed: () => setState(() => _bannerVisible = false),
                              child: const Text('Ocultar'),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 28),
                    LogoAdorbit(tamano: 72, color: c.marca),
                    const SizedBox(height: 16),
                    Text(
                      'AdOrbit',
                      style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: c.texto),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Gestión creativa y operaciones en campo',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.textoSuave),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _conectando ? null : _iniciarSesion,
                        child: _conectando
                            ? const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  ),
                                  SizedBox(width: 10),
                                  Text('Conectando a Keycloak...'),
                                ],
                              )
                            : const Text('Iniciar sesión con Keycloak'),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Necesitas conexión a internet para iniciar sesión la primera vez.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: c.textoTenue, fontSize: 12),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
                      TarjetaAo(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: c.peligro, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(_error!, style: TextStyle(color: c.peligro, fontSize: 12)),
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
