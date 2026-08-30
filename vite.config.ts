import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The `/api` prefix is proxied to a locally running manhwa-api worker in dev, so
 * the browser only ever talks to one origin and CORS never enters the picture.
 *
 * A deploy keeps the same `/api` prefix: functions/api/[[path]].ts serves it from
 * the Pages project and forwards to the worker over a service binding. So leave
 * VITE_API_BASE_URL unset in both cases — see .env.example.
 */
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 5173,
		proxy: {
			'/api': {
				// `wrangler dev` in ../manga-api. The rewrite strips the prefix because
				// this talks to the worker directly, not through the Pages Function.
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
