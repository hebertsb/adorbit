import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/chip_estado.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/red/api_excepcion.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/brief.dart';
import '../../datos/repos/briefs_repo.dart';

class BriefDetallePagina extends ConsumerStatefulWidget {
  const BriefDetallePagina({super.key, required this.briefId});

  final String briefId;

  @override
  ConsumerState<BriefDetallePagina> createState() => _BriefDetallePaginaState();
}

class _BriefDetallePaginaState extends ConsumerState<BriefDetallePagina> {
  Future<(Brief, List<Pieza>)>? _futuro;
  final Set<String> _piezasEnAccion = {};

  BriefsRepo get _repo => BriefsRepo(token: ref.read(sesionControllerProvider).token!);

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    setState(() {
      _futuro = Future(() async {
        final brief = await _repo.obtener(widget.briefId);
        final piezas = await _repo.listarPiezas(widget.briefId);
        return (brief, piezas);
      });
    });
  }

  Future<void> _decidir(Pieza p, {required bool aprobar}) async {
    setState(() => _piezasEnAccion.add(p.id));
    try {
      await _repo.aprobar(p.id, aprobar: aprobar);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(aprobar ? 'Pieza aprobada correctamente' : 'Pieza marcada como rechazada')),
      );
      _cargar();
    } on ApiExcepcion catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.mensaje)));
    } finally {
      if (mounted) setState(() => _piezasEnAccion.remove(p.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del brief')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/camara/${widget.briefId}'),
        icon: const Icon(Icons.photo_camera_outlined),
        label: const Text('Subir pieza'),
      ),
      body: FutureBuilder<(Brief, List<Pieza>)>(
        future: _futuro,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            final c = context.aoColores;
            final mensaje = snapshot.error is ApiExcepcion
                ? (snapshot.error as ApiExcepcion).mensaje
                : 'No se pudo cargar el brief';
            return ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 60),
                Icon(Icons.cloud_off, color: c.textoTenue, size: 40),
                const SizedBox(height: 12),
                Text(mensaje, textAlign: TextAlign.center, style: TextStyle(color: c.texto)),
                const SizedBox(height: 18),
                OutlinedButton(onPressed: _cargar, child: const Text('Reintentar')),
              ],
            );
          }

          final (brief, piezas) = snapshot.data!;
          return _contenido(context, brief, piezas);
        },
      ),
    );
  }

  Widget _contenido(BuildContext context, Brief brief, List<Pieza> piezas) {
    final c = context.aoColores;
    final aprobadas = piezas.where((p) => p.estado == EstadoPieza.aprobada).length;
    final pendientes = piezas.where((p) => p.estado == EstadoPieza.enRevision).length;
    final bloqueadas = piezas.where((p) => p.estado == EstadoPieza.bloqueadaSaga).length;
    final progreso = piezas.isEmpty ? 0.0 : aprobadas / piezas.length;

    final (colorEstado, fondoEstado) = switch (brief.estado) {
      EstadoBrief.recibido => (c.neutro, c.neutroFondo),
      EstadoBrief.enCreacion => (c.info, c.infoFondo),
      EstadoBrief.enRevision => (c.aviso, c.avisoFondo),
      EstadoBrief.aprobado => (c.ok, c.okFondo),
      EstadoBrief.rechazado => (c.peligro, c.peligroFondo),
    };

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        TarjetaAo(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(brief.titulo,
                        style: TextStyle(color: c.texto, fontWeight: FontWeight.w700, fontSize: 16)),
                  ),
                  ChipEstado(texto: brief.estado.etiqueta, color: colorEstado, fondo: fondoEstado, compacto: true),
                ],
              ),
              if (brief.descripcion != null && brief.descripcion!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(brief.descripcion!, style: TextStyle(color: c.textoSuave)),
              ],
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: Text('Total de piezas: ${piezas.length} piezas',
                        style: TextStyle(color: c.textoSuave, fontSize: 12)),
                  ),
                  Text('$aprobadas/${piezas.length}',
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
        if (piezas.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              children: [
                Icon(Icons.image_not_supported_outlined, color: c.textoTenue, size: 32),
                const SizedBox(height: 8),
                Text('Sin piezas todavía', style: TextStyle(color: c.textoSuave)),
              ],
            ),
          )
        else
          ...piezas.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _tarjetaPieza(context, p),
              )),
      ],
    );
  }

  Widget _tarjetaPieza(BuildContext context, Pieza p) {
    final c = context.aoColores;
    final (color, fondo) = switch (p.estado) {
      EstadoPieza.aprobada => (c.ok, c.okFondo),
      EstadoPieza.enRevision => (c.aviso, c.avisoFondo),
      EstadoPieza.bloqueadaSaga => (c.neutro, c.neutroFondo),
      EstadoPieza.rechazada => (c.peligro, c.peligroFondo),
    };
    final enAccion = _piezasEnAccion.contains(p.id);

    return TarjetaAo(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('${p.nombre} · v${p.versionNumero}',
                    style: TextStyle(color: c.texto, fontWeight: FontWeight.w600)),
              ),
              ChipEstado(texto: p.estado.etiqueta, color: color, fondo: fondo, compacto: true),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            p.archivo?.resumen ?? p.tipo.valorApi.toUpperCase(),
            style: TextStyle(color: c.textoTenue, fontSize: 12),
          ),
          if (p.estado == EstadoPieza.bloqueadaSaga) ...[
            const SizedBox(height: 8),
            Text(
              'Bloqueada por contratación — no se puede editar ni re-aprobar en esta etapa.',
              style: TextStyle(color: c.textoSuave, fontSize: 12),
            ),
          ],
          const SizedBox(height: 10),
          if (p.estado == EstadoPieza.enRevision)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: enAccion ? null : () => _decidir(p, aprobar: false),
                    child: const Text('Rechazar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: enAccion ? null : () => _decidir(p, aprobar: true),
                    child: Text(enAccion ? '...' : 'Aprobar'),
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
          else if (p.estado == EstadoPieza.bloqueadaSaga)
            const SizedBox(
              width: double.infinity,
              child: OutlinedButton(onPressed: null, child: Text('Edición deshabilitada')),
            ),
        ],
      ),
    );
  }
}
