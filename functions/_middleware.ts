/**
 * Cloudflare Pages Middleware
 * Enforces canonical domain (non-www) and HTTPS via 301 Permanent Redirect.
 */

interface MiddlewareContext {
	request: Request;
	next: () => Promise<Response>;
}

export async function onRequest({ request, next }: MiddlewareContext): Promise<Response> {
	const url = new URL(request.url);

	// Redirect www to non-www
	if (url.hostname === 'www.panelrift.eu.cc') {
		url.hostname = 'panelrift.eu.cc';
		url.protocol = 'https:';
		return Response.redirect(url.toString(), 301);
	}

	return next();
}
