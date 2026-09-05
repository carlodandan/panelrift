import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import Sitemap from 'vite-plugin-sitemap';

/**
 * The `/api` prefix is proxied to a locally running manhwa-api worker in dev, so
 * the browser only ever talks to one origin and CORS never enters the picture.
 *
 * A deploy keeps the same `/api` prefix: functions/api/[[path]].ts serves it from
 * the Pages project and forwards to the worker over a service binding. So leave
 * VITE_API_BASE_URL unset in both cases — see .env.example.
 */
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			workbox: {
				globPatterns: ['**/*.{js,jsx,ts,tsx,css,html,ico,png,jpg,jpeg,webp,svg,woff,woff2,ttf,eot,xml,txt}'],
			},
		}),
		Sitemap({
			hostname: 'https://panelrift.eu.cc',
			dynamicRoutes: ['/', '/rankings', '/search'],
			readable: true,
			robots: [
				{
					userAgent: '*',
					allow: '/',
					crawlDelay: 2,
				},
			],
		}),
	],
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
