/// <reference types="vite/client" />

// Khai báo để TypeScript nhận biết CSS imports
declare module "*.css" {
  const content: string;
  export default content;
}

// Khai báo env variables của Vite
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
