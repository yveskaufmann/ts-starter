/// <reference types="vite/client" />

// The VITE_* variables from .env files, see .env.example
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
