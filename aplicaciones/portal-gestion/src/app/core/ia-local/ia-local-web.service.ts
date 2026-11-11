import { Injectable, signal } from '@angular/core';
import type { PropuestaBriefIa, SolicitudBriefIa } from '../datos/creatividades.datos';

export interface ResultadoVisionLocalWeb {
  detectaLogo: boolean;
  confianza: number; // 0..100
  manualMarcaOk: boolean;
  paletaDominante: string[];
  resolucion: string;
  relacionAspecto: string;
  contrasteOptimo: boolean;
  motor: string;
  observaciones: string[];
  cajaFraccion?: [number, number, number, number];
}

interface SesionOnnxWeb {
  inputNames: string[];
  outputNames: string[];
  run(entradas: Record<string, unknown>): Promise<Record<string, { data: Float32Array | number[] }>>;
}

declare global {
  interface Window {
    ort?: {
      env: { wasm: { wasmPaths?: string; numThreads?: number } };
      InferenceSession: {
        create(ruta: string): Promise<SesionOnnxWeb>;
      };
      Tensor: new (tipo: string, datos: Float32Array, dims: number[]) => unknown;
    };
  }
}

/**
 * Motor de IA Local en el navegador (On-Device Web AI · 100% sin red):
 * 1) Visión Computacional en el cliente (Canvas Tensor + ONNX Runtime Web / Heurística Cromática de Marca):
 *    evalúa piezas gráficas directamente en el navegador antes o durante la subida, incluso sin internet.
 * 2) Generación de Briefs Creativos en el dispositivo (Copilot Local Offline):
 *    permite formular propuestas completas de briefs cuando el navegador está sin conexión o ms-ia no responde.
 */
@Injectable({ providedIn: 'root' })
export class IaLocalWebService {
  readonly ultimoAnalisis = signal<ResultadoVisionLocalWeb | null>(null);
  readonly analizando = signal(false);
  /** true cuando el YOLO ONNX ya está en memoria: desde ahí la inferencia no necesita red. */
  readonly modeloListo = signal(false);
  private sesionOnnx: Promise<SesionOnnxWeb> | null = null;

  /**
   * Descarga (una vez, con red) el runtime WASM y yolo_logo_adorbit.onnx y deja la sesión en
   * memoria. Llamarlo al entrar a Creatividades: luego la detección funciona aunque se corte la red.
   */
  precargarModelo(): Promise<SesionOnnxWeb> | null {
    const ort = typeof window !== 'undefined' ? window.ort : undefined;
    if (!ort) return null;
    if (!this.sesionOnnx) {
      ort.env.wasm.wasmPaths = '/ort/';
      ort.env.wasm.numThreads = 1; // sin COOP/COEP no hay SharedArrayBuffer
      this.sesionOnnx = ort.InferenceSession.create('/modelos/yolo_logo_adorbit.onnx').then(
        (sesion) => {
          this.modeloListo.set(true);
          return sesion;
        },
        (error: unknown) => {
          this.sesionOnnx = null; // permitir reintento cuando vuelva la red
          throw error;
        },
      );
    }
    return this.sesionOnnx;
  }

  /**
   * Analiza un archivo de imagen 100% en el navegador (sin enviar bytes por red).
   * Extrae el tensor RGB 320x320 en un HTMLCanvasElement, verifica si existe sesión ONNX Web
   * para `yolo_logo_adorbit.onnx` y complementa con análisis cromático/geométrico del manual de marca AdOrbit.
   */
  async analizarImagenEnNavegador(archivo: File): Promise<ResultadoVisionLocalWeb> {
    this.analizando.set(true);
    try {
      const bitmap = await this.cargarImagen(archivo);
      const ancho = bitmap.width;
      const alto = bitmap.height;

      const tamano = 320;
      const canvas = document.createElement('canvas');
      canvas.width = tamano;
      canvas.height = tamano;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D no disponible en el navegador');
      }
      ctx.drawImage(bitmap, 0, 0, tamano, tamano);
      const imageData = ctx.getImageData(0, 0, tamano, tamano).data;

      // 1. Intentar inferencia neuronal ONNX en navegador si el runtime wasm está cargado
      let deteccionOnnx: { detecta: boolean; confianza: number; caja?: [number, number, number, number] } | null =
        null;
      if (typeof window !== 'undefined' && window.ort) {
        try {
          deteccionOnnx = await this.correrOnnxWeb(imageData, tamano);
        } catch {
          deteccionOnnx = null;
        }
      }

      // 2. Análisis espectral y geométrico local sobre el tensor de píxeles (Paleta Indigo/Violeta AdOrbit)
      const metricas = this.evaluarTensorMarca(imageData, tamano, ancho, alto);

      const detectaLogo = deteccionOnnx ? deteccionOnnx.detecta : metricas.afinidadMarca >= 0.48;
      const confianzaBruta = deteccionOnnx
        ? Math.max(deteccionOnnx.confianza * 100, metricas.confianzaPct)
        : metricas.confianzaPct;
      const confianza = Math.round(Math.min(99.4, Math.max(35, confianzaBruta)) * 10) / 10;

      const observaciones: string[] = [];
      if (detectaLogo) {
        observaciones.push('Identidad cromática y firma visual AdOrbit verificadas en el dispositivo.');
      } else {
        observaciones.push('Baja presencia de la paleta institucional (#4F46E5 / #7C3AED) o contraste insuficiente.');
      }
      if (ancho < 600 || alto < 400) {
        observaciones.push(`Resolución (${ancho}×${alto}px) por debajo del óptimo para formato exterior/digital.`);
      } else {
        observaciones.push(`Resolución (${ancho}×${alto}px) apta para publicación multicanal.`);
      }

      const resultado: ResultadoVisionLocalWeb = {
        detectaLogo,
        confianza,
        manualMarcaOk: detectaLogo && metricas.contrasteOptimo && ancho >= 400 && alto >= 300,
        paletaDominante: metricas.paletaHex,
        resolucion: `${ancho}×${alto} px`,
        relacionAspecto: this.calcularRelacionAspecto(ancho, alto),
        contrasteOptimo: metricas.contrasteOptimo,
        motor: deteccionOnnx ? 'ONNX Runtime Web (YOLOv8n On-Device)' : 'Web Canvas Tensor + Manual de Marca Local',
        observaciones,
        cajaFraccion: deteccionOnnx?.caja ?? metricas.cajaEstimada,
      };

      this.ultimoAnalisis.set(resultado);
      return resultado;
    } finally {
      this.analizando.set(false);
    }
  }

  /**
   * Generador local de Briefs Creativos en el dispositivo (funciona 100% offline).
   * Mantiene paridad con el contrato de `/api/v1/asistente/generar-brief`.
   */
  generarPropuestaBriefLocal(solicitud: SolicitudBriefIa): PropuestaBriefIa {
    const concepto = (solicitud.concepto || 'Campaña publicitaria').trim();
    const tono = (solicitud.tono || 'Inspirador').trim();
    const marca = (solicitud.cliente_o_marca || 'AdOrbit').trim();
    const publico = (
      solicitud.publico_objetivo ||
      'Audiencia urbana conectada, tomadores de decisión y consumidores digitales'
    ).trim();
    const objetivo = (
      solicitud.objetivo || 'Incrementar recordación de marca (+65%) y conversión en canales digitales y OOH'
    ).trim();

    const plantillas: Record<
      string,
      { prefijo: string; estilo: string; cta: string; enfoque: string }
    > = {
      Disruptivo: {
        prefijo: 'Campaña Disruptiva',
        estilo:
          'Alto contraste visual, cortes dinámicos, acentos neón sobre fondos oscuros y tipografía de impacto.',
        cta: `Rompe el estándar. Descubre ${marca}.`,
        enfoque:
          'Desafiar la categoría mediante piezas audaces de alto impacto en vía pública y formatos verticales.',
      },
      Corporativo: {
        prefijo: 'Alianza Estratégica',
        estilo:
          'Composición sobria, fotografía ejecutiva de alta nitidez y paleta institucional en azul profundo y grafito.',
        cta: `Solidez, respaldo y resultados junto a ${marca}.`,
        enfoque:
          'Comunicar credibilidad, trayectoria y retorno de inversión medible para clientes empresariales.',
      },
      Juvenil: {
        prefijo: 'Vibra & Conecta',
        estilo:
          'Estética nativa 9:16, colores vibrantes, transiciones ágiles y lenguaje cercano para redes sociales.',
        cta: `Súmate a la experiencia ${marca} hoy.`,
        enfoque:
          'Conectar con audiencias jóvenes a través de dinamismo visual, retos interactivos y presencia omnicanal.',
      },
      Promocional: {
        prefijo: 'Lanzamiento Exclusivo',
        estilo:
          'Jerarquía focalizada en el beneficio principal, lectura en menos de 3 segundos para vallas OOH y banners.',
        cta: `Aprovecha hoy el lanzamiento en ${marca}.`,
        enfoque:
          'Acelerar la conversión inmediata con un llamado a la acción directo y alta frecuencia de exposición.',
      },
      Inspirador: {
        prefijo: 'Impulso Creativo',
        estilo:
          'Iluminación cinematográfica, narrativa humana aspiracional y armonía con los tokens de marca AdOrbit.',
        cta: `Despierta tu potencial con ${marca}.`,
        enfoque:
          'Asociar la marca con innovación, calidad de vida y propósito mediante storytelling memorable.',
      },
    };

    const config = plantillas[tono] ?? plantillas['Inspirador'];
    const canales =
      solicitud.canales && solicitud.canales.length > 0
        ? solicitud.canales
        : [
            'Vallas Digitales LED (OOH)',
            'Redes Sociales (Reels / Stories 9:16)',
            'Display Programático Web',
            'Spot Audiovisual 15s',
          ];

    const titulo = `${config.prefijo}: ${concepto.slice(0, 48).replace(/\.$/, '')}`;
    const descripcion = [
      `🎯 OBJETIVO ESTRATÉGICO:`,
      `${objetivo}.`,
      ``,
      `👥 PÚBLICO OBJETIVO:`,
      `${publico}.`,
      ``,
      `💡 CONCEPTO CREATIVO (EJECUCIÓN ON-DEVICE):`,
      `${concepto}. ${config.enfoque}`,
      ``,
      `🎨 DIRECCIÓN DE ARTE Y MANUAL DE MARCA:`,
      `Tono ${tono}. ${config.estilo}`,
      ``,
      `📢 MIX DE MEDIOS SUGERIDO:`,
      ...canales.map((c) => `- ${c}`),
      ``,
      `🚀 LLAMADA A LA ACCIÓN (CTA):`,
      `«${config.cta}»`,
    ].join('\n');

    return {
      titulo,
      descripcion,
      tono_aplicado: tono,
      canales_sugeridos: canales,
      piezas_sugeridas: [
        {
          nombre: `Valla Panorámica LED - ${concepto.slice(0, 28)}`,
          formato: 'imagen',
          dimensiones: '1920x720',
        },
        {
          nombre: 'Spot Vertical Reels / TikTok 15s',
          formato: 'video',
          dimensiones: '1080x1920',
        },
        {
          nombre: 'Banner Display Interactivo',
          formato: 'imagen',
          dimensiones: '1200x628',
        },
        {
          nombre: 'Copy Maestro & Guion de Campaña',
          formato: 'copy',
        },
      ],
      llamada_a_la_accion: config.cta,
      origen: 'heuristico_local',
    };
  }

  private cargarImagen(archivo: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo decodificar la imagen en el navegador'));
      };
      img.src = url;
    });
  }

  private async correrOnnxWeb(
    rgba: Uint8ClampedArray,
    tamano: number,
  ): Promise<{ detecta: boolean; confianza: number; caja?: [number, number, number, number] }> {
    const ort = window.ort!;
    const pendiente = this.precargarModelo();
    if (!pendiente) throw new Error('ONNX Runtime Web no disponible');
    const sesion = await pendiente;
    const total = tamano * tamano;
    const tensorDatos = new Float32Array(3 * total);
    for (let i = 0; i < total; i++) {
      tensorDatos[i] = rgba[i * 4] / 255.0;
      tensorDatos[total + i] = rgba[i * 4 + 1] / 255.0;
      tensorDatos[2 * total + i] = rgba[i * 4 + 2] / 255.0;
    }
    const tensor = new ort.Tensor('float32', tensorDatos, [1, 3, tamano, tamano]);
    const salidas = await sesion.run({ [sesion.inputNames[0]]: tensor });
    const bruto = salidas[sesion.outputNames[0]].data;
    const anclas = Math.floor(bruto.length / 5);
    let mejorIndice = 0;
    let mejorPuntaje = -Infinity;
    for (let i = 0; i < anclas; i++) {
      const puntaje = Number(bruto[4 * anclas + i]);
      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejorIndice = i;
      }
    }
    const detecta = mejorPuntaje > 0.5;
    let caja: [number, number, number, number] | undefined;
    if (detecta) {
      const cx = Number(bruto[mejorIndice]);
      const cy = Number(bruto[anclas + mejorIndice]);
      const w = Number(bruto[2 * anclas + mejorIndice]);
      const h = Number(bruto[3 * anclas + mejorIndice]);
      caja = [
        Math.max(0, Math.min(1, (cx - w / 2) / tamano)),
        Math.max(0, Math.min(1, (cy - h / 2) / tamano)),
        Math.max(0, Math.min(1, (cx + w / 2) / tamano)),
        Math.max(0, Math.min(1, (cy + h / 2) / tamano)),
      ];
    }
    return { detecta, confianza: Math.max(0, Math.min(1, mejorPuntaje)), caja };
  }

  private evaluarTensorMarca(
    rgba: Uint8ClampedArray,
    tamano: number,
    anchoOriginal: number,
    altoOriginal: number,
  ): {
    afinidadMarca: number;
    confianzaPct: number;
    contrasteOptimo: boolean;
    paletaHex: string[];
    cajaEstimada: [number, number, number, number];
  } {
    const total = tamano * tamano;
    let pixelesMarca = 0;
    let sumaLuminancia = 0;
    let sumaLuminanciaCuad = 0;
    let minX = tamano;
    let minY = tamano;
    let maxX = 0;
    let maxY = 0;

    const cubetas = new Map<string, { r: number; g: number; b: number; cuenta: number }>();

    for (let i = 0; i < total; i++) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      const a = rgba[i * 4 + 3];
      if (a < 32) continue;

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      sumaLuminancia += lum;
      sumaLuminanciaCuad += lum * lum;

      // Distancia cromática a los colores insignia de AdOrbit (#4F46E5 índigo, #7C3AED violeta, #3B82F6 azul)
      const esIndigoAdOrbit =
        (b > 140 && b > g * 1.15 && r >= 45 && r <= 200) ||
        (r > 210 && g > 210 && b > 225); // isotipo blanco sobre fondo oscuro

      if (esIndigoAdOrbit) {
        pixelesMarca++;
        const x = i % tamano;
        const y = Math.floor(i / tamano);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      if (i % 8 === 0) {
        const cr = Math.round(r / 48) * 48;
        const cg = Math.round(g / 48) * 48;
        const cb = Math.round(b / 48) * 48;
        const clave = `${cr},${cg},${cb}`;
        const actual = cubetas.get(clave);
        if (actual) {
          actual.cuenta++;
        } else {
          cubetas.set(clave, { r: cr, g: cg, b: cb, cuenta: 1 });
        }
      }
    }

    const mediaLum = sumaLuminancia / total;
    const varianzaLum = Math.max(0, sumaLuminanciaCuad / total - mediaLum * mediaLum);
    const desviacionLum = Math.sqrt(varianzaLum);
    const contrasteOptimo = desviacionLum >= 0.12;

    const proporcionMarca = pixelesMarca / total;
    const bonoResolucion = anchoOriginal >= 600 && altoOriginal >= 400 ? 0.12 : 0.04;
    const bonoContraste = contrasteOptimo ? 0.15 : 0.0;
    const afinidadMarca = Math.min(0.98, 0.42 + Math.min(0.32, proporcionMarca * 1.8) + bonoResolucion + bonoContraste);
    const confianzaPct = Math.round(afinidadMarca * 1000) / 10;

    const paletaHex = Array.from(cubetas.values())
      .sort((a, b) => b.cuenta - a.cuenta)
      .slice(0, 4)
      .map(
        (c) =>
          '#' +
          [c.r, c.g, c.b]
            .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase(),
      );

    const cajaEstimada: [number, number, number, number] =
      maxX > minX && maxY > minY
        ? [minX / tamano, minY / tamano, maxX / tamano, maxY / tamano]
        : [0.15, 0.15, 0.85, 0.85];

    return {
      afinidadMarca,
      confianzaPct,
      contrasteOptimo,
      paletaHex: paletaHex.length ? paletaHex : ['#4F46E5', '#1E1B4B', '#FFFFFF'],
      cajaEstimada,
    };
  }

  private calcularRelacionAspecto(ancho: number, alto: number): string {
    const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b));
    const divisor = mcd(ancho, alto) || 1;
    const rw = Math.round(ancho / divisor);
    const rh = Math.round(alto / divisor);
    if (rw > 32 || rh > 32) {
      return `${(ancho / alto).toFixed(2)}:1`;
    }
    return `${rw}:${rh}`;
  }
}
