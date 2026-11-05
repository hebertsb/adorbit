import 'package:flutter/material.dart';

import '../../compartido/badge_confianza.dart';
import '../../compartido/chip_estado.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/auditoria.dart';
import '../../datos/repos/auditoria_repo.dart';

class AuditoriaVallasPagina extends StatefulWidget {
  const AuditoriaVallasPagina({super.key});

  @override
  State<AuditoriaVallasPagina> createState() => _AuditoriaVallasPaginaState();
}

class _AuditoriaVallasPaginaState extends State<AuditoriaVallasPagina> {
  final _repo = AuditoriaRepo();
  EstadoFisicoValla _estadoSeleccionado = EstadoFisicoValla.bueno;
  final _notaControlador = TextEditingController();
  bool _guardando = false;

  Future<void> _registrar() async {
    setState(() => _guardando = true);
    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    setState(() => _guardando = false);
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Auditoría guardada con éxito')));
  }

  @override
  void dispose() {
    _notaControlador.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final valla = _repo.obtenerVallaActual();

    return Scaffold(
      appBar: AppBar(title: const Text('Auditoría de valla')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TarjetaAo(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    _etiqueta(context, valla.cliente),
                    _etiqueta(context, 'Cód. #${valla.codigo}'),
                  ],
                ),
                const SizedBox(height: 8),
                Text(valla.campana, style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(valla.descripcion, style: TextStyle(color: c.textoSuave, fontSize: 13)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          TarjetaAo(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 16 / 10,
                  child: Container(
                    decoration: BoxDecoration(color: c.plano, borderRadius: BorderRadius.circular(12)),
                    child: Icon(Icons.image_outlined, color: c.textoTenue, size: 40),
                  ),
                ),
                const SizedBox(height: 8),
                Text('Captura reciente · Hoy 10:24', style: TextStyle(color: c.textoSuave, fontSize: 12)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(Icons.memory, size: 14, color: c.marca),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'Analizado en tu dispositivo · Visión perimetral',
                        style: TextStyle(color: c.textoSuave, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          TarjetaAo(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Diagnóstico de inspección', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Text('Pieza coincide con la aprobada', style: TextStyle(color: c.texto, fontSize: 13)),
                    ),
                    BadgeConfianza(confianza: valla.coincidenciaVisual, compacto: true),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Campaña verificada contra el máster de impresión oficial',
                  style: TextStyle(color: c.textoTenue, fontSize: 11),
                ),
                const SizedBox(height: 14),
                Text('Estado físico', style: TextStyle(color: c.texto, fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: EstadoFisicoValla.values.map((e) {
                    final activo = e == _estadoSeleccionado;
                    final (color, fondo) = switch (e) {
                      EstadoFisicoValla.bueno => (c.ok, c.okFondo),
                      EstadoFisicoValla.deterioro => (c.aviso, c.avisoFondo),
                      EstadoFisicoValla.danado => (c.peligro, c.peligroFondo),
                    };
                    return ChoiceChip(
                      label: Text('${e.etiqueta} · ${e.detalle}'),
                      selected: activo,
                      onSelected: (_) => setState(() => _estadoSeleccionado = e),
                      selectedColor: fondo,
                      labelStyle: TextStyle(color: activo ? color : c.textoSuave, fontSize: 12),
                      side: BorderSide(color: activo ? color : c.borde),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(Icons.gps_fixed, size: 16, color: c.ok),
                    const SizedBox(width: 6),
                    Text('Ubicación verificada por GPS', style: TextStyle(color: c.texto, fontSize: 12)),
                    const Spacer(),
                    ChipEstado(texto: valla.precisionGps, color: c.ok, fondo: c.okFondo, compacto: true),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Sí · Dentro del radio contratado', style: TextStyle(color: c.textoSuave, fontSize: 12)),
                Text(valla.direccion, style: TextStyle(color: c.textoTenue, fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _notaControlador,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'Observaciones (opcional)'),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _guardando ? null : _registrar,
              child: Text(_guardando ? 'Guardando registro...' : 'Registrar auditoría'),
            ),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Text('Auditorías anteriores de esta valla',
                  style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
              const Spacer(),
              Text('${valla.historial.length} registros', style: TextStyle(color: c.textoSuave, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 10),
          ...valla.historial.map((h) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: TarjetaAo(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Icon(
                        h.estado == EstadoFisicoValla.bueno ? Icons.check_circle : Icons.warning_amber_rounded,
                        color: h.estado == EstadoFisicoValla.bueno ? c.ok : c.aviso,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${h.resumen} (${h.estado.etiqueta})',
                                style: TextStyle(color: c.texto, fontSize: 13, fontWeight: FontWeight.w600)),
                            Text(
                              '${h.fecha} · ${h.auditor}${h.nota != null ? ' · ${h.nota}' : ''}',
                              style: TextStyle(color: c.textoTenue, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  Widget _etiqueta(BuildContext context, String texto) {
    final c = context.aoColores;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: c.plano, borderRadius: BorderRadius.circular(999)),
      child: Text(texto, style: TextStyle(color: c.textoSuave, fontSize: 11)),
    );
  }
}
