import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';
import { api } from '../api/client';
import type { BrowseQuery } from '../api/types';
import { useResource } from '../hooks/useResource';
import { SeriesGrid } from '../components/SeriesCard';
import { CardGridSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { Pagination } from '../components/Pagination';
import { cn } from '../lib/cn';

const GENRES = [
	'Action',
	'Adventure',
	'Comedy',
	'Cooking',
	'Drama',
	'Fantasy',
	'Gender bender',
	'Harem',
	'Historical',
	'Horror',
	'Isekai',
	'Josei',
	'Manhua',
	'Manhwa',
	'Martial arts',
	'Mature',
	'Mecha',
	'Medical',
	'Mystery',
	'One shot',
	'Psychological',
	'Romance',
	'School life',
	'Sci fi',
	'Seinen',
	'Shoujo',
	'Shounen',
	'Slice of life',
	'Sports',
	'Supernatural',
	'Tragedy',
	'Webtoons',
	'ladies',
];
const STATUSES = [
	{ label: 'Any', value: '' },
	{ label: 'Ongoing', value: 'ongoing' },
	{ label: 'Completed', value: 'completed' },
	{ label: 'Hiatus', value: 'hiatus' },
];
const SORTS = [
	{ label: 'Recently Added', value: 'recently_added' },
	{ label: 'Latest Update', value: 'latest' },
	{ label: 'Popular Daily', value: 'popular_daily' },
	{ label: 'Popular Weekly', value: 'popular_weekly' },
	{ label: 'Popular Monthly', value: 'popular_monthly' },
	{ label: 'Popular All Time', value: 'popular_all_time' },
	{ label: 'Top Rated', value: 'rating' },
	{ label: 'Title A-Z', value: 'az' },
	{ label: 'Title Z-A', value: 'za' },
];
const TYPES = [
	{ label: 'Any', value: '' },
	{ label: 'Manga', value: 'manga' },
	{ label: 'Manhwa', value: 'manhwa' },
	{ label: 'Manhua', value: 'manhua' },
	{ label: 'Webtoon', value: 'webtoon' },
];

export function BrowsePage() {
	useEffect(() => {
		trackEvent('open_browse');
	}, []);

	const [params, setParams] = useSearchParams();
	const page = Number(params.get('page')) || 1;
	const sort = params.get('sort') || 'recently_added';
	const status = params.get('status') || '';
	const type = params.get('type') || '';
	const includeGenres = params.get('include_genres')
		? params.get('include_genres')!.split(',')
		: [];
	const excludeGenres = params.get('exclude_genres')
		? params.get('exclude_genres')!.split(',')
		: [];

	const query: BrowseQuery = {
		page,
		sort: sort || undefined,
		status: status || undefined,
		type: type || undefined,
		include_genres: includeGenres.length > 0 ? includeGenres.join(',') : undefined,
		exclude_genres: excludeGenres.length > 0 ? excludeGenres.join(',') : undefined,
	};

	const results = useResource((signal) => api.browse(query, signal), [params.toString()]);

	const updateFilter = (updates: Record<string, string | null>) => {
		const next = new URLSearchParams(params);
		next.set('page', '1');
		for (const [key, value] of Object.entries(updates)) {
			if (value === null || value === '') {
				next.delete(key);
			} else {
				next.set(key, value);
			}
		}
		setParams(next);
	};

	const toggleGenre = (genre: string, mode: 'include' | 'exclude' | 'none') => {
		const inc = new Set(includeGenres);
		const exc = new Set(excludeGenres);

		if (mode === 'include') {
			inc.add(genre);
			exc.delete(genre);
		} else if (mode === 'exclude') {
			inc.delete(genre);
			exc.add(genre);
		} else {
			inc.delete(genre);
			exc.delete(genre);
		}

		updateFilter({
			include_genres: inc.size > 0 ? Array.from(inc).join(',') : null,
			exclude_genres: exc.size > 0 ? Array.from(exc).join(',') : null,
		});
	};

	return (
		<div className="flex flex-col md:flex-row gap-8 items-start">
			{/* Filters Sidebar */}
			<aside className="w-full md:w-72 shrink-0 space-y-8 bg-ink-900/50 p-6 rounded-card border border-ink-800">
				<div>
					<h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-300">
						Sort By
					</h3>
					<select
						value={sort}
						onChange={(e) => updateFilter({ sort: e.target.value })}
						className="w-full rounded-md bg-ink-950 border border-ink-700 px-3 py-2 text-sm text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-600 transition"
					>
						{SORTS.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</select>
				</div>
				<div>
					<h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-300">Type</h3>
					<select
						value={type}
						onChange={(e) => updateFilter({ type: e.target.value })}
						className="w-full rounded-md bg-ink-950 border border-ink-700 px-3 py-2 text-sm text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-600 transition"
					>
						{TYPES.map((t) => (
							<option key={t.value} value={t.value}>
								{t.label}
							</option>
						))}
					</select>
				</div>
				<div>
					<h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-300">
						Status
					</h3>
					<select
						value={status}
						onChange={(e) => updateFilter({ status: e.target.value })}
						className="w-full rounded-md bg-ink-950 border border-ink-700 px-3 py-2 text-sm text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-600 transition"
					>
						{STATUSES.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</select>
				</div>
				<div>
					<h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-300">
						Genres
					</h3>
					<div className="flex flex-wrap gap-2">
						{GENRES.map((g) => {
							const isInc = includeGenres.includes(g);
							const isExc = excludeGenres.includes(g);
							return (
								<button
									key={g}
									onClick={() => {
										if (isInc) toggleGenre(g, 'exclude');
										else if (isExc) toggleGenre(g, 'none');
										else toggleGenre(g, 'include');
									}}
									className={cn(
										'rounded-md px-2.5 py-1 text-xs font-medium transition select-none',
										isInc
											? 'bg-accent-600 text-white'
											: isExc
												? 'bg-red-900/60 text-red-100 ring-1 ring-red-800'
												: 'bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-100',
									)}
								>
									{isExc ? '− ' : isInc ? '+ ' : ''}
									{g}
								</button>
							);
						})}
					</div>
					<div className="mt-4 text-xs text-ink-400">
						Tap to include (+), tap again to exclude (−), tap again to clear.
					</div>
				</div>

				<button
					onClick={() => {
						setParams(new URLSearchParams());
					}}
					className="w-full rounded-md bg-ink-800 px-3 py-2 text-sm font-medium text-ink-200 hover:bg-ink-700 hover:text-ink-100 transition"
				>
					Reset Filters
				</button>
			</aside>

			{/* Main Content */}
			<section className="flex-1 min-w-0 space-y-6">
				{results.loading && <CardGridSkeleton count={24} />}
				{results.error && <ErrorState error={results.error} onRetry={results.reload} />}

				{!results.loading && !results.error && results.data && (
					<>
						{results.data.results.length === 0 ? (
							<div className="py-20 text-center text-ink-400">
								<p className="text-lg mb-2">No series found.</p>
								<p className="text-sm">Try loosening your filters.</p>
							</div>
						) : (
							<SeriesGrid
								items={results.data.results.map((r) => ({
									title: r.title,
									slug: r.slug,
									cover_url: r.cover_url,
									rating: r.rating,
									latest_chapter: null,
									last_updated: null,
								}))}
							/>
						)}

						{results.data.total_pages && results.data.total_pages > 1 ? (
							<div className="pt-8 flex justify-center">
								<Pagination
									page={results.data.page}
									total={results.data.total_pages * 24}
									perPage={24}
									onChange={(p) => {
										const next = new URLSearchParams(params);
										next.set('page', p.toString());
										setParams(next);
										window.scrollTo({ top: 0, behavior: 'smooth' });
									}}
								/>
							</div>
						) : null}
					</>
				)}
			</section>
		</div>
	);
}
