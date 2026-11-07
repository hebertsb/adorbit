import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/i18n/idioma_controller.dart';
import '../core/i18n/textos.dart';

/// Navegacion inferior de las 4 secciones principales (ver mockup lista_de_briefs).
class NavInferior extends ConsumerWidget {
  const NavInferior({
    super.key,
    required this.indiceActual,
    required this.pendientesSync,
  });

  final int indiceActual;
  final int pendientesSync;

  static const rutas = ['/briefs', '/auditoria', '/sincronizacion', '/perfil'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final idioma = ref.watch(idiomaControllerProvider);
    String t(String clave) => Textos.t(idioma, clave);

    return NavigationBar(
      selectedIndex: indiceActual,
      onDestinationSelected: (i) => context.go(rutas[i]),
      destinations: [
        NavigationDestination(
          icon: const Icon(Icons.assignment_outlined),
          selectedIcon: const Icon(Icons.assignment),
          label: t('nav.briefs'),
        ),
        NavigationDestination(
          icon: const Icon(Icons.fact_check_outlined),
          selectedIcon: const Icon(Icons.fact_check),
          label: t('nav.auditoria'),
        ),
        NavigationDestination(
          icon: Badge(
            label: Text('$pendientesSync'),
            isLabelVisible: pendientesSync > 0,
            child: const Icon(Icons.sync_outlined),
          ),
          selectedIcon: const Icon(Icons.sync),
          label: t('nav.sincronizar'),
        ),
        NavigationDestination(
          icon: const Icon(Icons.person_outline),
          selectedIcon: const Icon(Icons.person),
          label: t('nav.perfil'),
        ),
      ],
    );
  }
}
