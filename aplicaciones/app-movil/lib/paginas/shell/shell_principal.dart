import 'package:flutter/material.dart';

import '../../compartido/nav_inferior.dart';
import '../../datos/repos/cola_sync_repo.dart';

/// Envoltorio de las 4 secciones principales (ver mockup lista_de_briefs: nav inferior
/// Briefs/Auditoría/Sincronizar/Perfil). Equivalente movil de ShellPrincipal en portal-gestion.
class ShellPrincipal extends StatelessWidget {
  const ShellPrincipal({
    super.key,
    required this.child,
    required this.rutaActual,
  });

  final Widget child;
  final String rutaActual;

  @override
  Widget build(BuildContext context) {
    var indice = NavInferior.rutas.indexWhere((r) => rutaActual.startsWith(r));
    if (indice < 0) indice = 0;

    return Scaffold(
      body: child,
      bottomNavigationBar: FutureBuilder<int>(
        future: ColaSyncRepo().pendientes,
        builder: (context, snapshot) => NavInferior(
          indiceActual: indice,
          pendientesSync: snapshot.data ?? 0,
        ),
      ),
    );
  }
}
