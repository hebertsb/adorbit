import { act } from '@testing-library/react';
import { montarPanel } from './montar';
import type { ContextoPanel } from './contexto';

const contexto: ContextoPanel = {
  apiIaUrl: 'http://ia',
  obtenerToken: async () => 't',
  usuario: { nombre: 'Gerencia' },
};

describe('montarPanel (contrato con el contenedor)', () => {
  it('pinta el panel dentro de un Shadow DOM, sin tocar el DOM del anfitrion', async () => {
    const elemento = document.createElement('div');
    document.body.append(elemento);
    const panel = await act(async () => montarPanel(elemento, contexto));

    expect(elemento.shadowRoot).not.toBeNull();
    expect(elemento.childElementCount).toBe(0); // nada en el DOM "normal" del anfitrion
    expect(elemento.shadowRoot?.querySelector('h1')?.textContent).toBe('Panel de inteligencia');
    expect(elemento.shadowRoot?.querySelector('style')).not.toBeNull();
    expect(document.querySelector('h1')).toBeNull(); // el contenido no se filtra al documento

    await act(async () => panel.desmontar());
    expect(elemento.shadowRoot?.childElementCount).toBe(0);
    elemento.remove();
  });

  it('permite cambiar el tema en caliente sin recrear el panel', async () => {
    const elemento = document.createElement('div');
    document.body.append(elemento);
    const panel = await act(async () => montarPanel(elemento, contexto));
    expect(elemento.shadowRoot?.querySelector('.panel')?.hasAttribute('data-tema')).toBe(false);

    await act(async () => panel.actualizarContexto({ tema: 'oscuro' }));
    expect(elemento.shadowRoot?.querySelector('.panel')?.getAttribute('data-tema')).toBe('oscuro');
    await act(async () => panel.desmontar());
    elemento.remove();
  });

  it('dos paneles en la misma pagina no se pisan', async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.append(a, b);
    const pa = await act(async () => montarPanel(a, contexto));
    const pb = await act(async () => montarPanel(b, { ...contexto, usuario: { nombre: 'Otro' } }));
    expect(a.shadowRoot?.textContent).toContain('Gerencia');
    expect(b.shadowRoot?.textContent).toContain('Otro');
    await act(async () => {
      pa.desmontar();
      pb.desmontar();
    });
    a.remove();
    b.remove();
  });
});
