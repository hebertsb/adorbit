import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../compartido/chip_estado.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/red/conectividad_service.dart';
import '../../core/sync/sincronizador_service.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/cola_sync.dart';
import '../../datos/repos/cola_sync_repo.dart';

class ColaSincronizacionPagina extends ConsumerStatefulWidget {
  const ColaSincronizacionPagina({super.key});

  @override
  ConsumerState<ColaSincronizacionPagina> createState() => _ColaSincronizacionPaginaState();
}

class _ColaSincronizacionPaginaState extends ConsumerState<ColaSincronizacionPagina> {
  final _repo = ColaSyncRepo();
  bool _sincronizando = false;
  bool _soloWifi = true;
  Future<List<ElementoColaSync>>? _futuro;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() => setState(() => _futuro = _repo.listar());

  Future<void> _sincronizarAhora() async {
    final token = ref.read(sesionControllerProvider).token;
    if (token == null) return;
    setState(() => _sincronizando = true);
    final enviados = await SincronizadorService(token: token).drenarPendientes();
    if (!mounted) return;
    setState(() => _sincronizando = false);
    _cargar();
    final mensaje = enviados > 0
        ? '✓ Cola actualizada con el servidor ($enviados pieza(s) real(es) enviada(s))'
        : '✓ Cola actualizada con el servidor';
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final conexion = ref.watch(conectividadProvider).value ?? EstadoConexion.enLinea;
    final enLinea = conexion == EstadoConexion.enLinea;

    return Scaffold(
      appBar: AppBar(title: const Text('Sincronización')),
      body: FutureBuilder<List<ElementoColaSync>>(
        future: _futuro,
        builder: (context, snapshot) {
          final items = snapshot.data ?? const <ElementoColaSync>[];
          final pendientes = items.where((e) => e.estado == EstadoSincronizacion.pendiente).length;
          final resueltos = items.where((e) => e.estado == EstadoSincronizacion.sincronizado).length;
          final errores = items.where((e) => e.estado == EstadoSincronizacion.error).length;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TarjetaAo(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(enLinea ? Icons.wifi : Icons.wifi_off_rounded, color: enLinea ? c.ok : c.aviso),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(enLinea ? 'Conectado a Internet' : 'Sin conexión a internet',
                              style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                        ),
                        ChipEstado(
                          texto: enLinea ? 'En línea' : 'Sin conexión',
                          color: enLinea ? c.ok : c.aviso,
                          fondo: enLinea ? c.okFondo : c.avisoFondo,
                          compacto: true,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (_sincronizando || !enLinea) ? null : _sincronizarAhora,
                        child: Text(_sincronizando
                            ? 'Sincronizando lote activo...'
                            : 'Sincronizar ahora ($pendientes pendientes)'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Text('Elementos en cola', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                  const Spacer(),
                  Text(
                    '$pendientes pendientes · $resueltos resuelto · $errores error',
                    style: TextStyle(color: c.textoSuave, fontSize: 11),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (items.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Column(
                    children: [
                      Icon(Icons.inbox_outlined, color: c.textoTenue, size: 32),
                      const SizedBox(height: 8),
                      Text('Nada en cola — todo sincronizado', style: TextStyle(color: c.textoSuave)),
                    ],
                  ),
                )
              else
                ...items.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _tarjetaCola(context, e),
                    )),
              const SizedBox(height: 10),
              TarjetaAo(
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _soloWifi,
                  onChanged: (v) => setState(() => _soloWifi = v),
                  title: const Text('Solo sincronizar con Wi-Fi'),
                  subtitle: const Text('Evita consumo de datos móviles al subir fotos y videos',
                      style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _tarjetaCola(BuildContext context, ElementoColaSync e) {
    final c = context.aoColores;
    final (color, fondo, icono) = switch (e.estado) {
      EstadoSincronizacion.sincronizado => (c.ok, c.okFondo, Icons.check_circle),
      EstadoSincronizacion.enviando => (c.info, c.infoFondo, Icons.upload),
      EstadoSincronizacion.conflicto => (c.aviso, c.avisoFondo, Icons.warning_amber_rounded),
      EstadoSincronizacion.error => (c.peligro, c.peligroFondo, Icons.error_outline),
      EstadoSincronizacion.pendiente => (c.neutro, c.neutroFondo, Icons.schedule),
    };

    return TarjetaAo(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icono, color: color, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(e.titulo, style: TextStyle(color: c.texto, fontWeight: FontWeight.w600, fontSize: 13)),
              ),
              ChipEstado(
                texto: e.estado == EstadoSincronizacion.error
                    ? '${e.intentos} intentos fallidos'
                    : e.estado == EstadoSincronizacion.enviando
                        ? 'Enviando (${((e.progreso ?? 0) * 100).round()}%)'
                        : e.estado.etiqueta,
                color: color,
                fondo: fondo,
                compacto: true,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(e.subtitulo, style: TextStyle(color: c.textoSuave, fontSize: 11)),
          if (e.detalle != null) ...[
            const SizedBox(height: 6),
            Text(e.detalle!, style: TextStyle(color: c.textoSuave, fontSize: 12)),
          ],
        ],
      ),
    );
  }
}
