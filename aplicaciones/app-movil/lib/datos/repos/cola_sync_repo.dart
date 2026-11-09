import 'dart:convert';

import '../../core/datos_locales/bandeja_salida_dao.dart';
import '../modelos/cola_sync.dart';

/// Lee la bandeja de salida local real (core/datos_locales/bandeja_salida_dao.dart) en
/// vez de datos de muestra -- cada fila es una pieza esperando subirse de verdad (ver
/// SincronizadorService). No hay estados "enviando"/"conflicto" reales todavia (el
/// envio es secuencial y sin merge de versiones); se infiere "error" de intentos > 0
/// sobre una fila que sigue pendiente.
class ColaSyncRepo {
  final _dao = BandejaSalidaDao();

  Future<List<ElementoColaSync>> listar() async {
    final filas = await _dao.listar();
    return filas.map(_aElementoColaSync).toList();
  }

  Future<int> get pendientes async {
    final filas = await _dao.listar();
    return filas.where((e) => e.estado == 'pendiente').length;
  }

  Future<int> get resueltos async {
    final filas = await _dao.listar();
    return filas.where((e) => e.estado == 'sincronizado').length;
  }

  Future<int> get errores async {
    final filas = await _dao.listar();
    return filas.where((e) => e.estado == 'pendiente' && e.intentos > 0).length;
  }

  ElementoColaSync _aElementoColaSync(ElementoBandeja item) {
    Map<String, dynamic> carga;
    try {
      carga = jsonDecode(item.carga) as Map<String, dynamic>;
    } catch (_) {
      carga = const {};
    }

    final titulo = carga['nombre'] as String? ??
        (item.tipo == 'validacion_local' ? 'Validación de IA local' : item.tipo);
    final briefId = carga['briefId'] as String?;
    final piezaId = carga['piezaId'] as String?;
    final subtitulo = briefId != null
        ? 'Brief ${briefId.substring(0, briefId.length.clamp(0, 8))}…'
        : piezaId != null
            ? 'Pieza ${piezaId.substring(0, piezaId.length.clamp(0, 8))}…'
            : item.tipo;

    if (item.estado == 'sincronizado') {
      return ElementoColaSync(
        titulo: titulo,
        subtitulo: subtitulo,
        estado: EstadoSincronizacion.sincronizado,
      );
    }
    if (item.intentos > 0) {
      return ElementoColaSync(
        titulo: titulo,
        subtitulo: subtitulo,
        estado: EstadoSincronizacion.error,
        intentos: item.intentos,
        // Clave de core/i18n/textos.dart, no texto literal -- la pantalla la resuelve
        // con el idioma activo (ver cola_sincronizacion_pagina.dart).
        detalle: 'sync.detalle_error',
      );
    }
    return ElementoColaSync(
      titulo: titulo,
      subtitulo: subtitulo,
      estado: EstadoSincronizacion.pendiente,
      detalle: 'sync.detalle_pendiente',
    );
  }
}
