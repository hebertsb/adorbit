import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/chip_estado.dart';
import '../../compartido/logo_adorbit.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/brief.dart';
import '../../datos/repos/briefs_repo.dart';
import '../../datos/repos/cola_sync_repo.dart';

class BriefsListaPagina extends StatefulWidget {
  const BriefsListaPagina({super.key});

  @override
  State<BriefsListaPagina> createState() => _BriefsListaPaginaState();
}

class _BriefsListaPaginaState extends State<BriefsListaPagina> {
  final _repo = BriefsRepo();
  EstadoBrief? _filtro;
  String _busqueda = '';

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final todos = _repo.listar();
    final visibles = todos.where((b) {
      final coincideFiltro = _filtro == null || b.estado == _filtro;
      final coincideBusqueda = _busqueda.isEmpty ||
          b.campana.toLowerCase().contains(_busqueda.toLowerCase()) ||
          b.cliente.toLowerCase().contains(_busqueda.toLowerCase());
      return coincideFiltro && coincideBusqueda;
    }).toList();

    final totalPiezas = todos.fold<int>(0, (s, b) => s + b.totalPiezas);
    final pendientesSync = ColaSyncRepo().pendientes;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            LogoAdorbit(tamano: 26, color: c.marca),
            const SizedBox(width: 8),
            const Text('AdOrbit'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.add),
        label: const Text('Nuevo brief'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          TextField(
            decoration: const InputDecoration(
              hintText: 'Buscar brief o campaña...',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (v) => setState(() => _busqueda = v),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _pildoraFiltro(context, 'Todos (${todos.length})', null),
                const SizedBox(width: 8),
                _pildoraFiltro(
                  context,
                  'Activos (${todos.where((b) => b.estado == EstadoBrief.activo).length})',
                  EstadoBrief.activo,
                ),
                const SizedBox(width: 8),
                _pildoraFiltro(
                  context,
                  'En revisión (${todos.where((b) => b.estado == EstadoBrief.enRevision).length})',
                  EstadoBrief.enRevision,
                ),
                const SizedBox(width: 8),
                _pildoraFiltro(
                  context,
                  'Completados (${todos.where((b) => b.estado == EstadoBrief.completado).length})',
                  EstadoBrief.completado,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _tilaMetrica(context, 'Piezas totales', '$totalPiezas', c.texto)),
              const SizedBox(width: 12),
              Expanded(
                child: _tilaMetrica(context, 'Pendientes sync', '$pendientesSync', c.peligro),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (visibles.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                children: [
                  Icon(Icons.search_off, color: c.textoTenue, size: 32),
                  const SizedBox(height: 8),
                  Text('Sin briefs encontrados', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(
                    'No hay registros que coincidan con los criterios de búsqueda.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: c.textoSuave, fontSize: 12),
                  ),
                ],
              ),
            )
          else
            ...visibles.map((b) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _tarjetaBrief(context, b),
                )),
        ],
      ),
    );
  }

  Widget _pildoraFiltro(BuildContext context, String texto, EstadoBrief? valor) {
    final activo = _filtro == valor;
    final c = context.aoColores;
    return ChoiceChip(
      label: Text(texto),
      selected: activo,
      onSelected: (_) => setState(() => _filtro = valor),
      selectedColor: c.marcaSuave,
      labelStyle: TextStyle(color: activo ? c.marca : c.textoSuave, fontWeight: FontWeight.w600),
      side: BorderSide(color: c.borde),
    );
  }

  Widget _tilaMetrica(BuildContext context, String etiqueta, String valor, Color colorValor) {
    final c = context.aoColores;
    return TarjetaAo(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(etiqueta, style: TextStyle(color: c.textoSuave, fontSize: 12)),
          const SizedBox(height: 4),
          Text(valor, style: TextStyle(color: colorValor, fontSize: 22, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _tarjetaBrief(BuildContext context, Brief b) {
    final c = context.aoColores;
    final (color, fondo) = switch (b.estado) {
      EstadoBrief.activo => (c.ok, c.okFondo),
      EstadoBrief.enRevision => (c.aviso, c.avisoFondo),
      EstadoBrief.completado => (c.neutro, c.neutroFondo),
    };
    return TarjetaAo(
      onTap: () => context.push('/briefs/${b.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(b.campana, style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
              ),
              ChipEstado(texto: b.estado.etiqueta, color: color, fondo: fondo, compacto: true),
            ],
          ),
          const SizedBox(height: 4),
          Text(b.cliente, style: TextStyle(color: c.textoSuave, fontSize: 13)),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(b.subEstado, style: TextStyle(color: c.textoTenue, fontSize: 12)),
              const Spacer(),
              Text('${b.piezasAprobadas}/${b.totalPiezas}',
                  style: TextStyle(color: c.textoSuave, fontSize: 12, fontFeatures: const [])),
            ],
          ),
        ],
      ),
    );
  }
}
