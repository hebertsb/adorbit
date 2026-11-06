import { useCallback, useEffect, useRef, useState } from 'react';

interface Reconocimiento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type ConstructorReconocimiento = new () => Reconocimiento;

function constructorDelNavegador(): ConstructorReconocimiento | null {
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MENSAJES: Record<string, string> = {
  'not-allowed': 'No se permitió el micrófono. Habilítelo en el navegador para dictar.',
  'service-not-allowed': 'El navegador no permite el dictado en este sitio.',
  'no-speech': 'No se escuchó nada. Intente de nuevo.',
  'audio-capture': 'No se encontró un micrófono.',
  network: 'El servicio de voz del navegador no está disponible.',
};

/**
 * Dictado con la API de voz del navegador. Se pide reconocimiento LOCAL cuando el navegador lo soporta
 * (`processLocally`); si no, el navegador puede enviar el audio a su proveedor de voz: la interfaz lo avisa.
 */
export function useDictado(alTexto: (texto: string) => void) {
  const [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconocimiento = useRef<Reconocimiento | null>(null);
  const alTextoRef = useRef(alTexto);
  const soportado = constructorDelNavegador() !== null;

  useEffect(() => {
    alTextoRef.current = alTexto;
  });
  useEffect(() => () => reconocimiento.current?.abort(), []);

  const iniciar = useCallback(() => {
    const Constructor = constructorDelNavegador();
    if (!Constructor) return;
    setError(null);
    const r = new Constructor();
    r.lang = 'es-BO';
    r.continuous = false;
    r.interimResults = true;
    if ('processLocally' in r) r.processLocally = true;
    r.onresult = (evento) => {
      const texto = Array.from(evento.results, (resultado) => resultado[0]?.transcript ?? '').join(' ');
      alTextoRef.current(texto.trim());
    };
    r.onerror = (evento) => setError(MENSAJES[evento.error] ?? 'No se pudo dictar. Escriba la pregunta.');
    r.onend = () => setEscuchando(false);
    reconocimiento.current = r;
    try {
      r.start();
      setEscuchando(true);
    } catch {
      setError('No se pudo iniciar el dictado.');
    }
  }, []);

  const detener = useCallback(() => reconocimiento.current?.stop(), []);

  return { soportado, escuchando, error, iniciar, detener };
}
