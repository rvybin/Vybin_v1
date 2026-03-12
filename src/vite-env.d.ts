/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PREMIUM_LINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
