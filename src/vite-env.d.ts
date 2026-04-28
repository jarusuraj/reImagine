
interface ImportMetaEnv {
  readonly TMT_API_URL:    string;
  readonly TMT_API_KEY:    string;
  readonly APP_TITLE:      string;
  readonly APP_SUBTITLE:   string;
  readonly APP_FOOTER:     string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
// TypeScript environment definitions for Vite.
