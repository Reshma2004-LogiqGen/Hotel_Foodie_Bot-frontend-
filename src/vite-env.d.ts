/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public address customers open from table QR codes, e.g. https://menu.myrestaurant.com */
  readonly VITE_PUBLIC_APP_URL?: string;
  /** Backend address when it is hosted on another domain, e.g. https://api.myrestaurant.com */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
