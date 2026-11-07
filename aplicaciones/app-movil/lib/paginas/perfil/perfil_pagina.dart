import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/i18n/idioma_controller.dart';
import '../../core/i18n/textos.dart';
import '../../core/sync/preferencias_sync.dart';
import '../../core/sync/sincronizacion_background.dart';
import '../../core/tema/colores_ao.dart';
import '../../core/tema/tema_controller.dart';

class PerfilPagina extends ConsumerStatefulWidget {
  const PerfilPagina({super.key});

  @override
  ConsumerState<PerfilPagina> createState() => _PerfilPaginaState();
}

class _PerfilPaginaState extends ConsumerState<PerfilPagina> {
  bool _soloWifi = true;
  String? _ultimaSincronizacion;

  String _t(String clave) =>
      Textos.t(ref.read(idiomaControllerProvider), clave);

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      if (!mounted) return;
      setState(() {
        _soloWifi = prefs.getBool(clavePrefsSoloWifi) ?? true;
        _ultimaSincronizacion = prefs.getString(clavePrefsUltimaSincronizacion);
      });
    });
  }

  Future<void> _cambiarSoloWifi(bool valor) async {
    setState(() => _soloWifi = valor);
    await SincronizacionBackground.aplicarPreferenciaWifi(valor);
  }

  String _formatearUltimaSync(Idioma idioma) {
    final iso = _ultimaSincronizacion;
    if (iso == null) return Textos.t(idioma, 'perfil.ultima_sync_nunca');
    final fecha = DateTime.parse(iso);
    final dos = (int n) => n.toString().padLeft(2, '0');
    return '${dos(fecha.day)}/${dos(fecha.month)}/${fecha.year} ${dos(fecha.hour)}:${dos(fecha.minute)}';
  }

  Future<void> _cerrarSesion() async {
    final t = _t;
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t('perfil.confirmar_salir_titulo')),
        content: Text(t('perfil.confirmar_salir_detalle')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t('comun.cancelar')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(t('perfil.salir')),
          ),
        ],
      ),
    );
    if (confirmar != true || !mounted) return;
    await ref.read(sesionControllerProvider.notifier).cerrarSesion();
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(t('perfil.sesion_finalizada'))));
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final idioma = ref.watch(idiomaControllerProvider);
    String t(String clave) => Textos.t(idioma, clave);
    final modoOscuro =
        ref.watch(temaControllerProvider) == ThemeMode.dark ||
        (ref.watch(temaControllerProvider) == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    final sesion = ref.watch(sesionControllerProvider);
    final sub = sesion.sub ?? '—';
    final rol = sesion.rol ?? t('perfil.sin_rol');
    final iniciales = sub.length >= 2
        ? sub.substring(0, 2).toUpperCase()
        : sub.toUpperCase();

    return Scaffold(
      appBar: AppBar(title: Text(t('perfil.titulo'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TarjetaAo(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: c.marcaSuave,
                  child: Text(
                    iniciales,
                    style: TextStyle(
                      color: c.marca,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sub,
                        style: TextStyle(
                          color: c.texto,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: c.marcaSuave,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          rol,
                          style: TextStyle(color: c.marca, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text(
            t('perfil.preferencias'),
            style: TextStyle(color: c.texto, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          TarjetaAo(
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: modoOscuro,
                  onChanged: (_) =>
                      ref.read(temaControllerProvider.notifier).alternar(),
                  title: Text(t('perfil.modo_oscuro')),
                  subtitle: Text(
                    modoOscuro ? t('perfil.tema_noche') : t('perfil.tema_dia'),
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                const Divider(),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _soloWifi,
                  onChanged: _cambiarSoloWifi,
                  title: Text(t('sync.solo_wifi_titulo')),
                  subtitle: Text(
                    t('sync.solo_wifi_subtitulo'),
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(t('perfil.idioma_titulo')),
                  subtitle: Text(
                    t('perfil.idioma_subtitulo'),
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: SegmentedButton<Idioma>(
                    segments: const [
                      ButtonSegment(value: Idioma.es, label: Text('ES')),
                      ButtonSegment(value: Idioma.en, label: Text('EN')),
                    ],
                    selected: {idioma},
                    onSelectionChanged: (seleccion) => ref
                        .read(idiomaControllerProvider.notifier)
                        .establecer(seleccion.first),
                    showSelectedIcon: false,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          TarjetaAo(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _cerrarSesion,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: c.peligro,
                      side: BorderSide(color: c.peligro),
                    ),
                    child: Text(t('perfil.cerrar_sesion')),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${t('perfil.ultima_sync')}: ${_formatearUltimaSync(idioma)}',
                  style: TextStyle(color: c.textoTenue, fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Column(
              children: [
                Text(
                  t('perfil.app_nombre'),
                  style: TextStyle(
                    color: c.textoSuave,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  t('perfil.app_descripcion'),
                  style: TextStyle(color: c.textoTenue, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
