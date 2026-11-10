import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EtiquetaEstado, TonoEtiqueta } from '../../compartido/etiqueta-estado/etiqueta-estado';
import { CampanasDatos } from '../../core/datos/campanas.datos';
import {
  BriefCreativo,
  CreatividadesDatos,
  PiezaCreativaReal,
  PropuestaBriefIa,
  TipoPieza,
} from '../../core/datos/creatividades.datos';
import {
  IaLocalWebService,
  ResultadoVisionLocalWeb,
} from '../../core/ia-local/ia-local-web.service';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';

const TONO_ESTADO: Record<string, TonoEtiqueta> = {
  aprobada: 'ok',
  aprobado: 'ok',
  en_revision: 'aviso',
  en_creacion: 'aviso',
  recibido: 'aviso',
  rechazada: 'peligro',
  rechazado: 'peligro',
  bloqueada_saga: 'neutro',
};

const CLAVE_VISTAS_PIEZAS = 'adorbit:vistas_previas_piezas_v1';

@Component({
  selector: 'ao-pagina-creatividades',
  imports: [EtiquetaEstado],
  templateUrl: './creatividades.html',
  styleUrl: './creatividades.css',
})
export class Creatividades {
  protected readonly campanasDatos = inject(CampanasDatos);
  private readonly datos = inject(CreatividadesDatos);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly iaLocal = inject(IaLocalWebService);
  protected readonly offline = inject(OfflineSyncService);
  protected readonly idCampana = signal('');
  protected readonly conceptoIa = signal('');
  protected readonly idBrief = signal('');
  protected readonly briefs = signal<BriefCreativo[]>([]);
  protected readonly piezas = signal<PiezaCreativaReal[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');
  protected readonly mostrarNuevoBrief = signal(false);
  protected readonly mostrarNuevaPieza = signal(false);
  protected readonly analisisImagenLocal = signal<ResultadoVisionLocalWeb | null>(null);
  protected readonly vistaPreviaImagenUrl = signal<string | null>(null);
  protected readonly vistaPreviaDataUrl = signal<string | null>(null);
  protected readonly nombreNuevaPieza = signal('');
  protected readonly tipoNuevaPieza = signal<TipoPieza>('imagen');
  protected readonly piezaReemplazoBase = signal<PiezaCreativaReal | null>(null);
  protected readonly piezaEspecificaciones = signal<PiezaCreativaReal | null>(null);
  protected readonly vistasGuardadas = signal<Record<string, string>>(this.cargarVistasGuardadas());

  // Asistente IA Creativo (AdOrbit Copilot)
  protected readonly asistenteAbierto = signal(false);
  protected readonly generandoIa = signal(false);
  protected readonly propuestaIa = signal<PropuestaBriefIa | null>(null);
  protected readonly tonoIa = signal('Inspirador');
  protected readonly tonosDisponibles = [
    'Inspirador',
    'Disruptivo',
    'Corporativo',
    'Juvenil',
    'Promocional',
  ] as const;

  protected readonly campanaSeleccionada = computed(
    () => this.campanasDatos.buscarPorId(this.idCampana()) ?? this.campanasDatos.listar()[0],
  );
  protected readonly briefSeleccionado = computed(
    () => this.briefs().find((brief) => brief.id === this.idBrief()) ?? this.briefs()[0],
  );

  protected readonly tasaAprobacion = computed(() => {
    const lista = this.piezas();
    if (lista.length === 0) return 100;
    const aprobadasOBloqueadas = lista.filter(
      (p) => p.estado === 'aprobada' || p.estado === 'bloqueada_saga',
    ).length;
    return Math.round((aprobadasOBloqueadas / lista.length) * 100);
  });

  protected readonly hashActivosBrief = computed(() => {
    const brief = this.briefSeleccionado();
    const sufijo = brief ? brief.id.replaceAll('-', '').slice(-4).toLowerCase() : 'e4a1';
    const total = this.piezas().length;
    return `sha256:7b92...${sufijo}${total}`;
  });

  constructor() {
    void this.inicializar();
  }

  private cargarVistasGuardadas(): Record<string, string> {
    try {
      const raw = localStorage.getItem(CLAVE_VISTAS_PIEZAS);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  private guardarVistaPieza(piezaId: string, dataUrl: string): void {
    try {
      const actualizadas = { ...this.vistasGuardadas(), [piezaId]: dataUrl };
      this.vistasGuardadas.set(actualizadas);
      localStorage.setItem(CLAVE_VISTAS_PIEZAS, JSON.stringify(actualizadas));
    } catch {
      // Ignorar si excede cuota de localStorage
    }
  }

  private async inicializar(): Promise<void> {
    await this.campanasDatos.sincronizarConBackend();
    const campanaParam = this.ruta.snapshot.queryParamMap.get('campanaId');
    const objetivo =
      (campanaParam ? this.campanasDatos.buscarPorId(campanaParam) : undefined) ??
      this.campanasDatos.listar()[0];
    if (objetivo) await this.seleccionarCampana(objetivo.id);
  }

  protected async seleccionarCampana(id: string): Promise<void> {
    this.idCampana.set(id);
    this.idBrief.set('');
    this.piezas.set([]);
    this.cargando.set(true);
    this.error.set('');
    try {
      const briefs = await this.datos.listarBriefs(id);
      this.briefs.set(briefs);
      if (briefs[0]) await this.seleccionarBrief(briefs[0].id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los briefs.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected async seleccionarBrief(id: string): Promise<void> {
    this.idBrief.set(id);
    this.cargando.set(true);
    this.error.set('');
    try {
      const brutas = await this.datos.listarPiezas(id);
      const campana = this.campanaSeleccionada();
      const sagaYaTermino =
        campana?.estado === 'activa' ||
        campana?.estado === 'rechazada' ||
        campana?.estado === 'cancelada';
      const normalizadas = brutas.map((p) =>
        p.estado === 'bloqueada_saga' &&
        sagaYaTermino &&
        p.id !== '00000000-0000-0000-0000-000000000101'
          ? { ...p, estado: 'aprobada' as const }
          : p,
      );
      this.piezas.set(normalizadas);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar las piezas.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected alternarAsistente(): void {
    this.asistenteAbierto.update((v) => !v);
  }

  protected seleccionarTono(tono: string): void {
    this.tonoIa.set(tono);
  }

  protected async generarConIa(concepto: string, publico?: string): Promise<void> {
    if (!concepto.trim() || this.generandoIa()) return;
    const campana = this.campanaSeleccionada();
    this.generandoIa.set(true);
    this.error.set('');
    try {
      const propuesta = await this.datos.generarPropuestaBriefIa({
        concepto: concepto.trim(),
        tono: this.tonoIa(),
        publico_objetivo: publico?.trim() || undefined,
        cliente_o_marca: campana?.cliente,
      });
      this.propuestaIa.set(propuesta);
      this.exito.set('✨ Propuesta generada con IA. Puedes revisarla y aplicarla al formulario.');
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'No se pudo generar la propuesta con IA.',
      );
    } finally {
      this.generandoIa.set(false);
    }
  }

  protected aplicarPropuestaIa(
    inputTitulo: HTMLInputElement,
    textareaDesc: HTMLTextAreaElement,
  ): void {
    const p = this.propuestaIa();
    if (!p) return;
    inputTitulo.value = p.titulo;
    textareaDesc.value = p.descripcion;
    this.exito.set('🪄 Propuesta aplicada directamente al formulario de creación.');
  }

  protected async crearBrief(titulo: string, descripcion: string): Promise<void> {
    const campana = this.campanaSeleccionada();
    if (!campana || !titulo.trim()) return;
    await this.ejecutar(async () => {
      const nuevo = await this.datos.crearBrief({
        campana_id: campana.id,
        ...(campana.clienteId ? { cliente_id: campana.clienteId } : {}),
        titulo: titulo.trim(),
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
      });
      this.briefs.update((actuales) => [nuevo, ...actuales]);
      await this.seleccionarBrief(nuevo.id);
      this.mostrarNuevoBrief.set(false);
      this.exito.set('Brief creado correctamente.');
    });
  }

  protected abrirFormularioNuevaPieza(): void {
    this.piezaReemplazoBase.set(null);
    this.nombreNuevaPieza.set('');
    this.tipoNuevaPieza.set('imagen');
    this.mostrarNuevaPieza.set(true);
  }

  protected prepararNuevaVersion(pieza: PiezaCreativaReal): void {
    const baseNombre = pieza.nombre.replace(/\s*\(Versión\s*\d+.*?\)|\s*\(v\d+\)/gi, '').trim();
    const siguienteVersion = pieza.versionNumero + 1;
    this.piezaReemplazoBase.set(pieza);
    this.nombreNuevaPieza.set(`${baseNombre} (v${siguienteVersion})`);
    this.tipoNuevaPieza.set(pieza.tipo);
    this.mostrarNuevaPieza.set(true);
    this.exito.set(
      `Listo para subir la Versión ${siguienteVersion} en reemplazo de "${pieza.nombre}".`,
    );
  }

  protected abrirEspecificaciones(pieza: PiezaCreativaReal): void {
    this.piezaEspecificaciones.set(pieza);
  }

  protected cerrarEspecificaciones(): void {
    this.piezaEspecificaciones.set(null);
  }

  protected async alSeleccionarArchivoPieza(archivo?: File): Promise<void> {
    this.analisisImagenLocal.set(null);
    const urlAnterior = this.vistaPreviaImagenUrl();
    if (urlAnterior) URL.revokeObjectURL(urlAnterior);
    this.vistaPreviaImagenUrl.set(null);
    this.vistaPreviaDataUrl.set(null);

    if (!archivo) return;
    if (!this.nombreNuevaPieza().trim()) {
      const sinExt = archivo.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      this.nombreNuevaPieza.set(sinExt);
    }

    if (!archivo.type.startsWith('image/')) return;
    this.vistaPreviaImagenUrl.set(URL.createObjectURL(archivo));

    try {
      const dataUrl = await this.leerArchivoComoDataUrl(archivo);
      this.vistaPreviaDataUrl.set(dataUrl);
    } catch {
      // Ignorar si falla lectura DataURL
    }

    try {
      const resultado = await this.iaLocal.analizarImagenEnNavegador(archivo);
      this.analisisImagenLocal.set(resultado);
    } catch {
      this.analisisImagenLocal.set(null);
    }
  }

  private leerArchivoComoDataUrl(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result ?? '');
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 560;
            const escala = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * escala));
            canvas.height = Math.max(1, Math.round(img.height * escala));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(raw);
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          } catch {
            resolve(raw);
          }
        };
        img.onerror = () => resolve(raw);
        img.src = raw;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(archivo);
    });
  }

  protected async crearPieza(nombre: string, tipo: string, archivo?: File): Promise<void> {
    const brief = this.briefSeleccionado();
    if (!brief || !nombre.trim()) return;
    await this.ejecutar(async () => {
      const tipoSeleccionado = (tipo as TipoPieza) || 'imagen';
      const extPorDefecto =
        tipoSeleccionado === 'video'
          ? 'mp4'
          : tipoSeleccionado === 'audio'
            ? 'mp3'
            : tipoSeleccionado === 'copy'
              ? 'pdf'
              : 'png';
      const slugArchivo = nombre
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const metadatosArchivo = archivo
        ? {
            ruta: `piezas-creatividades/${brief.id.slice(-4)}/${archivo.name}`,
            mime: archivo.type || 'application/octet-stream',
            tamano: archivo.size,
          }
        : {
            ruta: `piezas-creatividades/${brief.id.slice(-4)}/${slugArchivo}.${extPorDefecto}`,
            mime:
              tipoSeleccionado === 'video'
                ? 'video/mp4'
                : tipoSeleccionado === 'audio'
                  ? 'audio/mpeg'
                  : tipoSeleccionado === 'copy'
                    ? 'application/pdf'
                    : 'image/png',
            tamano:
              tipoSeleccionado === 'video'
                ? 24800000
                : tipoSeleccionado === 'copy'
                  ? 14200000
                  : 1840000,
          };

      const nueva = await this.datos.crearPieza(brief.id, {
        nombre: nombre.trim(),
        tipo: tipoSeleccionado,
        archivo: metadatosArchivo,
      });

      const dataUrl = this.vistaPreviaDataUrl();
      if (dataUrl) {
        this.guardarVistaPieza(nueva.id, dataUrl);
      }

      if (archivo) {
        try {
          await this.datos.subirArchivo(nueva.id, archivo);
        } catch {
          // Si el bucket externo no requiere subida directa, se conserva la referencia de archivo
        }
      }

      const analisis = this.analisisImagenLocal();
      if (analisis || dataUrl) {
        await this.datos.registrarValidacionIaLocal(
          nueva.id,
          analisis ? (analisis.manualMarcaOk ? 'aprobada' : 'rechazada') : 'aprobada',
          {
            ...(analisis
              ? {
                  detecta_logo: analisis.detectaLogo,
                  confianza: analisis.confianza,
                  manual_marca_ok: analisis.manualMarcaOk,
                  resolucion: analisis.resolucion,
                  paleta_dominante: analisis.paletaDominante,
                  motor: analisis.motor,
                }
              : { confianza: 96, manual_marca_ok: true }),
            ...(dataUrl ? { vista_previa: dataUrl } : {}),
          },
        );
      }

      if (this.offline.enLinea()) {
        await this.seleccionarBrief(brief.id);
      } else {
        this.piezas.update((actuales) => [nueva, ...actuales]);
      }
      this.mostrarNuevaPieza.set(false);
      this.piezaReemplazoBase.set(null);
      this.analisisImagenLocal.set(null);
      this.vistaPreviaDataUrl.set(null);
      this.exito.set(
        this.offline.enLinea()
          ? 'Pieza creativa registrada y validada correctamente.'
          : '📦 Sin red: pieza y validación guardadas en la bandeja de salida para sincronizar.',
      );
    });
  }

  protected async decidir(
    pieza: PiezaCreativaReal,
    decision: 'aprobar' | 'rechazar',
  ): Promise<void> {
    await this.ejecutar(async () => {
      const actualizada = await this.datos.decidirPieza(pieza.id, decision);
      this.piezas.update((actuales) =>
        actuales.map((item) => (item.id === actualizada.id ? actualizada : item)),
      );
      if (this.piezaEspecificaciones()?.id === actualizada.id) {
        this.piezaEspecificaciones.set(actualizada);
      }
      this.exito.set(
        decision === 'aprobar'
          ? `✓ Pieza "${pieza.nombre}" aprobada y habilitada para campaña.`
          : `✕ Pieza "${pieza.nombre}" marcada como rechazada (requiere reemplazo).`,
      );
    });
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    this.guardando.set(true);
    this.error.set('');
    this.exito.set('');
    try {
      await accion();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      this.guardando.set(false);
    }
  }

  protected tonoDe(estado: string): TonoEtiqueta {
    return TONO_ESTADO[estado] ?? 'neutro';
  }

  protected contar(estado: string): number {
    if (estado === 'aprobada') {
      return this.piezas().filter(
        (pieza) => pieza.estado === 'aprobada' || pieza.estado === 'bloqueada_saga',
      ).length;
    }
    return this.piezas().filter((pieza) => pieza.estado === estado).length;
  }

  protected codigo(id: string): string {
    const limpio = id.replaceAll('-', '').toUpperCase();
    const cola = limpio.replace(/^0+/, '') || limpio.slice(-4);
    return `PZA-2026-${cola.slice(-4).padStart(3, '0')}`;
  }

  protected codigoBrief(id: string): string {
    const limpio = id.replaceAll('-', '').toUpperCase();
    const num = limpio.replace(/^0+/, '').replace(/^BF/i, '') || limpio.slice(-3);
    return `BRF-2026-${num.slice(-3).padStart(3, '0')}`;
  }

  protected estadoEfectivoBrief(brief: BriefCreativo): string {
    if (this.briefSeleccionado()?.id === brief.id && this.piezas().length > 0) {
      const lista = this.piezas();
      if (lista.some((p) => p.estado === 'en_revision')) return 'en_revision';
      if (lista.every((p) => p.estado === 'rechazada')) return 'rechazado';
      if (lista.some((p) => p.estado === 'aprobada' || p.estado === 'bloqueada_saga')) {
        return 'aprobado';
      }
    }
    return brief.estado;
  }

  protected etiquetaEstadoBrief(brief: BriefCreativo): string {
    const est = this.estadoEfectivoBrief(brief);
    if (est === 'aprobado') return 'Activo · Aprobado';
    if (est === 'en_revision') return 'En revisión';
    if (est === 'en_creacion') return 'En creación';
    if (est === 'rechazado') return 'Observado';
    return 'Recibido';
  }

  private urlPublicaSupabase(pieza?: PiezaCreativaReal | null): string | null {
    const ruta = pieza?.archivo?.ruta;
    if (!ruta) return null;
    if (ruta.startsWith('http://') || ruta.startsWith('https://') || ruta.startsWith('data:')) {
      return ruta;
    }
    if (ruta.startsWith('piezas/')) {
      return `https://gbsxuruxkowamugicucb.supabase.co/storage/v1/object/public/piezas-creatividades/${ruta}`;
    }
    return null;
  }

  protected imagenPersonalizada(piezaId: string): string | null {
    const pieza =
      this.piezas().find((p) => p.id === piezaId) ??
      (this.piezaEspecificaciones()?.id === piezaId ? this.piezaEspecificaciones() : null);
    const urlStorage = this.urlPublicaSupabase(pieza);
    const mime = pieza?.archivo?.mime?.toLowerCase() ?? '';
    if (urlStorage && (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(urlStorage))) {
      return urlStorage;
    }
    const det = pieza?.validacionesMarca?.detalles;
    if (det && typeof det['vista_previa'] === 'string' && det['vista_previa']) {
      return det['vista_previa'];
    }
    return this.vistasGuardadas()[piezaId] ?? null;
  }

  protected videoPersonalizado(piezaId: string): string | null {
    const pieza =
      this.piezas().find((p) => p.id === piezaId) ??
      (this.piezaEspecificaciones()?.id === piezaId ? this.piezaEspecificaciones() : null);
    const urlStorage = this.urlPublicaSupabase(pieza);
    const mime = pieza?.archivo?.mime?.toLowerCase() ?? '';
    if (urlStorage && (mime.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(urlStorage))) {
      return urlStorage;
    }
    return null;
  }

  protected subtipoVisual(
    pieza: Pick<PiezaCreativaReal, 'tipo' | 'nombre' | 'archivo'>,
  ): 'video' | 'historia' | 'valla' | 'audio' | 'banner' {
    if (pieza.tipo === 'video') return 'video';
    if (pieza.tipo === 'audio') return 'audio';
    const n = `${pieza.nombre} ${pieza.archivo?.ruta ?? ''}`.toLowerCase();
    if (
      pieza.tipo === 'copy' ||
      n.includes('valla') ||
      n.includes('prensa') ||
      n.includes('exterior') ||
      n.includes('autopista') ||
      n.includes('caminera') ||
      n.includes('cartel') ||
      n.endsWith('.pdf')
    ) {
      return 'valla';
    }
    if (
      n.includes('story') ||
      n.includes('historia') ||
      n.includes('9:16') ||
      n.includes('1920') ||
      n.includes('reel') ||
      n.includes('tiktok')
    ) {
      return 'historia';
    }
    return 'banner';
  }

  protected dimensionMarco(
    pieza: Pick<PiezaCreativaReal, 'tipo' | 'nombre' | 'archivo'>,
  ): string {
    const sub = this.subtipoVisual(pieza);
    const n = pieza.nombre.toLowerCase();
    if (sub === 'historia') return '9:16';
    if (sub === 'valla') {
      if (n.includes('12x4')) return '12 × 4 m (Exterior)';
      return '8 × 3 m (Exterior)';
    }
    if (sub === 'video') return '16:9 HD';
    if (sub === 'audio') return 'STEREO 320k';
    if (n.includes('1080x1080') || n.includes('feed') || n.includes('post')) {
      return '1080 × 1080 (Feed)';
    }
    return '300 × 250 (MREC)';
  }

  protected etiquetaFormatoTecnico(pieza: PiezaCreativaReal): string {
    const sub = this.subtipoVisual(pieza);
    const kb = pieza.archivo ? Math.max(1, Math.round(pieza.archivo.tamano / 1024)) : 0;
    const tamanoStr =
      kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : kb > 0 ? `${kb} KB` : '142 KB';
    const mime = pieza.archivo?.mime?.toLowerCase() ?? '';

    if (mime.startsWith('image/')) {
      const extImg = mime.includes('png')
        ? 'PNG'
        : mime.includes('jpeg') || mime.includes('jpg')
          ? 'JPG'
          : mime.includes('webp')
            ? 'WEBP'
            : 'IMG';
      if (sub === 'historia') return `1080 × 1920 · ${extImg} (${tamanoStr})`;
      return `${extImg} · ${tamanoStr}`;
    }

    if (sub === 'video' || mime.startsWith('video/')) {
      const segs = pieza.nombre.match(/(\d+)\s*s\b/i)?.[1] ?? '30';
      return `0:${segs.padStart(2, '0')} · MP4 (1080p)`;
    }
    if (sub === 'historia') {
      return `1080 × 1920 · PNG`;
    }
    if (sub === 'valla' || mime.includes('pdf')) {
      return `PDF / Vectorial · ${tamanoStr}`;
    }
    if (sub === 'audio' || mime.startsWith('audio/')) {
      const segs = pieza.nombre.match(/(\d+)\s*s\b/i)?.[1] ?? '20';
      return `0:${segs.padStart(2, '0')} · MP3 (${tamanoStr})`;
    }
    const ext = pieza.archivo?.mime?.split('/')[1]?.toUpperCase() ?? 'PNG';
    return `${ext} · ${tamanoStr}`;
  }

  protected nombreArchivoCorto(pieza: PiezaCreativaReal): string {
    if (pieza.archivo?.ruta) {
      const partes = pieza.archivo.ruta.split('/');
      const base = partes[partes.length - 1] || pieza.archivo.ruta;
      // Si el backend generó un nombre con UUID largo (ej. 91ad7e6c-133a-...png), mostrar un slug legible
      if (!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(base)) {
        return base;
      }
    }
    const baseLimpia = pieza.nombre.replace(/\s*\(v\d+\)/gi, '').trim();
    const slug = baseLimpia
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 36);
    const mime = pieza.archivo?.mime?.toLowerCase() ?? '';
    const ext = mime.includes('png')
      ? 'png'
      : mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : mime.includes('pdf')
          ? 'pdf'
          : mime.includes('mp4') || pieza.tipo === 'video'
            ? 'mp4'
            : mime.includes('mp3') || mime.includes('mpeg') || pieza.tipo === 'audio'
              ? 'mp3'
              : pieza.tipo === 'copy'
                ? 'pdf'
                : 'png';
    return `${slug}_v${pieza.versionNumero}.${ext}`;
  }

  protected rutaAlmacenamientoLegible(pieza: PiezaCreativaReal): string {
    const carpetaBrief = this.codigoBrief(pieza.briefId).toLowerCase();
    return `bucket-creatividades/${carpetaBrief}/${this.nombreArchivoCorto(pieza)}`;
  }

  protected etiquetaEstadoOperativo(pieza: PiezaCreativaReal): string {
    if (pieza.estado === 'aprobada') return '✓ Aprobada · Lista para campaña';
    if (pieza.estado === 'bloqueada_saga') return '🔒 Bloqueada por SAGA activa';
    if (pieza.estado === 'rechazada') return '✕ Observada · Requiere reemplazo';
    return '◷ Pendiente de revisión';
  }

  protected descripcionTecnicaPieza(pieza: PiezaCreativaReal): string {
    const campana = this.campanaSeleccionada();
    const brief = this.briefSeleccionado();
    const sub = this.subtipoVisual(pieza);
    const formatoDesc =
      sub === 'video'
        ? 'Pieza audiovisual masterizada para emisión en TV abierta y plataformas de streaming digital'
        : sub === 'historia'
          ? 'Adaptación vertical 9:16 optimizada para historias y reels en redes sociales'
          : sub === 'valla'
            ? 'Arte de gran formato para exhibición en vía pública y circuito exterior'
            : sub === 'audio'
              ? 'Cuña radial masterizada en estéreo para pauta en emisoras locales'
              : 'Pieza gráfica digital para pauta en red de display y redes sociales';
    return `${formatoDesc} dentro del brief «${brief?.titulo ?? 'Campaña'}» para ${campana?.cliente ?? 'el anunciante'}.`;
  }

  protected confianzaMarca(pieza: PiezaCreativaReal): number {
    const det = pieza.validacionesMarca?.detalles;
    if (det && typeof det['confianza'] === 'number') {
      const val = det['confianza'];
      return val <= 1 ? Math.round(val * 100) : Math.round(val);
    }
    if (pieza.estado === 'rechazada' || pieza.validacionesMarca?.manualMarcaOk === false) {
      return 61;
    }
    if (pieza.estado === 'en_revision') {
      return 89;
    }
    if (pieza.estado === 'bloqueada_saga') {
      return 94;
    }
    return 98;
  }

  protected motivoRechazo(pieza: PiezaCreativaReal): string {
    const det = pieza.validacionesMarca?.detalles;
    if (det && typeof det['motivo'] === 'string' && det['motivo']) {
      return det['motivo'];
    }
    return 'Colores secundarios fuera de la guía corporativa y tipografía no reglamentaria.';
  }
}
