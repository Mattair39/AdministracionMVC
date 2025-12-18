import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8081',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'fitFlow',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'proyectocoremvc-web',
  // Configuración para SSO
  enableLogging: true,
  checkLoginIframe: false, // Deshabilitar iframe check para evitar problemas de CORS
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;

