/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_AUTORIDAD?: string;
  readonly VITE_OIDC_CLIENTE_ID?: string;
  readonly VITE_API_IA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css?inline' {
  const texto: string;
  export default texto;
}
