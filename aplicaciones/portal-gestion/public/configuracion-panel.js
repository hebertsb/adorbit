// Configuración pública de despliegue; no colocar credenciales aquí.
window.adorbitPanelInteligencia = {
  urlModulo: 'http://localhost:4174/remoteEntry.js',
  apiIaUrl: 'http://localhost:8085',
};

// Configuracion publica de identidad. En produccion, cambiar la autoridad por
// el Keycloak real y desactivar el atajo de desarrollo.
window.adorbitIdentidad = {
  autoridad: 'http://localhost:8180/realms/adorbit',
  clienteId: 'adorbit-frontend',
  emisorPruebaUrl: 'http://localhost:8180',
  permitirEmisorPrueba: true,
};
