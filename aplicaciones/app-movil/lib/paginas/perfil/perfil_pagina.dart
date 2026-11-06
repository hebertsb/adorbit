import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/tema/colores_ao.dart';
import '../../core/tema/tema_controller.dart';

class PerfilPagina extends ConsumerStatefulWidget {
  const PerfilPagina({super.key});

  @override
  ConsumerState<PerfilPagina> createState() => _PerfilPaginaState();
}

class _PerfilPaginaState extends ConsumerState<PerfilPagina> {
  bool _soloWifi = true;

  Future<void> _cerrarSesion() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Cerrar sesión?'),
        content: const Text(
          'Se finalizará tu sesión de Keycloak. Los registros pendientes de sincronización se mantendrán seguros en tu dispositivo.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Salir')),
        ],
      ),
    );
    if (confirmar != true || !mounted) return;
    await ref.read(sesionControllerProvider.notifier).cerrarSesion();
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Sesión finalizada en Keycloak OIDC.')));
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final modoOscuro = ref.watch(temaControllerProvider) == ThemeMode.dark ||
        (ref.watch(temaControllerProvider) == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TarjetaAo(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: c.marcaSuave,
                  child: Text('CM', style: TextStyle(color: c.marca, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Carlos Méndez', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(color: c.marcaSuave, borderRadius: BorderRadius.circular(999)),
                        child: Text('Auditor de campo', style: TextStyle(color: c.marca, fontSize: 11)),
                      ),
                      const SizedBox(height: 4),
                      Text('carlos.mendez@adorbit.app', style: TextStyle(color: c.textoSuave, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text('Preferencias', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TarjetaAo(
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: modoOscuro,
                  onChanged: (_) => ref.read(temaControllerProvider.notifier).alternar(),
                  title: const Text('Modo oscuro'),
                  subtitle: Text(
                    modoOscuro ? 'Tema nocturno activado' : 'Tema diurno activado',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                const Divider(),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _soloWifi,
                  onChanged: (v) => setState(() => _soloWifi = v),
                  title: const Text('Solo sincronizar con Wi-Fi'),
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Idioma de la interfaz'),
                  subtitle: const Text('Configuración regional activa', style: TextStyle(fontSize: 12)),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: c.plano, borderRadius: BorderRadius.circular(999)),
                    child: Text('Español (ES)', style: TextStyle(color: c.textoSuave, fontSize: 12)),
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
                    style: OutlinedButton.styleFrom(foregroundColor: c.peligro, side: BorderSide(color: c.peligro)),
                    child: const Text('Cerrar sesión'),
                  ),
                ),
                const SizedBox(height: 8),
                Text('Última sincronización: Hoy 11:42', style: TextStyle(color: c.textoTenue, fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Column(
              children: [
                Text('AdOrbit', style: TextStyle(color: c.textoSuave, fontWeight: FontWeight.w700)),
                Text('Plataforma de Operaciones Publicitarias',
                    style: TextStyle(color: c.textoTenue, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
