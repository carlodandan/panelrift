import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { ChapterRef } from '../api/types';
import { chapterDate, formatChapterNumber, chapterNumberFromId } from '../lib/format';
import { cn } from '../lib/cn';

// In-memory cache for series chapter lists to prevent refetching on every chapter switch
const chaptersCache = new Map<string, ChapterRef[]>();

export function useSeriesChapters(slug: string | null | undefined) {
	const [chapters, setChapters] = useState<ChapterRef[]>(() => {
		return slug && chaptersCache.has(slug) ? chaptersCache.get(slug)! : [];
	});
	const [loading, setLoading] = useState<boolean>(() => {
		return Boolean(slug && !chaptersCache.has(slug));
	});
	const [error, setError] = useState<Error | null>(null);

	const fetchChapters = useCallback(async (seriesSlug: string, signal?: AbortSignal) => {
		if (chaptersCache.has(seriesSlug)) {
			setChapters(chaptersCache.get(seriesSlug)!);
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const firstPage = await api.chapters(seriesSlug, 1, 500, signal);
			let all = firstPage.chapters;

			if (firstPage.total > all.length) {
				const totalPages = Math.ceil(firstPage.total / firstPage.per_page);
				const extraFetches = [];
				for (let page = 2; page <= Math.min(totalPages, 10); page++) {
					extraFetches.push(api.chapters(seriesSlug, page, firstPage.per_page, signal));
				}
				const results = await Promise.all(extraFetches);
				for (const res of results) {
					all = all.concat(res.chapters);
				}
			}

			chaptersCache.set(seriesSlug, all);
			if (!signal?.aborted) {
				setChapters(all);
				setLoading(false);
			}
		} catch (err) {
			if (!signal?.aborted) {
				setError(err instanceof Error ? err : new Error(String(err)));
				setLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		if (!slug) return;
		const controller = new AbortController();
		fetchChapters(slug, controller.signal);
		return () => controller.abort();
	}, [slug, fetchChapters]);

	const reload = useCallback(() => {
		if (slug) {
			chaptersCache.delete(slug);
			fetchChapters(slug);
		}
	}, [slug, fetchChapters]);

	return { chapters, loading, error, reload };
}

function parseChapterFloat(numStr: string, id: string): number {
	const cleaned = numStr.replace(/^[^\d.]*/, '').split(/[^0-9.]/)[0] ?? '';
	const val = parseFloat(cleaned);
	if (Number.isFinite(val)) return val;
	const fromId = chapterNumberFromId(id);
	if (fromId) {
		const valId = parseFloat(fromId);
		if (Number.isFinite(valId)) return valId;
	}
	return 0;
}

export interface ChapterChooserDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	slug: string | null | undefined;
	currentChapterId: string;
	seriesTitle?: string | null;
	onSelectChapter: (chapterId: string) => void;
}

export function ChapterChooserDrawer({
	isOpen,
	onClose,
	slug,
	currentChapterId,
	seriesTitle,
	onSelectChapter,
}: ChapterChooserDrawerProps) {
	const { chapters, loading, error, reload } = useSeriesChapters(slug);
	const [searchQuery, setSearchQuery] = useState('');
	const [sortAsc, setSortAsc] = useState(false); // Default: false = newest first (N -> 1)
	const activeItemRef = useRef<HTMLLIElement | null>(null);
	const searchInputRef = useRef<HTMLInputElement | null>(null);

	// Lock background scroll when drawer is open
	useEffect(() => {
		if (!isOpen) return;
		const origOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = origOverflow;
		};
	}, [isOpen]);

	// Escape key to close
	useEffect(() => {
		if (!isOpen) return;
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onClose();
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [isOpen, onClose]);

	// Auto-scroll to active chapter when opened
	useEffect(() => {
		if (isOpen && activeItemRef.current) {
			const timer = setTimeout(() => {
				activeItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
			}, 80);
			return () => clearTimeout(timer);
		}
	}, [isOpen, chapters, sortAsc]);

	// Focus input on open for quick keyboard typing
	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				searchInputRef.current?.focus();
			}, 100);
			return () => clearTimeout(timer);
		} else {
			setSearchQuery('');
		}
	}, [isOpen]);

	// Filter and sort chapters
	const filteredChapters = useMemo(() => {
		let list = chapters;
		const q = searchQuery.trim().toLowerCase();
		if (q) {
			list = list.filter((ch) => {
				const formatted = formatChapterNumber(ch.number).toLowerCase();
				const rawNum = ch.number.toLowerCase();
				const id = ch.id.toLowerCase();
				return formatted.includes(q) || rawNum.includes(q) || id.includes(q);
			});
		}

		return [...list].sort((a, b) => {
			const numA = parseChapterFloat(a.number, a.id);
			const numB = parseChapterFloat(b.number, b.id);
			return sortAsc ? numA - numB : numB - numA;
		});
	}, [chapters, searchQuery, sortAsc]);

	// First & latest chapters for quick jumps
	const { firstChapter, latestChapter, currentChapter } = useMemo(() => {
		if (chapters.length === 0) {
			return { firstChapter: null, latestChapter: null, currentChapter: null };
		}
		const sorted = [...chapters].sort((a, b) => {
			const numA = parseChapterFloat(a.number, a.id);
			const numB = parseChapterFloat(b.number, b.id);
			return numA - numB;
		});
		return {
			firstChapter: sorted[0] ?? null,
			latestChapter: sorted[sorted.length - 1] ?? null,
			currentChapter: chapters.find((ch) => ch.id === currentChapterId) ?? null,
		};
	}, [chapters, currentChapterId]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-start sm:items-center sm:pt-14"
			role="dialog"
			aria-modal="true"
			aria-label="Choose chapter"
			data-no-reader-tap="true"
		>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal Panel */}
			<div
				className="relative z-10 flex w-full max-w-xl flex-col rounded-b-2xl border-b border-x border-ink-800 bg-ink-900 shadow-2xl sm:rounded-2xl sm:border sm:max-h-[85vh]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-ink-800 px-4 py-3 sm:px-5">
					<div className="min-w-0 flex-1 pr-2">
						<div className="flex items-center gap-2">
							<h2 className="text-base font-semibold text-ink-100">Choose Chapter</h2>
							{chapters.length > 0 && (
								<span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs font-normal text-ink-400">
									{chapters.length} total
								</span>
							)}
						</div>
						{seriesTitle && <p className="truncate text-xs text-ink-400">{seriesTitle}</p>}
					</div>

					<div className="flex items-center gap-2">
						{/* Sort toggle */}
						<button
							type="button"
							onClick={() => setSortAsc((prev) => !prev)}
							className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-850 px-2.5 text-xs font-medium text-ink-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
							title={
								sortAsc
									? 'Sorting oldest first (click for newest)'
									: 'Sorting newest first (click for oldest)'
							}
						>
							<svg
								viewBox="0 0 20 20"
								fill="currentColor"
								className="h-3.5 w-3.5"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8 6.4a.75.75 0 00-1.06.04l-1.95 2.1V6.75a.75.75 0 00-1.5 0v8.59l-1.95-2.1a.75.75 0 10-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 00-.04-1.06z"
									clipRule="evenodd"
								/>
							</svg>
							<span>{sortAsc ? '1 → N' : 'N → 1'}</span>
						</button>

						{/* Close button */}
						<button
							type="button"
							onClick={onClose}
							className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
							aria-label="Close"
						>
							<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
								<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
							</svg>
						</button>
					</div>
				</div>

				{/* Search & Quick Jumps */}
				<div className="border-b border-ink-800 p-3 sm:px-5">
					<div className="relative">
						<input
							ref={searchInputRef}
							type="text"
							inputMode="numeric"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Filter chapter number (e.g. 45)..."
							className="w-full rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2 pl-9 pr-8 text-sm text-ink-100 placeholder-ink-400 transition focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
						/>
						<svg
							viewBox="0 0 20 20"
							fill="currentColor"
							className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-400"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
								clipRule="evenodd"
							/>
						</svg>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery('')}
								className="absolute right-2.5 top-2.5 rounded p-0.5 text-xs text-ink-400 hover:text-ink-100"
								aria-label="Clear filter"
							>
								✕
							</button>
						)}
					</div>

					{/* Quick Jumps */}
					<div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
						<span className="text-ink-400 mr-1 shrink-0">Jump:</span>
						{firstChapter && (
							<button
								type="button"
								onClick={() => {
									onSelectChapter(firstChapter.id);
									onClose();
								}}
								className="shrink-0 rounded-md bg-ink-800 px-2 py-1 text-ink-300 transition hover:bg-ink-700 hover:text-ink-100"
							>
								First ({formatChapterNumber(firstChapter.number)})
							</button>
						)}
						{currentChapter && (
							<button
								type="button"
								onClick={() =>
									activeItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
								}
								className="shrink-0 rounded-md bg-accent-600/20 border border-accent-500/40 px-2 py-1 text-accent-300 transition hover:bg-accent-600/30"
							>
								Current ({formatChapterNumber(currentChapter.number)})
							</button>
						)}
						{latestChapter && (
							<button
								type="button"
								onClick={() => {
									onSelectChapter(latestChapter.id);
									onClose();
								}}
								className="shrink-0 rounded-md bg-ink-800 px-2 py-1 text-ink-300 transition hover:bg-ink-700 hover:text-ink-100"
							>
								Latest ({formatChapterNumber(latestChapter.number)})
							</button>
						)}
					</div>
				</div>

				{/* Scrollable List */}
				<div className="flex-1 overflow-y-auto max-h-[50vh] sm:max-h-[60vh] divide-y divide-ink-800/60 p-2">
					{loading ? (
						<div className="space-y-2 p-2">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="h-11 rounded-lg bg-ink-800/60 skeleton" />
							))}
						</div>
					) : error ? (
						<div className="p-6 text-center text-sm text-ink-400">
							<p>Could not load chapter list.</p>
							<button
								type="button"
								onClick={reload}
								className="mt-3 rounded-md bg-ink-800 px-3.5 py-1.5 text-xs text-ink-100 hover:bg-ink-700 transition"
							>
								Retry
							</button>
						</div>
					) : filteredChapters.length === 0 ? (
						<div className="p-8 text-center text-sm text-ink-400">
							No chapters match &ldquo;{searchQuery}&rdquo;.
						</div>
					) : (
						<ul role="listbox" className="space-y-1">
							{filteredChapters.map((ch) => {
								const isCurrent = ch.id === currentChapterId;
								const dateStr = chapterDate(ch.published_at, ch.date);
								return (
									<li
										key={ch.id}
										ref={isCurrent ? activeItemRef : undefined}
										role="option"
										aria-selected={isCurrent}
									>
										<button
											type="button"
											onClick={() => {
												onSelectChapter(ch.id);
												onClose();
											}}
											className={cn(
												'flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
												isCurrent
													? 'bg-accent-600/20 text-accent-300 font-semibold ring-1 ring-accent-500/50'
													: 'text-ink-200 hover:bg-ink-800 hover:text-ink-100',
											)}
										>
											<div className="min-w-0 flex-1 flex items-center gap-2">
												<span className="truncate">Chapter {formatChapterNumber(ch.number)}</span>
												{isCurrent && (
													<span className="shrink-0 rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-medium text-accent-400">
														Reading
													</span>
												)}
											</div>
											{dateStr && (
												<span className="ml-3 shrink-0 text-xs text-ink-400">{dateStr}</span>
											)}
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
