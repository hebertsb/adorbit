import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Navegacion inferior de las 4 secciones principales (ver mockup lista_de_briefs).
class NavInferior extends StatelessWidget {
  const NavInferior({super.key, required this.indiceActual, required this.pendientesSync});

  final int indiceActual;
  final int pendientesSync;

  static const rutas = ['/briefs', '/auditoria', '/sincronizacion', '/perfil'];

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: indiceActual,
      onDestinationSelected: (i) => context.go(rutas[i]),
      destinations: [
        const NavigationDestination(
          icon: Icon(Icons.assignment_outlined),
          selectedIcon: Icon(Icons.assignment),
          label: 'Briefs',
        ),
        const NavigationDestination(
          icon: Icon(Icons.fact_check_outlined),
          selectedIcon: Icon(Icons.fact_check),
          label: 'Auditoría',
        ),
        NavigationDestination(
          icon: Badge(
            label: Text('$pendientesSync'),
            isLabelVisible: pendientesSync > 0,
            child: const Icon(Icons.sync_outlined),
          ),
          selectedIcon: const Icon(Icons.sync),
          label: 'Sincronizar',
        ),
        const NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Perfil',
        ),
      ],
    );
  }
}
