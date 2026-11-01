import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ContextoPanel, PanelMontado } from './contexto';
import { PanelInteligencia } from './componentes/panel-inteligencia';
import estilos from './estilos/panel.css?inline';

/**
 * Punto de entrada del remoto de Module Federation (`./montar`). No depende del framework del anfitrion:
 * crea un Shadow DOM (sus estilos no se filtran al contenedor Angular ni al reves) y pinta React adentro.
 *
 *   const { montarPanel } = await loadRemote('panel_inteligencia/montar');
 *   const panel = montarPanel(elemento, { apiIaUrl, obtenerToken });
 *   ...
 *   panel.desmontar();   // al destruir la ruta del anfitrion
 */
export function montarPanel(elemento: HTMLElement, contextoInicial: ContextoPanel): PanelMontado {
  const sombra = elemento.shadowRoot ?? elemento.attachShadow({ mode: 'open' });
  const estilo = document.createElement('style');
  estilo.textContent = estilos;
  const raiz = document.createElement('div');
  raiz.className = 'raiz-panel';
  sombra.replaceChildren(estilo, raiz);

  let contexto = contextoInicial;
  const react = createRoot(raiz);
  const pintar = () =>
    react.render(
      <StrictMode>
        <PanelInteligencia contexto={contexto} />
      </StrictMode>,
    );
  pintar();

  return {
    desmontar: () => {
      react.unmount();
      sombra.replaceChildren();
    },
    actualizarContexto: (cambios) => {
      contexto = { ...contexto, ...cambios };
      pintar();
    },
  };
}

export default montarPanel;
