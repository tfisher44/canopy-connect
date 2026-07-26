/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ARCGIS_API_KEY?: string;
  readonly VITE_BRIDGE_LOGGING_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
