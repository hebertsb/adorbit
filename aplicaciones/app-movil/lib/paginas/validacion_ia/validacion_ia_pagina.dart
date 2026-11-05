import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/tarjeta_ao.dart';
import '../../core/tema/colores_ao.dart';

/// Resultado de la validacion de IA local (TFLite/ML Kit) tras capturar una pieza.
/// El selector "Alta/Baja" de abajo es solo para esta demo (igual que el selector de
/// escenario en saga-estado del portal web) — en real vendria del resultado del modelo.
/// TODO Hebert/ms-ia: cargar modelo TFLite real y reemplazar el selector por el resultado
/// efectivo de la inferencia on-device.
class ValidacionIaPagina extends StatefulWidget {
  const ValidacionIaPagina({super.key, required this.briefId});

  final String briefId;

  @override
  State<ValidacionIaPagina> createState() => _ValidacionIaPaginaState();
}

class _ValidacionIaPaginaState extends State<ValidacionIaPagina> {
  bool _altaConfianza = true;
  bool _enviando = false;
  String? _estadoEnvio;

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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Validación con IA'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(
              child: SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: true, label: Text('Alta')),
                  ButtonSegment(value: false, label: Text('Baja')),
                ],
                selected: {_altaConfianza},
                onSelectionChanged: (s) => setState(() => _altaConfianza = s.first),
              ),
            ),
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
                        _altaConfianza ? 'Analizado en tu dispositivo · Sin conexión a internet' : 'Procesado en este dispositivo',
                        style: TextStyle(color: c.texto, fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _altaConfianza
                            ? 'Procesamiento seguro en memoria local, máxima privacidad'
                            : 'Sin subida de datos ni consumo de internet. Modelo neuronal perimetral en memoria caché.',
                        style: TextStyle(color: c.textoSuave, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _altaConfianza ? _diagnosticoAlta(context) : _diagnosticoBaja(context),
          const SizedBox(height: 16),
          _altaConfianza ? _bannerExito(context) : _bannerAdvertencia(context),
          const SizedBox(height: 18),
          if (_altaConfianza)
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
    return AspectRatio(
      aspectRatio: 9 / 16,
      child: Stack(
        children: [
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(color: c.plano, borderRadius: BorderRadius.circular(16)),
              child: Icon(Icons.image_outlined, color: c.textoTenue, size: 48),
            ),
          ),
          Positioned(
            left: 10,
            top: 10,
            child: _etiquetaFlotante(
              _altaConfianza ? 'CAPTURA ANALIZADA' : 'BAJA CONFIANZA',
              _altaConfianza ? c.info : c.aviso,
            ),
          ),
          Positioned(
            right: 10,
            top: 10,
            child: _etiquetaFlotante(_altaConfianza ? 'NPU Local' : '9:16 · Roll-up vertical', c.ok),
          ),
          if (!_altaConfianza) ...[
            Positioned(
              left: 40,
              top: 70,
              child: _cajaDeteccion('Logo ?', Colors.redAccent),
            ),
            Positioned(
              right: 30,
              top: 140,
              child: _cajaDeteccion('Paleta cromática · ΔE > 8.4', Colors.amber),
            ),
          ],
          Positioned(
            left: 10,
            bottom: 10,
            child: _etiquetaFlotante(
              _altaConfianza ? 'Soporte tótem · Tienda Retail' : 'Local Vision v2.4',
              Colors.black54,
            ),
          ),
          if (!_altaConfianza)
            Positioned(
              right: 10,
              bottom: 10,
              child: _etiquetaFlotante('1440 × 2560 px', Colors.black54),
            ),
        ],
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

  Widget _cajaDeteccion(String texto, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(border: Border.all(color: color, width: 1.5), borderRadius: BorderRadius.circular(4)),
      child: Text(texto, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w700)),
    );
  }

  Widget _diagnosticoAlta(BuildContext context) {
    final c = context.aoColores;
    return TarjetaAo(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Confianza del análisis', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
              ),
              Text('94%', style: TextStyle(color: c.ok, fontSize: 22, fontWeight: FontWeight.w800)),
            ],
          ),
          Text('Tolerancia mínima superada (>85%)', style: TextStyle(color: c.textoSuave, fontSize: 12)),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: 0.94,
              minHeight: 8,
              backgroundColor: c.plano,
              valueColor: AlwaysStoppedAnimation(c.ok),
            ),
          ),
          const SizedBox(height: 4),
          Text('Umbral calificado 85%', style: TextStyle(color: c.textoTenue, fontSize: 11)),
          const Divider(height: 24),
          Text('Diagnóstico visual', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          _itemDiagnostico(context, 'Logo detectado', 'Cabecera legible de marca', true),
          _itemDiagnostico(context, 'Texto detectado', 'Legibilidad clara y óptima', true),
          _itemDiagnostico(context, 'Cumple manual de marca', 'Cromática y tipografía acordes', true),
        ],
      ),
    );
  }

  Widget _diagnosticoBaja(BuildContext context) {
    final c = context.aoColores;
    return TarjetaAo(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Diagnóstico de conformidad',
                    style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: c.neutroFondo, borderRadius: BorderRadius.circular(999)),
                child: Text('3 comprobaciones', style: TextStyle(color: c.neutro, fontSize: 11)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text('58%', style: TextStyle(color: c.aviso, fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: c.avisoFondo, borderRadius: BorderRadius.circular(999)),
                child: Text('BAJA', style: TextStyle(color: c.aviso, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: 0.58,
                  minHeight: 8,
                  backgroundColor: c.plano,
                  valueColor: AlwaysStoppedAnimation(c.aviso),
                ),
              ),
              Positioned(
                left: 0.75 * 260,
                child: Container(width: 2, height: 8, color: c.texto),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('▲ 75% Aprobado auto', style: TextStyle(color: c.textoTenue, fontSize: 11)),
          const Divider(height: 24),
          _itemDiagnostico(context, 'Logo corporativo', 'No definido', false),
          _itemDiagnostico(context, 'Texto legible (OCR)', 'Sí (contraste parcial)', true),
          _itemDiagnostico(context, 'Manual de marca', 'No cumple manual', null),
        ],
      ),
    );
  }

  Widget _itemDiagnostico(BuildContext context, String titulo, String detalle, bool? ok) {
    final c = context.aoColores;
    final (icono, color) = switch (ok) {
      true => (Icons.check_circle, c.ok),
      false => (Icons.cancel, c.peligro),
      null => (Icons.error, c.aviso),
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
                Text('Lista para subir', style: TextStyle(color: c.ok, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  'La pieza cumple con las pautas visuales requeridas por la campaña. Puedes subir la pieza al sistema inmediatamente.',
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
                      'El modelo local detectó discrepancias con la paleta de marca y ubicación de logo. Esta validación es puramente orientativa y no bloquea tu envío.',
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
            'Consejo: Da dos pasos hacia atrás para capturar el banner entero con iluminación uniforme y evitar reflejos en el logo.',
            style: TextStyle(color: c.info, fontSize: 12),
          ),
        ),
      ],
    );
  }
}
