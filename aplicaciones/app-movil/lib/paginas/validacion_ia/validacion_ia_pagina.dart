import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/tarjeta_ao.dart';
import '../../core/i18n/idioma_controller.dart';
import '../../core/i18n/textos.dart';
import '../../core/ia_local/detector_logo_local.dart';
import '../../core/tema/colores_ao.dart';

/// Validacion con IA 100% local: corre DetectorLogoLocal (YOLOv8n afinado para el logo
/// de AdOrbit, exportado a ONNX -- ver D21/D22 en documentacion/05-decisiones-y-pendientes.md)
/// sobre la foto recien capturada, en el propio dispositivo y sin conexion. El resultado
/// de "logo detectado" es real; "texto legible" y "manual de marca" no se evaluan aqui
/// (harian falta OCR y un detector de paleta/tipografia que no existen todavia) y se
/// muestran como tales en vez de inventar un resultado.
class ValidacionIaPagina extends ConsumerStatefulWidget {
  const ValidacionIaPagina({
    super.key,
    required this.briefId,
    this.bytesImagen,
  });

  final String briefId;
  final Uint8List? bytesImagen;

  @override
  ConsumerState<ValidacionIaPagina> createState() => _ValidacionIaPaginaState();
}

class _ValidacionIaPaginaState extends ConsumerState<ValidacionIaPagina> {
  bool _analizando = true;
  DeteccionLogo? _resultado;
  String? _errorAnalisis;

  String _t(String clave) =>
      Textos.t(ref.read(idiomaControllerProvider), clave);

  @override
  void initState() {
    super.initState();
    _analizar();
  }

  Future<void> _analizar() async {
    final bytes = widget.bytesImagen;
    if (bytes == null) {
      setState(() {
        _analizando = false;
        _errorAnalisis = _t('validacion.sin_foto');
      });
      return;
    }
    setState(() {
      _analizando = true;
      _errorAnalisis = null;
      _resultado = null;
    });
    try {
      final resultado = await DetectorLogoLocal.instancia.detectar(bytes);
      if (!mounted) return;
      setState(() {
        _resultado = resultado;
        _analizando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorAnalisis = _t('validacion.error_analizar');
        _analizando = false;
      });
    }
  }

  /// A donde volver si no hay nada que hacer pop (ver _salir). Evita que el usuario quede
  /// atascado en esta pantalla si el stack de navegacion no tiene una ruta anterior --
  /// visto en real: ni la flecha ni el gesto/boton del sistema sacaban de aqui.
  void _salir() {
    context.go('/briefs/${widget.briefId}');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    ref.watch(idiomaControllerProvider);
    final detecta = _resultado?.detectaLogo ?? false;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _salir();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_t('validacion.titulo')),
          leading: IconButton(
            tooltip: _t('brief.volver'),
            icon: const Icon(Icons.arrow_back),
            onPressed: _salir,
          ),
          actions: [
            IconButton(
              tooltip: _t('validacion.reanalizar_tooltip'),
              icon: const Icon(Icons.refresh),
              onPressed: _analizando ? null : _analizar,
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _visorAnalizado(context),
            const SizedBox(height: 16),
            TarjetaAo(
              child: Row(
                children: [
                  Icon(Icons.phone_iphone, color: c.marca),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _t('validacion.analizado_dispositivo'),
                          style: TextStyle(
                            color: c.texto,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _t('validacion.inferencia_detalle'),
                          style: TextStyle(color: c.textoSuave, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_analizando)
              TarjetaAo(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.4),
                      ),
                      const SizedBox(width: 12),
                      Text(_t('validacion.analizando')),
                    ],
                  ),
                ),
              )
            else if (_errorAnalisis != null)
              _bannerError(context, _errorAnalisis!)
            else ...[
              _diagnostico(context),
              const SizedBox(height: 16),
              detecta ? _bannerExito(context) : _bannerAdvertencia(context),
            ],
            const SizedBox(height: 18),
            if (!_analizando) ...[
              if (widget.bytesImagen != null) ...[
                Text(
                  _t('validacion.estado_cola'),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.textoSuave, fontSize: 12),
                ),
                const SizedBox(height: 10),
              ],
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.go('/briefs/${widget.briefId}'),
                  child: Text(_t('validacion.volver_brief')),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _visorAnalizado(BuildContext context) {
    final c = context.aoColores;
    final bytes = widget.bytesImagen;
    final resultado = _resultado;
    final aspecto = (resultado != null && resultado.altoImagen > 0)
        ? resultado.anchoImagen / resultado.altoImagen
        : 9 / 16;

    return AspectRatio(
      aspectRatio: aspecto,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (bytes != null)
              Image.memory(bytes, fit: BoxFit.fill)
            else
              Container(
                color: c.plano,
                child: Icon(
                  Icons.image_outlined,
                  color: c.textoTenue,
                  size: 48,
                ),
              ),
            if (resultado?.cajaFraccion != null)
              LayoutBuilder(
                builder: (context, restricciones) {
                  final caja = resultado!.cajaFraccion!;
                  final ancho = restricciones.maxWidth;
                  final alto = restricciones.maxHeight;
                  return Positioned(
                    left: caja[0] * ancho,
                    top: caja[1] * alto,
                    width: (caja[2] - caja[0]) * ancho,
                    height: (caja[3] - caja[1]) * alto,
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.greenAccent, width: 2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  );
                },
              ),
            if (_analizando || _resultado != null)
              Positioned(
                left: 10,
                top: 10,
                child: _etiquetaFlotante(
                  _analizando
                      ? _t('validacion.analizando_badge')
                      : (_resultado?.detectaLogo ?? false)
                      ? _t('validacion.logo_detectado_badge')
                      : _t('validacion.logo_no_detectado_badge'),
                  _analizando
                      ? c.neutro
                      : ((_resultado?.detectaLogo ?? false) ? c.ok : c.aviso),
                ),
              ),
            if (_resultado != null)
              Positioned(
                right: 10,
                top: 10,
                child: _etiquetaFlotante(
                  '${(_resultado!.confianza * 100).toStringAsFixed(0)}% ${_t('validacion.confianza_sufijo')}',
                  c.info,
                ),
              ),
            Positioned(
              left: 10,
              bottom: 10,
              child: _etiquetaFlotante(
                'yolo_logo_adorbit · ONNX',
                Colors.black54,
              ),
            ),
            if (_resultado != null && _resultado!.anchoImagen > 0)
              Positioned(
                right: 10,
                bottom: 10,
                child: _etiquetaFlotante(
                  '${_resultado!.anchoImagen} × ${_resultado!.altoImagen} px',
                  Colors.black54,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _etiquetaFlotante(String texto, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        texto,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _diagnostico(BuildContext context) {
    final c = context.aoColores;
    final resultado = _resultado!;
    final porcentaje = resultado.confianza;
    final color = resultado.detectaLogo ? c.ok : c.aviso;
    return TarjetaAo(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _t('validacion.confianza_modelo'),
                  style: TextStyle(color: c.texto, fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                '${(porcentaje * 100).toStringAsFixed(0)}%',
                style: TextStyle(
                  color: color,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          Text(
            '${_t('validacion.umbral_modelo')}: ${(DetectorLogoLocal.umbralConfianza * 100).toStringAsFixed(0)}%',
            style: TextStyle(color: c.textoSuave, fontSize: 12),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: porcentaje.clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: c.plano,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          const Divider(height: 24),
          Text(
            _t('validacion.diagnostico_visual'),
            style: TextStyle(color: c.texto, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          _itemDiagnostico(
            context,
            _t('validacion.logo_detectado_item'),
            resultado.detectaLogo
                ? _t('validacion.logo_reconocido_detalle')
                : _t('validacion.logo_no_reconocido_detalle'),
            resultado.detectaLogo,
          ),
          _itemDiagnostico(
            context,
            _t('validacion.texto_legible'),
            _t('validacion.no_evaluado'),
            null,
          ),
          _itemDiagnostico(
            context,
            _t('validacion.cumple_manual_marca'),
            _t('validacion.no_evaluado'),
            null,
          ),
        ],
      ),
    );
  }

  Widget _itemDiagnostico(
    BuildContext context,
    String titulo,
    String detalle,
    bool? ok,
  ) {
    final c = context.aoColores;
    final (icono, color) = switch (ok) {
      true => (Icons.check_circle, c.ok),
      false => (Icons.cancel, c.peligro),
      null => (Icons.remove_circle_outline, c.textoTenue),
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(icono, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(titulo, style: TextStyle(color: c.texto, fontSize: 13)),
          ),
          Text(detalle, style: TextStyle(color: c.textoSuave, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _bannerExito(BuildContext context) {
    final c = context.aoColores;
    return TarjetaAo(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Icon(Icons.check_circle, color: c.ok),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _t('validacion.logo_reconocido_titulo'),
                  style: TextStyle(color: c.ok, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  _t('validacion.logo_reconocido_banner'),
                  style: TextStyle(color: c.textoSuave, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bannerAdvertencia(BuildContext context) {
    final c = context.aoColores;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TarjetaAo(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: c.aviso),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _t('validacion.revisa_pieza_titulo'),
                      style: TextStyle(
                        color: c.aviso,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _t('validacion.revisa_pieza_detalle'),
                      style: TextStyle(color: c.textoSuave, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: c.infoFondo,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            _t('validacion.consejo'),
            style: TextStyle(color: c.info, fontSize: 12),
          ),
        ),
      ],
    );
  }

  Widget _bannerError(BuildContext context, String mensaje) {
    final c = context.aoColores;
    return TarjetaAo(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: c.peligro),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _t('validacion.no_se_pudo_analizar'),
                  style: TextStyle(
                    color: c.peligro,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  mensaje,
                  style: TextStyle(color: c.textoSuave, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
