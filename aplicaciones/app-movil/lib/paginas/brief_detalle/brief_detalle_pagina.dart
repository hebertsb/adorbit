import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/badge_confianza.dart';
import '../../compartido/chip_estado.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/brief.dart';
import '../../datos/repos/briefs_repo.dart';

class BriefDetallePagina extends StatefulWidget {
  const BriefDetallePagina({super.key, required this.briefId});

  final String briefId;

  @override
  State<BriefDetallePagina> createState() => _BriefDetallePaginaState();
}

class _BriefDetallePaginaState extends State<BriefDetallePagina> {
  final _repo = BriefsRepo();

  void _accion(String mensaje) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final brief = _repo.buscarPorId(widget.briefId);

    if (brief == null) {
      return const Scaffold(body: Center(child: Text('Brief no encontrado')));
    }

    final aprobadas = brief.piezas.where((p) => p.estado == EstadoPieza.aprobada).length;
    final pendientes = brief.piezas.where((p) => p.estado == EstadoPieza.pendiente).length;
    final bloqueadas = brief.piezas.where((p) => p.estado == EstadoPieza.bloqueada).length;
    final progreso = brief.totalPiezas == 0 ? 0.0 : brief.piezasAprobadas / brief.totalPiezas;

    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del brief')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/camara/${brief.id}'),
        icon: const Icon(Icons.photo_camera_outlined),
        label: const Text('Subir pieza'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          TarjetaAo(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(brief.cliente,
                          style: TextStyle(color: c.texto, fontWeight: FontWeight.w700, fontSize: 16)),
                    ),
                    ChipEstado(texto: brief.estado.etiqueta, color: c.ok, fondo: c.okFondo, compacto: true),
                  ],
                ),
                const SizedBox(height: 4),
                Text(brief.campana, style: TextStyle(color: c.textoSuave)),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Text('Total de piezas: ${brief.totalPiezas} piezas',
                          style: TextStyle(color: c.textoSuave, fontSize: 12)),
                    ),
                    Text('${brief.piezasAprobadas}/${brief.totalPiezas}',
                        style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: progreso,
                    minHeight: 8,
                    backgroundColor: c.plano,
                    valueColor: AlwaysStoppedAnimation(c.ok),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '$aprobadas aprobadas · $pendientes pendiente${pendientes == 1 ? '' : 's'} · $bloqueadas bloqueada${bloqueadas == 1 ? '' : 's'}',
                  style: TextStyle(color: c.textoTenue, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text('Piezas', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 10),
          ...brief.piezas.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _tarjetaPieza(context, p),
              )),
        ],
      ),
    );
  }

  Widget _tarjetaPieza(BuildContext context, Pieza p) {
    final c = context.aoColores;
    final (color, fondo) = switch (p.estado) {
      EstadoPieza.aprobada => (c.ok, c.okFondo),
      EstadoPieza.pendiente => (c.aviso, c.avisoFondo),
      EstadoPieza.bloqueada => (c.neutro, c.neutroFondo),
      EstadoPieza.rechazada => (c.peligro, c.peligroFondo),
    };

    return TarjetaAo(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(p.titulo, style: TextStyle(color: c.texto, fontWeight: FontWeight.w600)),
              ),
              if (p.estado == EstadoPieza.bloqueada)
                BadgeConfianza(confianza: p.confianza, compacto: true)
              else
                ChipEstado(texto: p.estado.etiqueta, color: color, fondo: fondo, compacto: true),
            ],
          ),
          const SizedBox(height: 4),
          Text(p.formato, style: TextStyle(color: c.textoTenue, fontSize: 12)),
          if (p.notaBloqueo != null) ...[
            const SizedBox(height: 8),
            Text(p.notaBloqueo!, style: TextStyle(color: c.textoSuave, fontSize: 12)),
          ],
          if (p.observacion != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: c.peligroFondo, borderRadius: BorderRadius.circular(10)),
              child: Text(p.observacion!, style: TextStyle(color: c.peligro, fontSize: 12)),
            ),
          ],
          const SizedBox(height: 10),
          if (p.estado == EstadoPieza.pendiente)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _accion('Pieza marcada como rechazada'),
                    child: const Text('Rechazar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _accion('Pieza aprobada correctamente'),
                    child: const Text('Aprobar'),
                  ),
                ),
              ],
            )
          else if (p.estado == EstadoPieza.rechazada)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => context.push('/camara/${widget.briefId}'),
                child: const Text('Subir nueva versión'),
              ),
            )
          else if (p.estado == EstadoPieza.bloqueada)
            const SizedBox(
              width: double.infinity,
              child: OutlinedButton(onPressed: null, child: Text('Edición deshabilitada')),
            ),
        ],
      ),
    );
  }
}
