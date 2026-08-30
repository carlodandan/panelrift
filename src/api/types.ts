//
// Mirror of the worker's public contract (manhwa-api/src/types.ts). Kept as a
// hand-written copy rather than imported across package boundaries so the client
// can be deployed independently — if the API adds a field, add it here too.

export interface ManhwaSummary {
	title: string;
	slug: string;
	cover_url: string | null;
	latest_chapter: string | null;
	last_updated: string | null;
	rating: number | null;
}

export interface ChapterRef {
	/** Chapter label as shown upstream, e.g. "155" or "200-side-story-3". */
	number: string;
	/** Opaque upstream id. Never construct one; always read it from a listing. */
	id: string;
	date: string | null;
	published_at: string | null;
}

export interface Manhwa {
	title: string;
	slug: string;
	alternative_title: string | null;
	author: string | null;
	status: string | null;
	cover_url: string | null;
	description: string | null;
	genres: string[];
	rating: number | null;
	rating_count: number | null;
	views: string | null;
	bookmarks: string | null;
	chapter_count: string | null;
	last_updated: string | null;
	chapters: ChapterRef[];
	chapters_truncated: boolean;
}

export interface Chapter {
	id: string;
	manhwa_title: string | null;
	manhwa_slug: string | null;
	chapter_title: string | null;
	prev_chapter_id: string | null;
	next_chapter_id: string | null;
	images: string[];
	page_count: number;
}

export interface ChapterList {
	slug: string;
	total: number;
	page: number;
	per_page: number;
	chapters: ChapterRef[];
}

export interface RankingPeriod {
	period: string;
	manhwa: ManhwaSummary[];
}

export const PERIODS = ['1d', '1w', '1m'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
	'1d': 'Today',
	'1w': 'This week',
	'1m': 'This month',
};

export interface Home {
	'1d': RankingPeriod | null;
	'1w': RankingPeriod | null;
	'1m': RankingPeriod | null;
	/** Periods the API could not fetch. Empty when everything succeeded. */
	errors: string[];
}

export interface SearchResponse {
	term: string;
	count: number;
	results: ManhwaSummary[];
}

export interface ApiErrorBody {
	error: { code: string; message: string };
}

export interface RecentlyAddedItem {
	title: string;
	slug: string;
	cover_url: string | null;
	description: string | null;
	rating: number | null;
	views: number | null;
	badge: string | null;
}

export interface RecentlyAddedResponse {
	sort: string;
	page: number;
	count: number;
	total: number;
	total_pages: number;
	results: RecentlyAddedItem[];
}
