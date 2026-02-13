/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  // Add other env vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}