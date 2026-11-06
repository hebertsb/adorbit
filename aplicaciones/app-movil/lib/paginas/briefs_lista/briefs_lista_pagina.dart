import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../compartido/chip_estado.dart';
import '../../compartido/logo_adorbit.dart';
import '../../compartido/tarjeta_ao.dart';
import '../../core/auth/sesion_controller.dart';
import '../../core/red/api_excepcion.dart';
import '../../core/tema/colores_ao.dart';
import '../../datos/modelos/brief.dart';
import '../../datos/repos/briefs_repo.dart';
import '../../datos/repos/cola_sync_repo.dart';

class BriefsListaPagina extends ConsumerStatefulWidget {
  const BriefsListaPagina({super.key});

  @override
  ConsumerState<BriefsListaPagina> createState() => _BriefsListaPaginaState();
}

class _BriefsListaPaginaState extends ConsumerState<BriefsListaPagina> {
  EstadoBrief? _filtro;
  String _busqueda = '';
  Future<List<Brief>>? _futuro;
  int _pendientesSync = 0;

  BriefsRepo get _repo => BriefsRepo(token: ref.read(sesionControllerProvider).token!);

  @override
  void initState() {
    super.initState();
    _cargar();
    ColaSyncRepo().pendientes.then((n) {
      if (mounted) setState(() => _pendientesSync = n);
    });
  }

  void _cargar() {
    setState(() => _futuro = _repo.listar());
  }

  Future<void> _nuevoBrief() async {
    final controladorTitulo = TextEditingController();
    final controladorCampana = TextEditingController();
    final controladorDescripcion = TextEditingController();
    var creando = false;
    String? error;

    final creado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) {
          final c = ctx.aoColores;
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
            child: Container(
              decoration: BoxDecoration(
                color: c.superficie,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Nuevo brief', style: TextStyle(color: c.texto, fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 4),
                  Text(
                    'Se crea directo en ms-creatividades (POST /api/v1/briefs).',
                    style: TextStyle(color: c.textoSuave, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: controladorTitulo,
                    decoration: const InputDecoration(labelText: 'Título', hintText: 'Ej: Lanzamiento Fibra 500M'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: controladorCampana,
                    decoration: const InputDecoration(
                      labelText: 'ID de campaña (UUID)',
                      hintText: 'Lo asigna ms-campanas al contratar',
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: controladorDescripcion,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Descripción (opcional)'),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 10),
                    Text(error!, style: TextStyle(color: c.peligro, fontSize: 12)),
                  ],
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: creando
                          ? null
                          : () async {
                              if (controladorTitulo.text.trim().isEmpty || controladorCampana.text.trim().isEmpty) {
                                setSheet(() => error = 'Título y campaña son obligatorios');
                                return;
                              }
                              setSheet(() {
                                creando = true;
                                error = null;
                              });
                              try {
                                await _repo.crear(
                                  campanaId: controladorCampana.text.trim(),
                                  titulo: controladorTitulo.text.trim(),
                                  descripcion: controladorDescripcion.text.trim(),
                                );
                                if (ctx.mounted) Navigator.pop(ctx, true);
                              } on ApiExcepcion catch (e) {
                                setSheet(() {
                                  creando = false;
                                  error = e.mensaje;
                                });
                              } catch (e) {
                                setSheet(() {
                                  creando = false;
                                  error = 'No se pudo crear el brief: $e';
                                });
                              }
                            },
                      child: Text(creando ? 'Creando...' : 'Crear brief'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );

    if (creado == true) _cargar();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;

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
        onPressed: _nuevoBrief,
        icon: const Icon(Icons.add),
        label: const Text('Nuevo brief'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          _cargar();
          await _futuro;
        },
        child: FutureBuilder<List<Brief>>(
          future: _futuro,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _estadoError(context, snapshot.error);
            }
            return _listaConFiltros(context, snapshot.data ?? const []);
          },
        ),
      ),
    );
  }

  Widget _estadoError(BuildContext context, Object? error) {
    final c = context.aoColores;
    final mensaje = error is ApiExcepcion ? error.mensaje : 'No se pudo conectar con el servidor';
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 60),
        Icon(Icons.cloud_off, color: c.textoTenue, size: 40),
        const SizedBox(height: 12),
        Text('Sin datos del servidor', style: TextStyle(color: c.texto, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
        const SizedBox(height: 6),
        Text(mensaje, style: TextStyle(color: c.textoSuave, fontSize: 12), textAlign: TextAlign.center),
        const SizedBox(height: 18),
        OutlinedButton(onPressed: _cargar, child: const Text('Reintentar')),
      ],
    );
  }

  Widget _listaConFiltros(BuildContext context, List<Brief> todos) {
    final c = context.aoColores;
    final visibles = todos.where((b) {
      final coincideFiltro = _filtro == null || b.estado == _filtro;
      final coincideBusqueda = _busqueda.isEmpty || b.titulo.toLowerCase().contains(_busqueda.toLowerCase());
      return coincideFiltro && coincideBusqueda;
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        TextField(
          decoration: const InputDecoration(
            hintText: 'Buscar brief...',
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
              for (final estado in EstadoBrief.values) ...[
                const SizedBox(width: 8),
                _pildoraFiltro(
                  context,
                  '${estado.etiqueta} (${todos.where((b) => b.estado == estado).length})',
                  estado,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(child: _tilaMetrica(context, 'Briefs totales', '${todos.length}', c.texto)),
            const SizedBox(width: 12),
            Expanded(child: _tilaMetrica(context, 'Pendientes sync', '$_pendientesSync', c.peligro)),
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
      EstadoBrief.recibido => (c.neutro, c.neutroFondo),
      EstadoBrief.enCreacion => (c.info, c.infoFondo),
      EstadoBrief.enRevision => (c.aviso, c.avisoFondo),
      EstadoBrief.aprobado => (c.ok, c.okFondo),
      EstadoBrief.rechazado => (c.peligro, c.peligroFondo),
    };
    return TarjetaAo(
      onTap: () => context.push('/briefs/${b.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(b.titulo, style: TextStyle(color: c.texto, fontWeight: FontWeight.w700)),
              ),
              ChipEstado(texto: b.estado.etiqueta, color: color, fondo: fondo, compacto: true),
            ],
          ),
          if (b.descripcion != null && b.descripcion!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(b.descripcion!, style: TextStyle(color: c.textoSuave, fontSize: 13)),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Text('v${b.version}', style: TextStyle(color: c.textoTenue, fontSize: 12)),
              const Spacer(),
              if (b.actualizadoEn != null)
                Text(
                  _fechaCorta(b.actualizadoEn!),
                  style: TextStyle(color: c.textoSuave, fontSize: 12),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _fechaCorta(DateTime fecha) =>
      '${fecha.day.toString().padLeft(2, '0')}/${fecha.month.toString().padLeft(2, '0')}/${fecha.year}';
}
