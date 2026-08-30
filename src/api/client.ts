// src/api/client.ts

import type { Chapter, ChapterList, Home, Manhwa, RankingPeriod, RecentlyAddedResponse, SearchResponse } from './types';

/**
 * Stays empty in both dev and production, so every request is same-origin under
 * `/api`: vite proxies that to the local worker in dev, and the Pages Function at
 * functions/api/[[path]].ts forwards it over a service binding in a deploy.
 *
 * Set VITE_API_BASE_URL only to talk to a deployed worker directly, which then
 * has to allow this origin in its ALLOWED_ORIGINS list.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '') || '/api';

/** An error carrying the API's own code so the UI can react to it specifically. */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
		this.name = 'ApiError';
	}

	/** A bad slug or chapter id is permanent; retrying it is pointless. */
	get isPermanent(): boolean {
		return this.status === 404 || this.status === 400;
	}
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${BASE}${path}`, { signal, headers: { Accept: 'application/json' } });
	} catch (cause) {
		// AbortError is the caller's own cancellation; let it through untouched.
		if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
		throw new ApiError(0, 'network_error', 'Could not reach the API. Check your connection.');
	}

	if (!response.ok) {
		// The API always sends the error envelope, but a proxy or gateway in front of
		// it might not, so fall back to the status text rather than throwing on JSON.
		const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
		const error =
			body && typeof body.error === 'object' && body.error !== null
				? (body.error as { code?: string; message?: string })
				: null;
		throw new ApiError(
			response.status,
			error?.code ?? 'http_error',
			error?.message ?? `Request failed with status ${response.status}`,
		);
	}

	return (await response.json()) as T;
}

export const api = {
	home: (signal?: AbortSignal) => request<Home>('/v1/home', signal),

	ranking: (period: string, signal?: AbortSignal) =>
		request<RankingPeriod>(`/v1/home?period=${encodeURIComponent(period)}`, signal),

	search: (term: string, signal?: AbortSignal) =>
		request<SearchResponse>(`/v1/search?term=${encodeURIComponent(term)}`, signal),

	manhwa: (slug: string, signal?: AbortSignal) =>
		request<Manhwa>(`/v1/manhwa/${encodeURIComponent(slug)}`, signal),

	chapters: (slug: string, page: number, perPage: number, signal?: AbortSignal) =>
		request<ChapterList>(
			`/v1/manhwa/${encodeURIComponent(slug)}/chapters?page=${page}&per_page=${perPage}`,
			signal,
		),

	chapter: (chapterId: string, signal?: AbortSignal) =>
		request<Chapter>(`/v1/chapters/${encodeURIComponent(chapterId)}`, signal),

	recentlyAdded: (page = 1, signal?: AbortSignal) =>
		request<RecentlyAddedResponse>(`/v1/recently_added?page=${page}`, signal),
};
