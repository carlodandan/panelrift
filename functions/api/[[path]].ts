// functions/api/[[path]].ts

/**
 * Same-origin proxy in front of the manhwa-api worker.
 *
 * The browser only ever calls `/api/*` on this domain, so CORS never enters the
 * picture. Forwarding happens over a service binding, which Cloudflare dispatches
 * inside its own network rather than over the public internet — that is what lets
 * the worker switch its public hostname off and still be reachable from here.
 *
 * Typed structurally instead of with `PagesFunction` so this needs no
 * `@cloudflare/workers-types` dependency; the handler is plain DOM `Request` in,
 * `Response` out.
 */

interface Env {
	/** Service binding to the deployed `manhwa-api` worker. See wrangler.jsonc. */
	API: { fetch(request: Request): Promise<Response> };
	/**
	 * Shared secret the worker checks before serving anything. Set it on both ends:
	 * `wrangler pages secret put PROXY_SECRET` here, `wrangler secret put
	 * PROXY_SECRET` in ../manga-api. It stays server-side, so unlike anything in the
	 * bundle it is never visible to a browser.
	 */
	PROXY_SECRET?: string;
}

/** The parts of the Pages Functions context this handler touches. */
interface RouteContext {
	request: Request;
	env: Env;
}

export async function onRequest({ request, env }: RouteContext): Promise<Response> {
	const url = new URL(request.url);
	// /api/v1/home?period=1d -> /v1/home?period=1d
	url.pathname = url.pathname.slice('/api'.length) || '/';

	// Forward the original headers rather than building a bare request: the worker
	// rate-limits on CF-Connecting-IP, and without it every visitor shares one
	// bucket, where READ_LIMITER's 60/min would throttle the whole site at once.
	const headers = new Headers(request.headers);

	// Drop any inbound value before setting our own, so a caller cannot smuggle a
	// secret of their choosing through the proxy.
	headers.delete('X-Proxy-Secret');
	if (env.PROXY_SECRET) headers.set('X-Proxy-Secret', env.PROXY_SECRET);

	return env.API.fetch(new Request(url, { method: request.method, headers }));
}
