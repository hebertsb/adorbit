import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../compartido/chip_estado.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/i18n/idioma_controller.dart';
import '../../core/i18n/textos.dart';
import '../../core/red/conectividad_service.dart';
import '../../core/sync/preferencias_sync.dart';
import '../../core/sync/sincronizacion_background.dart';
import '../../core/sync/sincronizador_service.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/cola_sync.dart';
import '../../datos/repos/cola_sync_repo.dart';

class ColaSincronizacionPagina extends ConsumerStatefulWidget {
  const ColaSincronizacionPagina({super.key});

  @override
  ConsumerState<ColaSincronizacionPagina> createState() =>
      _ColaSincronizacionPaginaState();
}

class _ColaSincronizacionPaginaState
    extends ConsumerState<ColaSincronizacionPagina> {
  final _repo = ColaSyncRepo();
  bool _sincronizando = false;
  bool _soloWifi = true;
  Future<List<ElementoColaSync>>? _futuro;

  String _t(String clave) =>
      Textos.t(ref.read(idiomaControllerProvider), clave);

  @override
  void initState() {
    super.initState();
    _cargar();
    SharedPreferences.getInstance().then((prefs) {
      if (mounted)
        setState(() => _soloWifi = prefs.getBool(clavePrefsSoloWifi) ?? true);
    });
  }

  void _cargar() => setState(() => _futuro = _repo.listar());

  Future<void> _cambiarSoloWifi(bool valor) async {
    setState(() => _soloWifi = valor);
    await SincronizacionBackground.aplicarPreferenciaWifi(valor);
  }

  Future<void> _sincronizarAhora() async {
    final token = ref.read(sesionControllerProvider).token;
    if (token == null) return;

    if (_soloWifi && !await hayConexionWifi()) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_t('sync.bloqueado_por_wifi'))));
      return;
    }

    setState(() => _sincronizando = true);
    final enviados = await SincronizadorService(
      token: token,
    ).drenarPendientes();
    if (!mounted) return;
    setState(() => _sincronizando = false);
    _cargar();
    final mensaje = enviados > 0
        ? '${_t('sync.cola_actualizada')} ($enviados pieza(s) real(es) enviada(s))'
        : _t('sync.cola_actualizada');
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final idioma = ref.watch(idiomaControllerProvider);
    String t(String clave) => Textos.t(idioma, clave);
    final conexion =
        ref.watch(conectividadProvider).value ?? EstadoConexion.enLinea;
    final enLinea = conexion == EstadoConexion.enLinea;

    return Scaffold(
      appBar: AppBar(title: Text(t('sync.titulo'))),
      body: FutureBuilder<List<ElementoColaSync>>(
        future: _futuro,
        builder: (context, snapshot) {
          final items = snapshot.data ?? const <ElementoColaSync>[];
          final pendientes = items
              .where((e) => e.estado == EstadoSincronizacion.pendiente)
              .length;
          final resueltos = items
              .where((e) => e.estado == EstadoSincronizacion.sincronizado)
              .length;
          final errores = items
              .where((e) => e.estado == EstadoSincronizacion.error)
              .length;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TarjetaAo(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          enLinea ? Icons.wifi : Icons.wifi_off_rounded,
                          color: enLinea ? c.ok : c.aviso,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            enLinea
                                ? t('sync.conectado')
                                : t('sync.sin_conexion'),
                            style: TextStyle(
                              color: c.texto,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        ChipEstado(
                          texto: enLinea
                              ? t('sync.en_linea')
                              : t('sync.sin_conexion_chip'),
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
                        onPressed: (_sincronizando || !enLinea)
                            ? null
                            : _sincronizarAhora,
                        child: Text(
                          _sincronizando
                              ? t('sync.sincronizando')
                              : '${t('sync.sincronizar_ahora')} ($pendientes ${t('sync.pendientes')})',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Text(
                    t('sync.elementos_cola'),
                    style: TextStyle(
                      color: c.texto,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '$pendientes ${t('sync.pendientes')} · $resueltos ${t('sync.resuelto')} · $errores ${t('sync.error')}',
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
                      Text(
                        t('sync.vacio'),
                        style: TextStyle(color: c.textoSuave),
                      ),
                    ],
                  ),
                )
              else
                ...items.map(
                  (e) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _tarjetaCola(context, e),
                  ),
                ),
              const SizedBox(height: 10),
              TarjetaAo(
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _soloWifi,
                  onChanged: (v) => _cambiarSoloWifi(v),
                  title: Text(t('sync.solo_wifi_titulo')),
                  subtitle: Text(
                    t('sync.solo_wifi_subtitulo'),
                    style: const TextStyle(fontSize: 12),
                  ),
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
    final idioma = ref.read(idiomaControllerProvider);
    final (color, fondo, icono) = switch (e.estado) {
      EstadoSincronizacion.sincronizado => (
        c.ok,
        c.okFondo,
        Icons.check_circle,
      ),
      EstadoSincronizacion.enviando => (c.info, c.infoFondo, Icons.upload),
      EstadoSincronizacion.conflicto => (
        c.aviso,
        c.avisoFondo,
        Icons.warning_amber_rounded,
      ),
      EstadoSincronizacion.error => (
        c.peligro,
        c.peligroFondo,
        Icons.error_outline,
      ),
      EstadoSincronizacion.pendiente => (
        c.neutro,
        c.neutroFondo,
        Icons.schedule,
      ),
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
                child: Text(
                  e.titulo,
                  style: TextStyle(
                    color: c.texto,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
              ChipEstado(
                texto: e.estado == EstadoSincronizacion.error
                    ? '${e.intentos} ${Textos.t(idioma, 'sync.intentos_fallidos_sufijo')}'
                    : e.estado == EstadoSincronizacion.enviando
                    ? '${Textos.t(idioma, 'sync.enviando')} (${((e.progreso ?? 0) * 100).round()}%)'
                    : e.estado.etiqueta(idioma),
                color: color,
                fondo: fondo,
                compacto: true,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            e.subtitulo,
            style: TextStyle(color: c.textoSuave, fontSize: 11),
          ),
          if (e.detalle != null) ...[
            const SizedBox(height: 6),
            Text(
              Textos.t(idioma, e.detalle!),
              style: TextStyle(color: c.textoSuave, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }
}
