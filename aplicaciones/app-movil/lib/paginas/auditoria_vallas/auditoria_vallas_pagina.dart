import 'dart:typed_data';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';

import '../../compartido/badge_confianza.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/i18n/idioma_controller.dart';
import '../../core/i18n/textos.dart';
import '../../core/red/api_excepcion.dart';
import '../../core/ia_local/detector_logo_local.dart';
import '../../core/datos_locales/bandeja_salida_dao.dart';
import '../../core/sync/sincronizador_service.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/brief.dart';
import '../../datos/modelos/vision_resultado.dart';
import '../../datos/repos/briefs_repo.dart';

enum _EstadoFisico { bueno, deterioro, danado }

/// Audita una pieza real con el modelo ONNX local. La foto nunca sale del dispositivo:
/// solo el resultado y sus metadatos se encolan y registran en ms-creatividades.
class AuditoriaVallasPagina extends ConsumerStatefulWidget {
  const AuditoriaVallasPagina({super.key});

  @override
  ConsumerState<AuditoriaVallasPagina> createState() =>
      _AuditoriaVallasPaginaState();
}

class _AuditoriaVallasPaginaState extends ConsumerState<AuditoriaVallasPagina> {
  Future<List<Brief>>? _futuroBriefs;
  Brief? _briefSeleccionado;
  List<Pieza> _piezas = [];
  Pieza? _piezaSeleccionada;
  bool _cargandoPiezas = false;

  _EstadoFisico _estadoSeleccionado = _EstadoFisico.bueno;
  Uint8List? _fotoBytes;
  DateTime? _fotoFecha;

  bool _analizando = false;
  VisionResultado? _resultado;
  String? _errorAnalisis;

  String _t(String clave) =>
      Textos.t(ref.read(idiomaControllerProvider), clave);

  BriefsRepo get _repoBriefs =>
      BriefsRepo(token: ref.read(sesionControllerProvider).token!);

  @override
  void initState() {
    super.initState();
    _futuroBriefs = _repoBriefs.listar();
  }

  Future<void> _seleccionarBrief(Brief brief) async {
    setState(() {
      _briefSeleccionado = brief;
      _piezas = [];
      _piezaSeleccionada = null;
      _resultado = null;
      _errorAnalisis = null;
      _cargandoPiezas = true;
    });
    try {
      final piezas = await _repoBriefs.listarPiezas(brief.id);
      if (!mounted) return;
      final aprobada = piezas.where((p) => p.estado == EstadoPieza.aprobada);
      setState(() {
        _piezas = piezas;
        _piezaSeleccionada = piezas.isEmpty
            ? null
            : (aprobada.isNotEmpty ? aprobada.first : piezas.first);
        _cargandoPiezas = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _cargandoPiezas = false);
    }
  }

  Future<void> _tomarFoto() async {
    final archivo = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 90,
    );
    if (archivo == null) return;
    final bytes = await archivo.readAsBytes();
    if (!mounted) return;
    setState(() {
      _fotoBytes = bytes;
      _fotoFecha = DateTime.now();
      _resultado = null;
      _errorAnalisis = null;
    });
  }

  Future<void> _analizar() async {
    final pieza = _piezaSeleccionada;
    final bytes = _fotoBytes;
    final token = ref.read(sesionControllerProvider).token;
    if (pieza == null || bytes == null || token == null) return;

    setState(() {
      _analizando = true;
      _errorAnalisis = null;
    });
    try {
      final reloj = Stopwatch()..start();
      final deteccion = await DetectorLogoLocal.instancia.detectar(bytes);
      reloj.stop();
      final ahora = DateTime.now();
      final resultado = VisionResultado(
        id: const Uuid().v4(),
        piezaId: pieza.id,
        campanaId: pieza.campanaId,
        detectaLogo: deteccion.detectaLogo,
        confianza: deteccion.confianza,
        manualMarcaOk: _estadoSeleccionado == _EstadoFisico.bueno,
        duracionMs: reloj.elapsedMilliseconds,
      );
      await BandejaSalidaDao().encolar(
        ElementoBandeja(
          claveIdempotencia: const Uuid().v4(),
          tipo: 'validacion_local',
          carga: jsonEncode({
            'piezaId': pieza.id,
            'nombre': 'Auditoría local · ${pieza.nombre}',
            'resultado': deteccion.detectaLogo && _estadoSeleccionado == _EstadoFisico.bueno
                ? 'ok'
                : deteccion.detectaLogo
                    ? 'observada'
                    : 'rechazada',
            'detalles': {
              'modelo': 'yolo_logo_adorbit.onnx',
              'detecta_logo': deteccion.detectaLogo,
              'confianza': deteccion.confianza,
              'estado_fisico': _estadoSeleccionado.name,
              'duracion_ms': reloj.elapsedMilliseconds,
              'capturado_en': ahora.toUtc().toIso8601String(),
              'procesamiento': 'on_device',
            },
          }),
          estado: 'pendiente',
          intentos: 0,
          creadoEn: ahora,
        ),
      );
      await SincronizadorService(token: token).drenarPendientes();
      if (!mounted) return;
      setState(() {
        _resultado = resultado;
        _analizando = false;
      });
    } on ApiExcepcion catch (e) {
      if (!mounted) return;
      setState(() {
        _errorAnalisis = e.mensaje;
        _analizando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorAnalisis = '$e';
        _analizando = false;
      });
    }
  }

  String _formatearFecha(DateTime fecha) {
    final dos = (int n) => n.toString().padLeft(2, '0');
    return '${dos(fecha.day)}/${dos(fecha.month)}/${fecha.year} ${dos(fecha.hour)}:${dos(fecha.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    ref.watch(idiomaControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text(_t('auditoria.titulo'))),
      body: FutureBuilder<List<Brief>>(
        future: _futuroBriefs,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final briefs = snapshot.data ?? const <Brief>[];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TarjetaAo(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _t('auditoria.elegir_pieza'),
                      style: TextStyle(
                        color: c.texto,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<Brief>(
                      initialValue: _briefSeleccionado,
                      isExpanded: true,
                      hint: Text(_t('auditoria.elegir_brief_hint')),
                      items: briefs
                          .map(
                            (b) => DropdownMenuItem(
                              value: b,
                              child: Text(b.titulo),
                            ),
                          )
                          .toList(),
                      onChanged: (b) => b != null ? _seleccionarBrief(b) : null,
                    ),
                    if (_cargandoPiezas) ...[
                      const SizedBox(height: 10),
                      const Center(child: CircularProgressIndicator()),
                    ] else if (_briefSeleccionado != null) ...[
                      const SizedBox(height: 10),
                      if (_piezas.isEmpty)
                        Text(
                          _t('brief.sin_piezas'),
                          style: TextStyle(color: c.textoSuave),
                        )
                      else
                        DropdownButtonFormField<Pieza>(
                          initialValue: _piezaSeleccionada,
                          isExpanded: true,
                          items: _piezas
                              .map(
                                (p) => DropdownMenuItem(
                                  value: p,
                                  child: Text(
                                    '${p.nombre} · v${p.versionNumero} · ${p.estado.etiqueta(ref.read(idiomaControllerProvider))}',
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (p) => setState(() {
                            _piezaSeleccionada = p;
                            _resultado = null;
                            _errorAnalisis = null;
                          }),
                        ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 14),
              TarjetaAo(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      onTap: _tomarFoto,
                      child: AspectRatio(
                        aspectRatio: 16 / 10,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: _fotoBytes != null
                              ? Image.memory(_fotoBytes!, fit: BoxFit.cover)
                              : Container(
                                  color: c.plano,
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.camera_alt_outlined,
                                        color: c.textoTenue,
                                        size: 36,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        _t('auditoria.tomar_foto'),
                                        style: TextStyle(
                                          color: c.textoTenue,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _fotoFecha != null
                          ? '${_t('auditoria.captura_reciente_prefijo')} · ${_formatearFecha(_fotoFecha!)}'
                          : _t('auditoria.sin_captura'),
                      style: TextStyle(color: c.textoSuave, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              TarjetaAo(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _t('auditoria.estado_fisico'),
                      style: TextStyle(
                        color: c.texto,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: _EstadoFisico.values.map((e) {
                        final activo = e == _estadoSeleccionado;
                        final (color, fondo, etiqueta) = switch (e) {
                          _EstadoFisico.bueno => (
                            c.ok,
                            c.okFondo,
                            _t('auditoria.estado_bueno'),
                          ),
                          _EstadoFisico.deterioro => (
                            c.aviso,
                            c.avisoFondo,
                            _t('auditoria.estado_deterioro'),
                          ),
                          _EstadoFisico.danado => (
                            c.peligro,
                            c.peligroFondo,
                            _t('auditoria.estado_danado'),
                          ),
                        };
                        return ChoiceChip(
                          label: Text(etiqueta),
                          selected: activo,
                          onSelected: (_) =>
                              setState(() => _estadoSeleccionado = e),
                          selectedColor: fondo,
                          labelStyle: TextStyle(
                            color: activo ? color : c.textoSuave,
                            fontSize: 12,
                          ),
                          side: BorderSide(color: activo ? color : c.borde),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              if (_errorAnalisis != null)
                TarjetaAo(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: c.peligro),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _errorAnalisis!,
                          style: TextStyle(color: c.peligro, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                )
              else if (_resultado != null)
                TarjetaAo(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              _t('auditoria.pieza_coincide'),
                              style: TextStyle(
                                color: c.texto,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          BadgeConfianza(
                            confianza: _resultado!.confianza,
                            compacto: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _resultado!.detectaLogo
                            ? _t('validacion.logo_reconocido_detalle')
                            : _t('validacion.logo_no_reconocido_detalle'),
                        style: TextStyle(color: c.textoSuave, fontSize: 12),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Analizado en este dispositivo · resultado encolado para sincronización',
                        style: TextStyle(color: c.textoTenue, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed:
                      (_fotoBytes == null ||
                          _piezaSeleccionada == null ||
                          _analizando)
                      ? null
                      : _analizar,
                  child: Text(
                    _analizando
                        ? _t('auditoria.analizando')
                        : _t('auditoria.analizar'),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
