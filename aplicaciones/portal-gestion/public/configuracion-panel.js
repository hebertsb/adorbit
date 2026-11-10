// Configuración pública de despliegue; no colocar credenciales aquí.
window.adorbitPanelInteligencia = {
  urlModulo: 'http://localhost:4174/remoteEntry.js',
  apiIaUrl: '/api/v1/ia',
};

// Configuracion publica de identidad. Keycloak proxied via nginx or local direct.
const origenIdentidad = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:8180';
window.adorbitIdentidad = {
  autoridad: origenIdentidad + '/realms/adorbit',
  clienteId: 'adorbit-frontend',
  emisorPruebaUrl: origenIdentidad,
  permitirEmisorPrueba: true,
};
