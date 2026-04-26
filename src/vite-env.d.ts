/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TMT_API_URL:    string;
  readonly TMT_API_KEY:    string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
