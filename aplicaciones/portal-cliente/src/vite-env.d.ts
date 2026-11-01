/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_AUTORIDAD?: string;
  readonly VITE_OIDC_CLIENTE_ID?: string;
  readonly VITE_API_FACTURACION_URL?: string;
  readonly VITE_API_CRM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
