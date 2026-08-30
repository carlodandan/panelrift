import { useCallback, useEffect, useState } from 'react';
import type { ManhwaSummary } from '../api/types';

/**
 * Bookmarks and reading position, persisted in localStorage.
 *
 * Deliberately client-only: the API is stateless and read-only, so there is no
 * account to hang this off. The tradeoff is that the library does not follow the
 * reader to another device, which is the right one for a site with no sign-up.
 */

const BOOKMARKS_KEY = 'panelrift:bookmarks:v1';
const PROGRESS_KEY = 'panelrift:progress:v1';

export interface BookmarkEntry {
	slug: string;
	title: string;
	cover_url: string | null;
	saved_at: number;
}

export interface ProgressEntry {
	slug: string;
	chapterId: string;
	chapterNumber: string;
	read_at: number;
}

function read<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		// Corrupt or unavailable storage (private mode, quota, hand-edited value)
		// must not take the page down with it.
		return fallback;
	}
}

function write(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* Storage full or blocked: the feature degrades, the page keeps working. */
	}
}

/** Notifies hook instances in this tab; `storage` only fires for other tabs. */
const changed = new EventTarget();
const CHANGED = 'panelrift:changed';

function announce(): void {
	changed.dispatchEvent(new Event(CHANGED));
}

function useStoredMap<T>(key: string): [Record<string, T>, (next: Record<string, T>) => void] {
	const [value, setValue] = useState<Record<string, T>>(() => read(key, {}));

	useEffect(() => {
		const sync = () => setValue(read<Record<string, T>>(key, {}));
		changed.addEventListener(CHANGED, sync);
		window.addEventListener('storage', sync);
		return () => {
			changed.removeEventListener(CHANGED, sync);
			window.removeEventListener('storage', sync);
		};
	}, [key]);

	const commit = useCallback(
		(next: Record<string, T>) => {
			write(key, next);
			setValue(next);
			announce();
		},
		[key],
	);

	return [value, commit];
}

export function useBookmarks() {
	const [bookmarks, commit] = useStoredMap<BookmarkEntry>(BOOKMARKS_KEY);

	const isBookmarked = useCallback((slug: string) => slug in bookmarks, [bookmarks]);

	const toggle = useCallback(
		(entry: Omit<BookmarkEntry, 'saved_at'>) => {
			const next = { ...bookmarks };
			if (entry.slug in next) delete next[entry.slug];
			else next[entry.slug] = { ...entry, saved_at: Date.now() };
			commit(next);
		},
		[bookmarks, commit],
	);

	const list = Object.values(bookmarks).sort((a, b) => b.saved_at - a.saved_at);

	return { bookmarks, list, isBookmarked, toggle };
}

export function useProgress() {
	const [progress, commit] = useStoredMap<ProgressEntry>(PROGRESS_KEY);

	const record = useCallback(
		(entry: Omit<ProgressEntry, 'read_at'>) => {
			// Skip the write when nothing moved, so re-entering a chapter does not
			// churn storage or reshuffle the "continue reading" order.
			const existing = progress[entry.slug];
			if (existing?.chapterId === entry.chapterId) return;
			commit({ ...progress, [entry.slug]: { ...entry, read_at: Date.now() } });
		},
		[progress, commit],
	);

	const forSlug = useCallback((slug: string) => progress[slug], [progress]);

	const recent = Object.values(progress).sort((a, b) => b.read_at - a.read_at);

	return { progress, recent, record, forSlug };
}

/** Shape a search/ranking result into a bookmark payload. */
export function toBookmark(item: Pick<ManhwaSummary, 'slug' | 'title' | 'cover_url'>) {
	return { slug: item.slug, title: item.title, cover_url: item.cover_url };
}
