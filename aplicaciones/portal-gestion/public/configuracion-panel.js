// Configuración pública de despliegue; no colocar credenciales aquí.
const esDevLocal = typeof window !== 'undefined' && window.location.port === '4200';
const origenActual =
  typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:8080';

window.adorbitPanelInteligencia = {
  urlModulo: esDevLocal ? 'http://localhost:4174/remoteEntry.js' : '/panel-inteligencia/remoteEntry.js',
  apiIaUrl: esDevLocal ? 'http://localhost:8000' : origenActual,
};

// Configuración pública de identidad. Keycloak proxied via nginx or local direct.
window.adorbitIdentidad = {
  autoridad: esDevLocal ? 'http://localhost:8180/realms/adorbit' : `${origenActual}/realms/adorbit`,
  clienteId: 'adorbit-frontend',
  emisorPruebaUrl: esDevLocal ? 'http://localhost:8180' : origenActual,
  permitirEmisorPrueba: esDevLocal,
};
