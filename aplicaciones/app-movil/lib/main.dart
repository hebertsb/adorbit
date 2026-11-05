import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/red/conectividad_service.dart';
import 'core/router/app_router.dart';
import 'core/sync/sincronizacion_background.dart';
import 'core/tema/tema_ao.dart';
import 'core/tema/tema_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // workmanager no tiene equivalente de SO en web; ahi el disparador manual
  // "Sincronizar ahora" sigue siendo el unico camino (ver cola_sincronizacion_pagina).
  if (!kIsWeb) {
    await SincronizacionBackground.inicializar();
  }
  runApp(const ProviderScope(child: AdOrbitApp()));
}

class AdOrbitApp extends ConsumerWidget {
  const AdOrbitApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final modoTema = ref.watch(temaControllerProvider);

    // Al recuperar cobertura, reintenta la bandeja de salida sin esperar los
    // 15 min de la tarea periodica (ver mockup cola_de_sincronizacion: "Se
    // sincronizará automáticamente cuando recuperes cobertura").
    ref.listen<AsyncValue<EstadoConexion>>(conectividadProvider, (anterior, actual) {
      final volvioALinea = anterior?.value == EstadoConexion.sinConexion &&
          actual.value == EstadoConexion.enLinea;
      if (!kIsWeb && volvioALinea) {
        SincronizacionBackground.sincronizarAhora();
      }
    });

    return MaterialApp.router(
      title: 'AdOrbit',
      debugShowCheckedModeBanner: false,
      theme: TemaAo.claro(),
      darkTheme: TemaAo.oscuro(),
      themeMode: modoTema,
      routerConfig: appRouter,
    );
  }
}
