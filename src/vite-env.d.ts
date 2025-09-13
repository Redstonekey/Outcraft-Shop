/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_TEBEX_STORE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
