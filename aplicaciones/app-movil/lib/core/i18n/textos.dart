import 'idioma_controller.dart';

/// Textos fijos de interfaz en espanol/ingles (ver nota de alcance en
/// idioma_controller.dart). Uso: Textos.t(ref.watch(idiomaControllerProvider), 'clave').
class Textos {
  const Textos._();

  static String t(Idioma idioma, String clave) =>
      _mapa[clave]?[idioma] ?? _mapa[clave]?[Idioma.es] ?? clave;

  static const Map<String, Map<Idioma, String>> _mapa = {
    // Comunes
    'app.subtitulo': {
      Idioma.es: 'Gestión creativa y operaciones en campo',
      Idioma.en: 'Creative management and field operations',
    },
    'comun.reintentar': {Idioma.es: 'Reintentar', Idioma.en: 'Retry'},
    'comun.cancelar': {Idioma.es: 'Cancelar', Idioma.en: 'Cancel'},

    // Login
    'login.banner_offline': {
      Idioma.es: 'Sin conexión a internet. Modo offline activado.',
      Idioma.en: 'No internet connection. Offline mode enabled.',
    },
    'login.banner_online': {
      Idioma.es: 'Conectado a internet.',
      Idioma.en: 'Connected to the internet.',
    },
    'login.ocultar': {Idioma.es: 'Ocultar', Idioma.en: 'Hide'},
    'login.boton': {
      Idioma.es: 'Iniciar sesión con Keycloak',
      Idioma.en: 'Sign in with Keycloak',
    },
    'login.conectando': {
      Idioma.es: 'Conectando a Keycloak...',
      Idioma.en: 'Connecting to Keycloak...',
    },
    'login.nota_conexion': {
      Idioma.es:
          'Necesitas conexión a internet para iniciar sesión la primera vez.',
      Idioma.en:
          'You need an internet connection to sign in for the first time.',
    },
    'login.tema_tooltip': {
      Idioma.es: 'Cambiar tema',
      Idioma.en: 'Change theme',
    },
    'login.idioma_tooltip': {
      Idioma.es: 'Change language',
      Idioma.en: 'Cambiar idioma',
    },

    // Nav inferior
    'nav.briefs': {Idioma.es: 'Briefs', Idioma.en: 'Briefs'},
    'nav.auditoria': {Idioma.es: 'Auditoría', Idioma.en: 'Audit'},
    'nav.sincronizar': {Idioma.es: 'Sincronizar', Idioma.en: 'Sync'},
    'nav.perfil': {Idioma.es: 'Perfil', Idioma.en: 'Profile'},

    // Briefs - lista
    'briefs.nuevo': {Idioma.es: 'Nuevo brief', Idioma.en: 'New brief'},
    'briefs.nuevo_subtitulo': {
      Idioma.es: 'Se crea directo en ms-creatividades (POST /api/v1/briefs).',
      Idioma.en: 'Created directly in ms-creatividades (POST /api/v1/briefs).',
    },
    'briefs.titulo_campo': {Idioma.es: 'Título', Idioma.en: 'Title'},
    'briefs.titulo_hint': {
      Idioma.es: 'Ej: Lanzamiento Fibra 500M',
      Idioma.en: 'E.g: Fiber 500M Launch',
    },
    'briefs.campana_campo': {
      Idioma.es: 'ID de campaña (UUID)',
      Idioma.en: 'Campaign ID (UUID)',
    },
    'briefs.campana_hint': {
      Idioma.es: 'Lo asigna ms-campanas al contratar',
      Idioma.en: 'Assigned by ms-campanas when contracting',
    },
    'briefs.descripcion_campo': {
      Idioma.es: 'Descripción (opcional)',
      Idioma.en: 'Description (optional)',
    },
    'briefs.error_obligatorios': {
      Idioma.es: 'Título y campaña son obligatorios',
      Idioma.en: 'Title and campaign are required',
    },
    'briefs.creando': {Idioma.es: 'Creando...', Idioma.en: 'Creating...'},
    'briefs.crear': {Idioma.es: 'Crear brief', Idioma.en: 'Create brief'},
    'briefs.sin_datos_servidor': {
      Idioma.es: 'Sin datos del servidor',
      Idioma.en: 'No data from server',
    },
    'briefs.error_conexion_generico': {
      Idioma.es: 'No se pudo conectar con el servidor',
      Idioma.en: 'Could not connect to the server',
    },
    'briefs.buscar_hint': {
      Idioma.es: 'Buscar brief...',
      Idioma.en: 'Search brief...',
    },
    'briefs.todos': {Idioma.es: 'Todos', Idioma.en: 'All'},
    'briefs.totales': {Idioma.es: 'Briefs totales', Idioma.en: 'Total briefs'},
    'briefs.pendientes_sync': {
      Idioma.es: 'Pendientes sync',
      Idioma.en: 'Pending sync',
    },
    'briefs.sin_resultados_titulo': {
      Idioma.es: 'Sin briefs encontrados',
      Idioma.en: 'No briefs found',
    },
    'briefs.sin_resultados_detalle': {
      Idioma.es:
          'No hay registros que coincidan con los criterios de búsqueda.',
      Idioma.en: 'No records match the search criteria.',
    },

    // Brief - detalle
    'brief.titulo_pagina': {
      Idioma.es: 'Detalle del brief',
      Idioma.en: 'Brief detail',
    },
    'brief.volver': {Idioma.es: 'Volver', Idioma.en: 'Back'},
    'brief.subir_pieza': {Idioma.es: 'Subir pieza', Idioma.en: 'Upload piece'},
    'brief.total_piezas': {
      Idioma.es: 'Total de piezas',
      Idioma.en: 'Total pieces',
    },
    'brief.piezas_pieza': {Idioma.es: 'piezas', Idioma.en: 'pieces'},
    'brief.piezas_titulo': {Idioma.es: 'Piezas', Idioma.en: 'Pieces'},
    'brief.sin_piezas': {
      Idioma.es: 'Sin piezas todavía',
      Idioma.en: 'No pieces yet',
    },
    'brief.rechazar': {Idioma.es: 'Rechazar', Idioma.en: 'Reject'},
    'brief.aprobar': {Idioma.es: 'Aprobar', Idioma.en: 'Approve'},
    'brief.subir_nueva_version': {
      Idioma.es: 'Subir nueva versión',
      Idioma.en: 'Upload new version',
    },
    'brief.edicion_deshabilitada': {
      Idioma.es: 'Edición deshabilitada',
      Idioma.en: 'Editing disabled',
    },
    'brief.bloqueada_saga': {
      Idioma.es:
          'Bloqueada por contratación — no se puede editar ni re-aprobar en esta etapa.',
      Idioma.en:
          'Locked by contracting — cannot be edited or re-approved at this stage.',
    },
    'brief.aprobada_ok': {
      Idioma.es: 'Pieza aprobada correctamente',
      Idioma.en: 'Piece approved successfully',
    },
    'brief.rechazada_ok': {
      Idioma.es: 'Pieza marcada como rechazada',
      Idioma.en: 'Piece marked as rejected',
    },
    'brief.no_se_pudo_cargar': {
      Idioma.es: 'No se pudo cargar el brief',
      Idioma.en: 'Could not load the brief',
    },

    // Sincronizacion
    'sync.titulo': {Idioma.es: 'Sincronización', Idioma.en: 'Sync'},
    'sync.conectado': {
      Idioma.es: 'Conectado a Internet',
      Idioma.en: 'Connected to the Internet',
    },
    'sync.sin_conexion': {
      Idioma.es: 'Sin conexión a internet',
      Idioma.en: 'No internet connection',
    },
    'sync.en_linea': {Idioma.es: 'En línea', Idioma.en: 'Online'},
    'sync.sin_conexion_chip': {Idioma.es: 'Sin conexión', Idioma.en: 'Offline'},
    'sync.sincronizando': {
      Idioma.es: 'Sincronizando lote activo...',
      Idioma.en: 'Syncing active batch...',
    },
    'sync.sincronizar_ahora': {
      Idioma.es: 'Sincronizar ahora',
      Idioma.en: 'Sync now',
    },
    'sync.pendientes': {Idioma.es: 'pendientes', Idioma.en: 'pending'},
    'sync.resuelto': {Idioma.es: 'resuelto', Idioma.en: 'done'},
    'sync.error': {Idioma.es: 'error', Idioma.en: 'error'},
    'sync.elementos_cola': {
      Idioma.es: 'Elementos en cola',
      Idioma.en: 'Items in queue',
    },
    'sync.vacio': {
      Idioma.es: 'Nada en cola — todo sincronizado',
      Idioma.en: 'Nothing queued — all synced',
    },
    'sync.solo_wifi_titulo': {
      Idioma.es: 'Solo sincronizar con Wi-Fi',
      Idioma.en: 'Only sync over Wi-Fi',
    },
    'sync.solo_wifi_subtitulo': {
      Idioma.es: 'Evita consumo de datos móviles al subir fotos y videos',
      Idioma.en: 'Avoids mobile data usage when uploading photos and videos',
    },
    'sync.bloqueado_por_wifi': {
      Idioma.es:
          'Activa Wi-Fi o desactiva "Solo Wi-Fi" para sincronizar ahora.',
      Idioma.en: 'Turn on Wi-Fi or disable "Only Wi-Fi" to sync now.',
    },
    'sync.cola_actualizada': {
      Idioma.es: '✓ Cola actualizada con el servidor',
      Idioma.en: '✓ Queue updated with the server',
    },
    'sync.detalle_error': {
      Idioma.es:
          'No se pudo sincronizar todavía. Se reintentará automáticamente.',
      Idioma.en: 'Could not sync yet. It will retry automatically.',
    },
    'sync.detalle_pendiente': {
      Idioma.es: 'En cola para enviar al servidor.',
      Idioma.en: 'Queued to send to the server.',
    },
    'sync.intentos_fallidos_sufijo': {
      Idioma.es: 'intentos fallidos',
      Idioma.en: 'failed attempts',
    },
    'sync.enviando': {Idioma.es: 'Enviando', Idioma.en: 'Sending'},

    // Perfil
    'perfil.titulo': {Idioma.es: 'Perfil', Idioma.en: 'Profile'},
    'perfil.preferencias': {
      Idioma.es: 'Preferencias',
      Idioma.en: 'Preferences',
    },
    'perfil.modo_oscuro': {Idioma.es: 'Modo oscuro', Idioma.en: 'Dark mode'},
    'perfil.tema_noche': {
      Idioma.es: 'Tema nocturno activado',
      Idioma.en: 'Night theme enabled',
    },
    'perfil.tema_dia': {
      Idioma.es: 'Tema diurno activado',
      Idioma.en: 'Day theme enabled',
    },
    'perfil.idioma_titulo': {
      Idioma.es: 'Idioma de la interfaz',
      Idioma.en: 'Interface language',
    },
    'perfil.idioma_subtitulo': {
      Idioma.es: 'Configuración regional activa',
      Idioma.en: 'Active regional setting',
    },
    'perfil.cerrar_sesion': {Idioma.es: 'Cerrar sesión', Idioma.en: 'Sign out'},
    'perfil.ultima_sync': {
      Idioma.es: 'Última sincronización',
      Idioma.en: 'Last sync',
    },
    'perfil.ultima_sync_nunca': {
      Idioma.es: 'Aún no hay piezas sincronizadas',
      Idioma.en: 'No pieces synced yet',
    },
    'perfil.confirmar_salir_titulo': {
      Idioma.es: '¿Cerrar sesión?',
      Idioma.en: 'Sign out?',
    },
    'perfil.confirmar_salir_detalle': {
      Idioma.es:
          'Se finalizará tu sesión de Keycloak. Los registros pendientes de sincronización se mantendrán seguros en tu dispositivo.',
      Idioma.en:
          'Your Keycloak session will end. Records pending sync will stay safe on your device.',
    },
    'perfil.salir': {Idioma.es: 'Salir', Idioma.en: 'Sign out'},
    'perfil.sesion_finalizada': {
      Idioma.es: 'Sesión finalizada en Keycloak OIDC.',
      Idioma.en: 'Session ended in Keycloak OIDC.',
    },
    'perfil.sin_rol': {Idioma.es: 'Sin rol', Idioma.en: 'No role'},
    'perfil.app_nombre': {Idioma.es: 'AdOrbit', Idioma.en: 'AdOrbit'},
    'perfil.app_descripcion': {
      Idioma.es: 'Plataforma de Operaciones Publicitarias',
      Idioma.en: 'Advertising Operations Platform',
    },

    // Camara
    'camara.error_permiso': {
      Idioma.es:
          'Permiso de cámara denegado. Actívalo en los ajustes del dispositivo.',
      Idioma.en: 'Camera permission denied. Enable it in device settings.',
    },
    'camara.error_sin_camara': {
      Idioma.es:
          'No se encontró ninguna cámara disponible en este dispositivo.',
      Idioma.en: 'No camera available on this device.',
    },
    'camara.error_iniciar': {
      Idioma.es: 'No se pudo iniciar la cámara',
      Idioma.en: 'Could not start the camera',
    },
    'camara.error_abrir': {
      Idioma.es: 'No se pudo abrir la cámara',
      Idioma.en: 'Could not open the camera',
    },
    'camara.error_capturar': {
      Idioma.es: 'No se pudo capturar',
      Idioma.en: 'Could not capture',
    },
    'camara.para': {Idioma.es: 'Para', Idioma.en: 'For'},
    'camara.galeria': {Idioma.es: 'Galería', Idioma.en: 'Gallery'},
    'camara.modo_panoramica': {Idioma.es: 'Panorámica', Idioma.en: 'Panoramic'},
    'camara.modo_valla': {Idioma.es: 'Valla OOH', Idioma.en: 'OOH Billboard'},
    'camara.modo_inspeccion': {
      Idioma.es: 'Inspección',
      Idioma.en: 'Inspection',
    },

    // Previsualizacion
    'previsualizacion.titulo': {
      Idioma.es: 'Revisión de pieza',
      Idioma.en: 'Piece review',
    },
    'previsualizacion.descartar_titulo': {
      Idioma.es: '¿Descartar captura?',
      Idioma.en: 'Discard capture?',
    },
    'previsualizacion.descartar_detalle': {
      Idioma.es: 'Esta fotografía se eliminará de la sesión actual.',
      Idioma.en: 'This photo will be removed from the current session.',
    },
    'previsualizacion.descartar_boton': {
      Idioma.es: 'Descartar',
      Idioma.en: 'Discard',
    },
    'previsualizacion.jpg_alta_resolucion': {
      Idioma.es: 'JPG · Alta resolución',
      Idioma.en: 'JPG · High resolution',
    },
    'previsualizacion.para': {Idioma.es: 'Para', Idioma.en: 'For'},
    'previsualizacion.pop_totem': {
      Idioma.es: 'POP / Tótem',
      Idioma.en: 'POP / Totem',
    },
    'previsualizacion.nota_hint': {
      Idioma.es: 'Ej: Foto de tótem en tienda sucursal Centro...',
      Idioma.en: 'E.g: Totem photo at Centro branch store...',
    },
    'previsualizacion.etiqueta_acceso': {
      Idioma.es: 'Acceso principal',
      Idioma.en: 'Main access',
    },
    'previsualizacion.etiqueta_visibilidad': {
      Idioma.es: 'Buena visibilidad',
      Idioma.en: 'Good visibility',
    },
    'previsualizacion.etiqueta_reubicacion': {
      Idioma.es: 'Requiere reubicación',
      Idioma.en: 'Requires relocation',
    },
    'previsualizacion.volver_tomar': {
      Idioma.es: 'Volver a tomar foto',
      Idioma.en: 'Retake photo',
    },
    'previsualizacion.guardando': {
      Idioma.es: 'Guardando...',
      Idioma.en: 'Saving...',
    },
    'previsualizacion.usar_foto': {
      Idioma.es: 'Usar esta foto',
      Idioma.en: 'Use this photo',
    },
    'previsualizacion.foto_adjuntada': {
      Idioma.es: 'Foto adjuntada',
      Idioma.en: 'Photo attached',
    },

    // Validacion con IA
    'validacion.titulo': {
      Idioma.es: 'Validación con IA',
      Idioma.en: 'AI validation',
    },
    'validacion.reanalizar_tooltip': {
      Idioma.es: 'Volver a analizar',
      Idioma.en: 'Re-analyze',
    },
    'validacion.sin_foto': {
      Idioma.es: 'Esta pantalla necesita la foto recién capturada.',
      Idioma.en: 'This screen needs the just-captured photo.',
    },
    'validacion.error_analizar': {
      Idioma.es: 'No se pudo analizar la foto en este dispositivo.',
      Idioma.en: 'Could not analyze the photo on this device.',
    },
    'validacion.encolando': {
      Idioma.es: 'Encolando archivo...',
      Idioma.en: 'Queueing file...',
    },
    'validacion.analizado_dispositivo': {
      Idioma.es: 'Analizado en tu dispositivo · Sin conexión a internet',
      Idioma.en: 'Analyzed on your device · No internet connection',
    },
    'validacion.inferencia_detalle': {
      Idioma.es:
          'Inferencia on-device con el modelo de logo de AdOrbit (ONNX Runtime), sin subir la imagen a ningún servidor',
      Idioma.en:
          'On-device inference with the AdOrbit logo model (ONNX Runtime), without uploading the image to any server',
    },
    'validacion.analizando': {
      Idioma.es: 'Analizando con IA local...',
      Idioma.en: 'Analyzing with local AI...',
    },
    'validacion.analizando_badge': {
      Idioma.es: 'ANALIZANDO...',
      Idioma.en: 'ANALYZING...',
    },
    'validacion.logo_detectado_badge': {
      Idioma.es: 'LOGO DETECTADO',
      Idioma.en: 'LOGO DETECTED',
    },
    'validacion.logo_no_detectado_badge': {
      Idioma.es: 'LOGO NO DETECTADO',
      Idioma.en: 'LOGO NOT DETECTED',
    },
    'validacion.confianza_sufijo': {
      Idioma.es: 'confianza',
      Idioma.en: 'confidence',
    },
    'validacion.subir_pieza': {
      Idioma.es: 'Subir pieza',
      Idioma.en: 'Upload piece',
    },
    'validacion.subida_correcta': {
      Idioma.es: 'Pieza subida correctamente',
      Idioma.en: 'Piece uploaded successfully',
    },
    'validacion.subir_de_todas_formas': {
      Idioma.es: 'Subir de todas formas',
      Idioma.en: 'Upload anyway',
    },
    'validacion.enviado_revision_manual': {
      Idioma.es: 'Enviado a revisión manual',
      Idioma.en: 'Sent for manual review',
    },
    'validacion.sync_automatica': {
      Idioma.es: 'Se sincronizará automáticamente cuando recuperes cobertura.',
      Idioma.en: 'It will sync automatically once you regain coverage.',
    },
    'validacion.confianza_modelo': {
      Idioma.es: 'Confianza del modelo de logo',
      Idioma.en: 'Logo model confidence',
    },
    'validacion.umbral_modelo': {
      Idioma.es: 'Umbral del modelo',
      Idioma.en: 'Model threshold',
    },
    'validacion.diagnostico_visual': {
      Idioma.es: 'Diagnóstico visual',
      Idioma.en: 'Visual diagnosis',
    },
    'validacion.logo_detectado_item': {
      Idioma.es: 'Logo detectado',
      Idioma.en: 'Logo detected',
    },
    'validacion.logo_reconocido_detalle': {
      Idioma.es: 'Cabecera de marca reconocida',
      Idioma.en: 'Brand header recognized',
    },
    'validacion.logo_no_reconocido_detalle': {
      Idioma.es: 'No se reconoció el logo en la foto',
      Idioma.en: 'Logo not recognized in the photo',
    },
    'validacion.texto_legible': {
      Idioma.es: 'Texto legible (OCR)',
      Idioma.en: 'Readable text (OCR)',
    },
    'validacion.no_evaluado': {
      Idioma.es: 'No evaluado en este dispositivo',
      Idioma.en: 'Not evaluated on this device',
    },
    'validacion.cumple_manual_marca': {
      Idioma.es: 'Cumple manual de marca',
      Idioma.en: 'Complies with brand manual',
    },
    'validacion.logo_reconocido_titulo': {
      Idioma.es: 'Logo reconocido',
      Idioma.en: 'Logo recognized',
    },
    'validacion.logo_reconocido_banner': {
      Idioma.es:
          'El modelo local reconoció el logo de AdOrbit en la pieza. Puedes subirla al sistema.',
      Idioma.en:
          'The local model recognized the AdOrbit logo in the piece. You can upload it to the system.',
    },
    'validacion.revisa_pieza_titulo': {
      Idioma.es: 'Revisa la pieza antes de subir — riesgo de auditoría',
      Idioma.en: 'Review the piece before uploading — audit risk',
    },
    'validacion.revisa_pieza_detalle': {
      Idioma.es:
          'El modelo local no reconoció el logo de AdOrbit con suficiente confianza. Esta validación es orientativa y no bloquea tu envío.',
      Idioma.en:
          'The local model did not recognize the AdOrbit logo with enough confidence. This validation is indicative and does not block your submission.',
    },
    'validacion.consejo': {
      Idioma.es:
          'Consejo: acércate o encuadra mejor el logo, con buena luz y sin reflejos.',
      Idioma.en:
          'Tip: get closer or better frame the logo, with good light and no glare.',
    },
    'validacion.no_se_pudo_analizar': {
      Idioma.es: 'No se pudo analizar',
      Idioma.en: 'Could not analyze',
    },

    // Auditoria (pantalla con datos de muestra -- ver TODO en auditoria_repo.dart)
    'auditoria.titulo': {
      Idioma.es: 'Auditoría de valla',
      Idioma.en: 'Billboard audit',
    },
    'auditoria.cod': {Idioma.es: 'Cód.', Idioma.en: 'Code'},
    'auditoria.captura_reciente_prefijo': {
      Idioma.es: 'Captura reciente',
      Idioma.en: 'Recent capture',
    },
    'auditoria.sin_captura': {
      Idioma.es: 'Sin captura todavía · toca la imagen para tomar una foto',
      Idioma.en: 'No capture yet · tap the image to take a photo',
    },
    'auditoria.tomar_foto': {
      Idioma.es: 'Toca para tomar foto',
      Idioma.en: 'Tap to take a photo',
    },
    'auditoria.elegir_pieza': {
      Idioma.es: 'Pieza a auditar',
      Idioma.en: 'Piece to audit',
    },
    'auditoria.elegir_brief_hint': {
      Idioma.es: 'Elige un brief',
      Idioma.en: 'Choose a brief',
    },
    'auditoria.estado_bueno': {Idioma.es: 'Bueno', Idioma.en: 'Good'},
    'auditoria.estado_deterioro': {
      Idioma.es: 'Deterioro',
      Idioma.en: 'Deterioration',
    },
    'auditoria.estado_danado': {Idioma.es: 'Dañado', Idioma.en: 'Damaged'},
    'auditoria.analizar': {
      Idioma.es: 'Analizar con IA',
      Idioma.en: 'Analyze with AI',
    },
    'auditoria.analizando': {
      Idioma.es: 'Analizando...',
      Idioma.en: 'Analyzing...',
    },
    'auditoria.analizado_servidor': {
      Idioma.es:
          'Analizado por el servidor de IA (ms-ia) y guardado en el servidor.',
      Idioma.en: 'Analyzed by the AI server (ms-ia) and saved on the server.',
    },
    'auditoria.analizado_dispositivo': {
      Idioma.es: 'Analizado en tu dispositivo · Visión perimetral',
      Idioma.en: 'Analyzed on your device · Perimeter vision',
    },
    'auditoria.diagnostico_inspeccion': {
      Idioma.es: 'Diagnóstico de inspección',
      Idioma.en: 'Inspection diagnosis',
    },
    'auditoria.pieza_coincide': {
      Idioma.es: 'Pieza coincide con la aprobada',
      Idioma.en: 'Piece matches the approved one',
    },
    'auditoria.campana_verificada': {
      Idioma.es: 'Campaña verificada contra el máster de impresión oficial',
      Idioma.en: 'Campaign verified against the official print master',
    },
    'auditoria.estado_fisico': {
      Idioma.es: 'Estado físico',
      Idioma.en: 'Physical condition',
    },
    'auditoria.ubicacion_verificada': {
      Idioma.es: 'Ubicación verificada por GPS',
      Idioma.en: 'Location verified by GPS',
    },
    'auditoria.dentro_radio': {
      Idioma.es: 'Sí · Dentro del radio contratado',
      Idioma.en: 'Yes · Within the contracted radius',
    },
    'auditoria.observaciones_hint': {
      Idioma.es: 'Observaciones (opcional)',
      Idioma.en: 'Observations (optional)',
    },
    'auditoria.registrar': {
      Idioma.es: 'Registrar auditoría',
      Idioma.en: 'Register audit',
    },
    'auditoria.guardando': {
      Idioma.es: 'Guardando registro...',
      Idioma.en: 'Saving record...',
    },
    'auditoria.guardado_exito': {
      Idioma.es: 'Auditoría guardada con éxito',
      Idioma.en: 'Audit saved successfully',
    },
    'auditoria.anteriores': {
      Idioma.es: 'Auditorías anteriores de esta valla',
      Idioma.en: 'Previous audits of this billboard',
    },
    'auditoria.registros': {Idioma.es: 'registros', Idioma.en: 'records'},
  };
}
