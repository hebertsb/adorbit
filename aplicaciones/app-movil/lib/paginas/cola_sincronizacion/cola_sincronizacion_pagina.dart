import 'package:flutter/material.dart';

import '../../compartido/chip_estado.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../compartido/texto_mono.dart';
import '../../core/sync/sincronizador_service.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/cola_sync.dart';
import '../../datos/repos/cola_sync_repo.dart';

class ColaSincronizacionPagina extends StatefulWidget {
  const ColaSincronizacionPagina({super.key});

  @override
  State<ColaSincronizacionPagina> createState() => _ColaSincronizacionPaginaState();
}

class _ColaSincronizacionPaginaState extends State<ColaSincronizacionPagina> {
  final _repo = ColaSyncRepo();
  bool _sincronizando = false;
  bool _soloWifi = true;

  Future<void> _sincronizarAhora() async {
    setState(() => _sincronizando = true);
    // La lista de abajo sigue siendo la del mockup (demo visual); en paralelo
    // esto SI drena de verdad bandeja_salida_local (ver SincronizadorService).
    final enviados = await SincronizadorService().drenarPendientes();
    if (!mounted) return;
    setState(() => _sincronizando = false);
    final mensaje = enviados > 0
        ? '✓ Cola actualizada con el servidor ($enviados pieza(s) real(es) enviada(s))'
        : '✓ Cola actualizada con el servidor';
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final items = _repo.listar();

    return Scaffold(
      appBar: AppBar(title: const Text('Sincronización')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TarjetaAo(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.wifi, color: c.ok),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Conectado a Internet',
                          style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                    ),
                    ChipEstado(texto: 'En línea', color: c.ok, fondo: c.okFondo, compacto: true),
                  ],
                ),
                const SizedBox(height: 10),
                _filaDato(context, 'Último intento', 'Hoy 11:42 (hace 4 min)'),
                _filaDato(context, 'Latencia', '32ms'),
                _filaDato(context, 'Red', 'Wi-Fi Oficina'),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _sincronizando ? null : _sincronizarAhora,
                    child: Text(_sincronizando
                        ? 'Sincronizando lote activo...'
                        : 'Sincronizar ahora (${_repo.pendientes} pendientes)'),
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
                '${_repo.pendientes} pendientes · ${_repo.resueltos} resuelto · ${_repo.errores} error',
                style: TextStyle(color: c.textoSuave, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...items.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _tarjetaCola(context, e),
              )),
          const SizedBox(height: 10),
          TarjetaAo(
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _soloWifi,
                  onChanged: (v) => setState(() => _soloWifi = v),
                  title: const Text('Solo sincronizar con Wi-Fi'),
                  subtitle: const Text('Evita consumo de datos móviles al subir fotos y videos',
                      style: TextStyle(fontSize: 12)),
                ),
                const Divider(),
                _filaDato(context, 'Almacenamiento local', '14.2 GB libres'),
                _filaDato(context, 'Total en cola', '6.5 MB pendientes'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filaDato(BuildContext context, String etiqueta, String valor) {
    final c = context.aoColores;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(etiqueta, style: TextStyle(color: c.textoSuave, fontSize: 12)),
          const Spacer(),
          TextoMono(valor, tamano: 12, color: c.texto),
        ],
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
          if (e.estado == EstadoSincronizacion.enviando) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: e.progreso,
                minHeight: 6,
                backgroundColor: c.plano,
                valueColor: AlwaysStoppedAnimation(c.info),
              ),
            ),
            const SizedBox(height: 4),
            Text(e.detalle ?? '', style: TextStyle(color: c.textoTenue, fontSize: 11)),
          ] else if (e.detalle != null) ...[
            const SizedBox(height: 6),
            Text(e.detalle!, style: TextStyle(color: c.textoSuave, fontSize: 12)),
          ],
          if (e.estado == EstadoSincronizacion.conflicto) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(onPressed: () {}, child: const Text('Revisar conflicto')),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(onPressed: () {}, child: const Text('Guardar copia local')),
                ),
              ],
            ),
          ] else if (e.estado == EstadoSincronizacion.error) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(onPressed: () {}, child: const Text('Reintentar ahora')),
            ),
          ],
        ],
      ),
    );
  }
}
