/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_RAZORPAY_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
