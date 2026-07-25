/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ARCGIS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
