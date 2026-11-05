import 'package:cross_file/cross_file.dart';
import 'package:go_router/go_router.dart';

import '../../paginas/auditoria_vallas/auditoria_vallas_pagina.dart';
import '../../paginas/brief_detalle/brief_detalle_pagina.dart';
import '../../paginas/briefs_lista/briefs_lista_pagina.dart';
import '../../paginas/camara_captura/camara_captura_pagina.dart';
import '../../paginas/cola_sincronizacion/cola_sincronizacion_pagina.dart';
import '../../paginas/login/login_pagina.dart';
import '../../paginas/perfil/perfil_pagina.dart';
import '../../paginas/pieza_previsualizacion/pieza_previsualizacion_pagina.dart';
import '../../paginas/shell/shell_principal.dart';
import '../../paginas/validacion_ia/validacion_ia_pagina.dart';

/// Rutas de la app. Las 4 pestañas principales (briefs/auditoria/sincronizacion/perfil)
/// viven bajo el ShellRoute con nav inferior; login y el flujo de captura son pantallas
/// completas sin nav inferior (drill-down), igual que saga-estado en portal-gestion.
final GoRouter appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginPagina()),
    GoRoute(
      path: '/briefs/:id',
      builder: (context, state) => BriefDetallePagina(briefId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/camara/:briefId',
      builder: (context, state) => CamaraCapturaPagina(briefId: state.pathParameters['briefId']!),
    ),
    GoRoute(
      path: '/previsualizacion/:briefId',
      builder: (context, state) => PiezaPrevisualizacionPagina(
        briefId: state.pathParameters['briefId']!,
        archivo: state.extra as XFile?,
      ),
    ),
    GoRoute(
      path: '/validacion-ia/:briefId',
      builder: (context, state) => ValidacionIaPagina(briefId: state.pathParameters['briefId']!),
    ),
    ShellRoute(
      builder: (context, state, child) =>
          ShellPrincipal(rutaActual: state.uri.toString(), child: child),
      routes: [
        GoRoute(path: '/briefs', builder: (context, state) => const BriefsListaPagina()),
        GoRoute(path: '/auditoria', builder: (context, state) => const AuditoriaVallasPagina()),
        GoRoute(
          path: '/sincronizacion',
          builder: (context, state) => const ColaSincronizacionPagina(),
        ),
        GoRoute(path: '/perfil', builder: (context, state) => const PerfilPagina()),
      ],
    ),
  ],
);
