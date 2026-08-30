import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The `/api` prefix is proxied to a locally running manhwa-api worker in dev, so
 * the browser only ever talks to one origin and CORS never enters the picture.
 * In production set VITE_API_BASE_URL to the deployed worker instead.
 */
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8788',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
	},
	build: {
		target: 'es2023',
		sourcemap: true,
	},
});
