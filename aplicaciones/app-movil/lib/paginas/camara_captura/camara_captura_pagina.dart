import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/auth/sesion_controller.dart';
import '../../core/i18n/idioma_controller.dart';
import '../../core/i18n/textos.dart';
import '../../datos/repos/briefs_repo.dart';

/// Captura real con package:camera. En web el navegador pide permiso de camara solo
/// (getUserMedia); en Android/iOS se pide con permission_handler antes de abrir el
/// CameraController (ver AndroidManifest.xml / Info.plist).
class CamaraCapturaPagina extends ConsumerStatefulWidget {
  const CamaraCapturaPagina({super.key, required this.briefId});

  final String briefId;

  @override
  ConsumerState<CamaraCapturaPagina> createState() =>
      _CamaraCapturaPaginaState();
}

class _CamaraCapturaPaginaState extends ConsumerState<CamaraCapturaPagina>
    with WidgetsBindingObserver {
  static const _nivelesZoom = [0.5, 1.0, 2.0];
  String? _tituloBrief;

  String _t(String clave) =>
      Textos.t(ref.read(idiomaControllerProvider), clave);

  List<String> get _modos => [
    _t('camara.modo_panoramica'),
    _t('camara.modo_valla'),
    _t('camara.modo_inspeccion'),
  ];

  List<CameraDescription> _camaras = [];
  CameraController? _controlador;
  int _indiceCamara = 0;
  int _modo = 1;
  int _zoom = 1;
  bool _flash = false;
  bool _inicializando = true;
  String? _error;
  double _zoomMinimo = 1;
  double _zoomMaximo = 1;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _inicializar();
    final token = ref.read(sesionControllerProvider).token;
    if (token != null) {
      BriefsRepo(token: token)
          .obtener(widget.briefId)
          .then((b) {
            if (mounted) setState(() => _tituloBrief = b.titulo);
          })
          .catchError((_) {});
    }
  }

  Future<void> _inicializar() async {
    if (!kIsWeb) {
      final estado = await Permission.camera.request();
      if (!estado.isGranted) {
        if (!mounted) return;
        setState(() {
          _inicializando = false;
          _error = _t('camara.error_permiso');
        });
        return;
      }
    }

    try {
      _camaras = await availableCameras();
      if (_camaras.isEmpty) {
        if (!mounted) return;
        setState(() {
          _inicializando = false;
          _error = _t('camara.error_sin_camara');
        });
        return;
      }
      await _abrirCamara(_indiceCamara);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _inicializando = false;
        _error = '${_t('camara.error_iniciar')}: $e';
      });
    }
  }

  Future<void> _abrirCamara(int indice) async {
    final anterior = _controlador;
    final controlador = CameraController(
      _camaras[indice],
      ResolutionPreset.high,
      enableAudio: false,
    );
    try {
      await controlador.initialize();
      final minZ = await controlador.getMinZoomLevel();
      final maxZ = await controlador.getMaxZoomLevel();
      if (!mounted) return;
      setState(() {
        _controlador = controlador;
        _indiceCamara = indice;
        _zoomMinimo = minZ;
        _zoomMaximo = maxZ;
        _inicializando = false;
        _error = null;
      });
      await anterior?.dispose();
    } catch (e) {
      await controlador.dispose();
      if (!mounted) return;
      setState(() {
        _inicializando = false;
        _error = '${_t('camara.error_abrir')}: $e';
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    final controlador = _controlador;
    if (controlador == null || !controlador.value.isInitialized) return;
    if (estado == AppLifecycleState.inactive) {
      controlador.dispose();
    } else if (estado == AppLifecycleState.resumed) {
      _abrirCamara(_indiceCamara);
    }
  }

  Future<void> _alternarFlash() async {
    final controlador = _controlador;
    if (controlador == null) return;
    final nuevo = !_flash;
    try {
      await controlador.setFlashMode(nuevo ? FlashMode.torch : FlashMode.off);
      if (!mounted) return;
      setState(() => _flash = nuevo);
    } catch (_) {
      // Algunos dispositivos/el renderer web no soportan flash — se ignora.
    }
  }

  Future<void> _voltearCamara() async {
    if (_camaras.length < 2) return;
    final siguiente = (_indiceCamara + 1) % _camaras.length;
    setState(() => _inicializando = true);
    await _abrirCamara(siguiente);
  }

  Future<void> _cambiarZoom(int indice) async {
    final controlador = _controlador;
    if (controlador == null) return;
    final objetivo = _nivelesZoom[indice].clamp(_zoomMinimo, _zoomMaximo);
    try {
      await controlador.setZoomLevel(objetivo);
      if (!mounted) return;
      setState(() => _zoom = indice);
    } catch (_) {
      // El 0.5x "ultra-wide" solo existe si el lente fisico lo soporta; si no,
      // setZoomLevel se clampea al minimo real del controlador.
    }
  }

  Future<void> _capturar() async {
    final controlador = _controlador;
    if (controlador == null ||
        !controlador.value.isInitialized ||
        controlador.value.isTakingPicture) {
      return;
    }
    try {
      final archivo = await controlador.takePicture();
      if (!mounted) return;
      context.push('/previsualizacion/${widget.briefId}', extra: archivo);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${_t('camara.error_capturar')}: $e')),
      );
    }
  }

  Future<void> _elegirDeGaleria() async {
    final XFile? archivo = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    if (archivo == null || !mounted) return;
    context.push('/previsualizacion/${widget.briefId}', extra: archivo);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controlador?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(idiomaControllerProvider);
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(child: _visor()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => context.pop(),
                      ),
                      Expanded(
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black45,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '${_t('camara.para')}: ${_tituloBrief ?? '...'}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          _flash ? Icons.flash_on : Icons.flash_off,
                          color: Colors.white,
                        ),
                        onPressed: _alternarFlash,
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.cameraswitch_outlined,
                          color: Colors.white,
                        ),
                        onPressed: _camaras.length > 1 ? _voltearCamara : null,
                      ),
                    ],
                  ),
                  const Spacer(),
                  if (_controlador?.value.isInitialized == true) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_nivelesZoom.length, (i) {
                        final activo = i == _zoom;
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: GestureDetector(
                            onTap: () => _cambiarZoom(i),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: activo ? Colors.white : Colors.black45,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${_nivelesZoom[i]}x',
                                style: TextStyle(
                                  color: activo ? Colors.black : Colors.white70,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 10),
                  ],
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_modos.length, (i) {
                      final activo = i == _modo;
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: GestureDetector(
                          onTap: () => setState(() => _modo = i),
                          child: Text(
                            _modos[i],
                            style: TextStyle(
                              color: activo ? Colors.white : Colors.white38,
                              fontWeight: activo
                                  ? FontWeight.w800
                                  : FontWeight.w500,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Column(
                        children: [
                          IconButton(
                            icon: const Icon(
                              Icons.photo_library_outlined,
                              color: Colors.white70,
                            ),
                            onPressed: _elegirDeGaleria,
                          ),
                          Text(
                            _t('camara.galeria'),
                            style: const TextStyle(
                              color: Colors.white54,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                      GestureDetector(
                        onTap: _capturar,
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 4),
                          ),
                        ),
                      ),
                      const SizedBox(width: 56),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _visor() {
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.no_photography_outlined,
                color: Colors.white54,
                size: 40,
              ),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70),
              ),
            ],
          ),
        ),
      );
    }

    final controlador = _controlador;
    if (_inicializando ||
        controlador == null ||
        !controlador.value.isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white54),
      );
    }

    final previewSize = controlador.value.previewSize;
    if (previewSize == null) {
      return CameraPreview(controlador);
    }

    return SizedBox.expand(
      child: FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(
          width: previewSize.height,
          height: previewSize.width,
          child: CameraPreview(controlador),
        ),
      ),
    );
  }
}
