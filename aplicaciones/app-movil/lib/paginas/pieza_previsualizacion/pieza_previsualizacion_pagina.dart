import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:cross_file/cross_file.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../core/auth/sesion_controller.dart';
import '../../core/datos_locales/bandeja_salida_dao.dart';
import '../../core/i18n/idioma_controller.dart';
import '../../core/i18n/textos.dart';
import '../../core/sync/sincronizacion_background.dart';
import '../../core/sync/sincronizador_service.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/repos/briefs_repo.dart';

class PiezaPrevisualizacionPagina extends ConsumerStatefulWidget {
  const PiezaPrevisualizacionPagina({
    super.key,
    required this.briefId,
    this.archivo,
  });

  final String briefId;

  /// Foto real tomada en camara_captura_pagina (o elegida de galeria). Nulo solo si se
  /// navega directo a esta ruta sin pasar por la camara (ej. pruebas manuales).
  final XFile? archivo;

  @override
  ConsumerState<PiezaPrevisualizacionPagina> createState() =>
      _PiezaPrevisualizacionPaginaState();
}

class _PiezaPrevisualizacionPaginaState
    extends ConsumerState<PiezaPrevisualizacionPagina> {
  final _notaControlador = TextEditingController();
  final Set<String> _etiquetas = {};
  bool _guardando = false;
  Uint8List? _bytes;
  String? _tituloBrief;

  String _t(String clave) =>
      Textos.t(ref.read(idiomaControllerProvider), clave);

  List<String> get _etiquetasDisponibles => [
    _t('previsualizacion.etiqueta_acceso'),
    _t('previsualizacion.etiqueta_visibilidad'),
    _t('previsualizacion.etiqueta_reubicacion'),
  ];

  @override
  void initState() {
    super.initState();
    widget.archivo?.readAsBytes().then((b) {
      if (mounted) setState(() => _bytes = b);
    });
    final token = ref.read(sesionControllerProvider).token;
    if (token != null) {
      BriefsRepo(token: token)
          .obtener(widget.briefId)
          .then((b) {
            if (mounted) setState(() => _tituloBrief = b.titulo);
          })
          .catchError((_) {});
    }
  }

  Future<void> _descartar() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(_t('previsualizacion.descartar_titulo')),
        content: Text(_t('previsualizacion.descartar_detalle')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(_t('comun.cancelar')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(_t('previsualizacion.descartar_boton')),
          ),
        ],
      ),
    );
    if (confirmar == true && mounted) context.pop();
  }

  Future<void> _usarFoto() async {
    final bytes = _bytes;
    if (bytes == null) return;
    setState(() => _guardando = true);

    final mime = widget.archivo?.mimeType ?? 'image/jpeg';
    final nombre = _notaControlador.text.trim().isNotEmpty
        ? _notaControlador.text.trim()
        : 'Pieza capturada ${DateTime.now().toIso8601String()}';
    // Huella SHA-256 del archivo -- mismo concepto que vision_resultados.huella_imagen
    // en ms-ia (dedupe/auditoria), calculada aqui porque el servicio nunca ve los bytes.
    final huella = sha256.convert(bytes).toString();

    // Escritura real en la bandeja de salida local (outbox offline-first, ver
    // 01-arquitectura.md "Offline y conflictos"). El drenado real lo hace
    // SincronizacionBackground: en segundo plano (workmanager) o aqui mismo si
    // ya hay red, sin bloquear al usuario. Los bytes viajan en base64 dentro de la
    // propia fila (ver SincronizadorService) para no depender de que el archivo
    // temporal siga existiendo cuando se drene la cola mas tarde.
    final clave = const Uuid().v4();
    await BandejaSalidaDao().encolar(
      ElementoBandeja(
        claveIdempotencia: clave,
        tipo: 'pieza_subida',
        carga: jsonEncode({
          'briefId': widget.briefId,
          'nombre': nombre,
          'tipo': 'imagen',
          'mime': mime,
          'tamano': bytes.length,
          'huellaImagen': huella,
          'etiquetas': _etiquetas.toList(),
          'archivoBase64': base64Encode(bytes),
        }),
        estado: 'pendiente',
        intentos: 0,
        creadoEn: DateTime.now(),
      ),
    );

    if (kIsWeb) {
      // Sin workmanager en web: se drena inline, igual que haria el background task.
      final token = ref.read(sesionControllerProvider).token;
      if (token != null)
        unawaited(SincronizadorService(token: token).drenarPendientes());
    } else {
      unawaited(SincronizacionBackground.sincronizarAhora());
    }

    if (!mounted) return;
    setState(() => _guardando = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(_t('previsualizacion.foto_adjuntada'))),
    );
    context.push('/validacion-ia/${widget.briefId}', extra: bytes);
  }

  @override
  void dispose() {
    _notaControlador.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    ref.watch(idiomaControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_t('previsualizacion.titulo')),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: _descartar,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AspectRatio(
            aspectRatio: 9 / 16,
            child: Stack(
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: _bytes != null
                        ? Image.memory(_bytes!, fit: BoxFit.cover)
                        : Container(
                            color: c.plano,
                            child: Icon(
                              Icons.image_outlined,
                              color: c.textoTenue,
                              size: 48,
                            ),
                          ),
                  ),
                ),
                Positioned(
                  left: 10,
                  top: 10,
                  child: _chip(_t('previsualizacion.jpg_alta_resolucion')),
                ),
                Positioned(right: 10, top: 10, child: _chip('1080 × 1920')),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${_t('previsualizacion.para')}: ${_tituloBrief ?? '...'}',
                  style: TextStyle(color: c.texto, fontWeight: FontWeight.w700),
                ),
              ),
              _chip(_t('previsualizacion.pop_totem')),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _notaControlador,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: _t('previsualizacion.nota_hint'),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _etiquetasDisponibles.map((e) {
              final activo = _etiquetas.contains(e);
              return FilterChip(
                label: Text(e),
                selected: activo,
                onSelected: (sel) => setState(
                  () => sel ? _etiquetas.add(e) : _etiquetas.remove(e),
                ),
                selectedColor: c.marcaSuave,
                labelStyle: TextStyle(
                  color: activo ? c.marca : c.textoSuave,
                  fontSize: 12,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.pop(),
                  child: Text(_t('previsualizacion.volver_tomar')),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: _guardando ? null : _usarFoto,
                  child: Text(
                    _guardando
                        ? _t('previsualizacion.guardando')
                        : _t('previsualizacion.usar_foto'),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chip(String texto) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black54,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        texto,
        style: const TextStyle(color: Colors.white, fontSize: 10),
      ),
    );
  }
}
