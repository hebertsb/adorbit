import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/tarjeta_ao.dart';
import '../../core/ia_local/detector_logo_local.dart';
import '../../core/tema/colores_ao.dart';

/// Validacion con IA 100% local: corre DetectorLogoLocal (YOLOv8n afinado para el logo
/// de AdOrbit, exportado a ONNX -- ver D21/D22 en documentacion/05-decisiones-y-pendientes.md)
/// sobre la foto recien capturada, en el propio dispositivo y sin conexion. El resultado
/// de "logo detectado" es real; "texto legible" y "manual de marca" no se evaluan aqui
/// (harian falta OCR y un detector de paleta/tipografia que no existen todavia) y se
/// muestran como tales en vez de inventar un resultado.
class ValidacionIaPagina extends StatefulWidget {
  const ValidacionIaPagina({super.key, required this.briefId, this.bytesImagen});

  final String briefId;
  final Uint8List? bytesImagen;

  @override
  State<ValidacionIaPagina> createState() => _ValidacionIaPaginaState();
}

class _ValidacionIaPaginaState extends State<ValidacionIaPagina> {
  bool _analizando = true;
  DeteccionLogo? _resultado;
  String? _errorAnalisis;
  bool _enviando = false;
  String? _estadoEnvio;

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
        _errorAnalisis = 'Esta pantalla necesita la foto recien capturada.';
      });
      return;
    }
    setState(() {
      _analizando = true;
      _errorAnalisis = null;
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
        _errorAnalisis = 'No se pudo analizar la foto en este dispositivo.';
        _analizando = false;
      });
    }
  }

  Future<void> _subir(String mensajeFinal) async {
    setState(() {
      _enviando = true;
      _estadoEnvio = 'Encolando archivo...';
    });
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    setState(() {
      _enviando = false;
      _estadoEnvio = mensajeFinal;
    });
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    context.go('/briefs/${widget.briefId}');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final detecta = _resultado?.detectaLogo ?? false;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Validación con IA'),
        actions: [
          IconButton(
            tooltip: 'Volver a analizar',
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
                        'Analizado en tu dispositivo · Sin conexión a internet',
                        style: TextStyle(color: c.texto, fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Inferencia on-device con el modelo de logo de AdOrbit (ONNX Runtime), sin subir la imagen a ningún servidor',
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
            const TarjetaAo(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  children: [
                    SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.4)),
                    SizedBox(width: 12),
                    Text('Analizando con IA local...'),
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
          if (_analizando)
            const SizedBox.shrink()
          else if (detecta)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.pop(),
                    child: const Text('Volver a tomar foto'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _enviando ? null : () => _subir('Pieza subida correctamente'),
                    child: Text(_enviando ? (_estadoEnvio ?? '...') : 'Subir pieza'),
                  ),
                ),
              ],
            )
          else ...[
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => context.pop(),
                child: const Text('Volver a tomar foto'),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _enviando ? null : () => _subir('Enviado a revisión manual'),
                child: Text(_enviando ? (_estadoEnvio ?? '...') : 'Subir de todas formas'),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Se sincronizará automáticamente cuando recuperes cobertura.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textoTenue, fontSize: 11),
            ),
          ],
        ],
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
                child: Icon(Icons.image_outlined, color: c.textoTenue, size: 48),
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
            Positioned(
              left: 10,
              top: 10,
              child: _etiquetaFlotante(
                _analizando
                    ? 'ANALIZANDO...'
                    : (_resultado?.detectaLogo ?? false)
                        ? 'LOGO DETECTADO'
                        : 'LOGO NO DETECTADO',
                _analizando ? c.neutro : ((_resultado?.detectaLogo ?? false) ? c.ok : c.aviso),
              ),
            ),
            if (_resultado != null)
              Positioned(
                right: 10,
                top: 10,
                child: _etiquetaFlotante(
                  '${(_resultado!.confianza * 100).toStringAsFixed(0)}% confianza',
                  c.info,
                ),
              ),
            Positioned(
              left: 10,
              bottom: 10,
              child: _etiquetaFlotante('yolo_logo_adorbit · ONNX', Colors.black54),
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
      decoration: BoxDecoration(color: color.withValues(alpha: 0.9), borderRadius: BorderRadius.circular(999)),
      child: Text(texto, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
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
                child: Text('Confianza del modelo de logo', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
              ),
              Text('${(porcentaje * 100).toStringAsFixed(0)}%',
                  style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w800)),
            ],
          ),
          Text(
            'Umbral del modelo: ${(DetectorLogoLocal.umbralConfianza * 100).toStringAsFixed(0)}%',
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
          Text('Diagnóstico visual', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          _itemDiagnostico(
            context,
            'Logo detectado',
            resultado.detectaLogo ? 'Cabecera de marca reconocida' : 'No se reconoció el logo en la foto',
            resultado.detectaLogo,
          ),
          _itemDiagnostico(context, 'Texto legible (OCR)', 'No evaluado en este dispositivo', null),
          _itemDiagnostico(context, 'Cumple manual de marca', 'No evaluado en este dispositivo', null),
        ],
      ),
    );
  }

  Widget _itemDiagnostico(BuildContext context, String titulo, String detalle, bool? ok) {
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
          Expanded(child: Text(titulo, style: TextStyle(color: c.texto, fontSize: 13))),
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
                Text('Logo reconocido', style: TextStyle(color: c.ok, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  'El modelo local reconoció el logo de AdOrbit en la pieza. Puedes subirla al sistema.',
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
                    Text('Revisa la pieza antes de subir — riesgo de auditoría',
                        style: TextStyle(color: c.aviso, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                      'El modelo local no reconoció el logo de AdOrbit con suficiente confianza. Esta validación es orientativa y no bloquea tu envío.',
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
          decoration: BoxDecoration(color: c.infoFondo, borderRadius: BorderRadius.circular(12)),
          child: Text(
            'Consejo: acércate o encuadra mejor el logo, con buena luz y sin reflejos.',
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
                Text('No se pudo analizar', style: TextStyle(color: c.peligro, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(mensaje, style: TextStyle(color: c.textoSuave, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
