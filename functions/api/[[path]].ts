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
	return env.API.fetch(new Request(url, { method: request.method, headers: request.headers }));
}
