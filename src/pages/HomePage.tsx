import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
	PERIOD_LABELS,
	type Home,
	type ManhwaSummary,
	type Period,
	type BrowseEntry,
	type BrowseList,
} from '../api/types';
import { useResource } from '../hooks/useResource';
import { useProgress } from '../hooks/useLibrary';
import { SeriesGrid } from '../components/SeriesCard';
import { CoverImage } from '../components/CoverImage';
import { CardGridSkeleton, Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { formatChapterNumber, formatRating, formatUpstreamAge } from '../lib/format';

const SLIDE_INTERVAL_MS = 5000;

/** A single slide inside HeroSlideshow. */
function HeroSlide({
	series,
	rank,
	active,
}: {
	series: ManhwaSummary;
	rank: number;
	active: boolean;
}) {
	return (
		<div
			className="absolute inset-0 transition-opacity duration-700"
			style={{ opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
			aria-hidden={!active}
		>
			{/* Full-bleed blurred cover backdrop */}
			<div className="absolute inset-0">
				<CoverImage
					src={series.cover_url}
					alt=""
					className="h-full w-full object-cover blur-2xl brightness-[0.55]"
					eager={rank === 1}
				/>
			</div>
			{/* Gradient overlay - fades from bottom on mobile, from left on desktop */}
			<div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-ink-950/90 via-ink-950/50 to-ink-950/10" />
			{/* Bottom fade for dots */}
			<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/80 to-transparent" />

			{/* Content - re-constrained inside the bleed */}
			<div className="relative mx-auto flex h-full max-w-7xl flex-col items-center gap-6 px-4 pb-12 pt-8 sm:flex-row sm:px-6 sm:py-10 lg:px-8">
				{/* Cover art */}
				<CoverImage
					src={series.cover_url}
					alt={series.title}
					eager={rank === 1}
					className="aspect-2/3 w-40 shrink-0 rounded-xl shadow-2xl ring-1 ring-white/10 sm:w-52 lg:w-64"
				/>

				{/* Text block */}
				<div className="min-w-0 flex-1 flex flex-col items-center text-center sm:items-start sm:text-left">
					{/* Rank badge */}
					<span className="inline-flex items-center gap-1.5 rounded-full bg-accent-600/90 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_0_12px_var(--color-accent-600)]">
						<span>★</span> #{rank} Trending Today
					</span>

					{/* Title */}
					<h1 className="mt-3 text-xl font-extrabold leading-tight text-white drop-shadow sm:text-3xl lg:text-4xl">
						{series.title}
					</h1>

					{/* Meta pills */}
					<div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
						{series.latest_chapter && (
							<span className="flex items-center gap-1 rounded-md bg-ink-800/80 px-2.5 py-1 text-xs font-medium text-ink-200 backdrop-blur-sm">
								Ch. {formatChapterNumber(series.latest_chapter)}
							</span>
						)}
						{series.rating !== null && (
							<span className="flex items-center gap-1 rounded-md bg-ink-800/80 px-2.5 py-1 text-xs font-medium text-amber-300 backdrop-blur-sm">
								★ {formatRating(series.rating)}
							</span>
						)}
						{series.last_updated && (
							<span className="rounded-md bg-ink-800/80 px-2.5 py-1 text-xs text-ink-100 backdrop-blur-sm">
								{formatUpstreamAge(series.last_updated)}
							</span>
						)}
					</div>

					{/* CTA buttons */}
					<div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
						<Link
							to={`/series/${encodeURIComponent(series.slug)}`}
							tabIndex={active ? 0 : -1}
							className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_var(--color-accent-600)] transition hover:bg-accent-500 hover:shadow-[0_0_24px_var(--color-accent-500)] active:scale-95"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="size-4 shrink-0"
								aria-hidden="true"
							>
								<path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c1.68 0 3.282.515 4.75 1.408a.75.75 0 0 0 1-.707V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
							</svg>
							Start Reading
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Full-bleed slideshow hero cycling through all of today's trending titles. */
function HeroSlideshow({ items }: { items: ManhwaSummary[] }) {
	const [current, setCurrent] = useState(0);
	const paused = useRef(false);
	const total = items.length;

	const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
	const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

	// Auto-advance every 5 seconds, pause while hovered or focused
	useEffect(() => {
		if (total <= 1) return;
		const id = setInterval(() => {
			if (!paused.current) next();
		}, SLIDE_INTERVAL_MS);
		return () => clearInterval(id);
	}, [next, total]);

	// Keyboard arrow navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				next();
			}
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				prev();
			}
		},
		[next, prev],
	);

	if (total === 0) return null;

	return (
		<section
			className="hero-breakout relative min-h-[34rem] overflow-hidden bg-ink-900 sm:min-h-[28rem]"
			onMouseEnter={() => {
				paused.current = true;
			}}
			onMouseLeave={() => {
				paused.current = false;
			}}
			onFocus={() => {
				paused.current = true;
			}}
			onBlur={() => {
				paused.current = false;
			}}
			onKeyDown={handleKeyDown}
			aria-label="Trending today slideshow"
			aria-roledescription="carousel"
		>
			{items.map((series, i) => (
				<HeroSlide key={series.slug} series={series} rank={i + 1} active={i === current} />
			))}

			{/* Dot navigation - middle bottom */}
			{total > 1 && (
				<div
					className="absolute inset-x-0 bottom-3 flex justify-center gap-2 sm:bottom-4"
					role="tablist"
					aria-label="Slides"
				>
					{items.map((series, i) => (
						<button
							key={series.slug}
							role="tab"
							aria-selected={i === current}
							aria-label={`Slide ${i + 1}: ${series.title}`}
							onClick={() => setCurrent(i)}
							className={[
								'h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400',
								i === current ? 'w-6 bg-accent-400' : 'w-2 bg-white/30 hover:bg-white/60',
							].join(' ')}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/** A horizontally scrolling rail, for the periods that are not the main grid. */
function Rail({ title, to, items }: { title: string; to: string; items: ManhwaSummary[] }) {
	if (items.length === 0) return null;
	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between">
				<h2 className="text-lg font-semibold text-ink-100">{title}</h2>
				<Link to={to} className="text-sm font-medium text-accent-400 hover:text-accent-500">
					See all
				</Link>
			</div>
			<ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
				{items.slice(0, 12).map((series, index) => (
					<li key={`${series.slug}-${index}`} className="w-32 shrink-0 snap-start sm:w-36">
						<Link
							to={`/series/${encodeURIComponent(series.slug)}`}
							className="group block focus:outline-none"
						>
							<CoverImage
								src={series.cover_url}
								alt={series.title}
								className="aspect-2/3 w-full rounded-lg ring-1 ring-ink-700 transition group-hover:ring-accent-500"
							/>
							<p className="mt-2 line-clamp-2 text-xs leading-snug text-ink-200 group-hover:text-accent-400">
								{series.title}
							</p>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}

/** "Continue reading", from this browser's stored progress. */
function ContinueReading() {
	const { recent } = useProgress();
	if (recent.length === 0) return null;

	return (
		<section className="space-y-3">
			<h2 className="text-lg font-semibold text-ink-100">Continue reading</h2>
			<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{recent.slice(0, 6).map((entry) => (
					<li key={entry.slug}>
						<Link
							to={`/read/${encodeURIComponent(entry.chapterId)}`}
							className="flex items-center justify-between gap-3 rounded-md border border-ink-700 bg-ink-850 px-4 py-3 transition hover:border-accent-500"
						>
							<span className="min-w-0">
								<span className="block truncate text-sm font-medium text-ink-100">
									{entry.slug.replace(/-/g, ' ')}
								</span>
								<span className="text-xs text-ink-400">
									Chapter {formatChapterNumber(entry.chapterNumber)}
								</span>
							</span>
							<span className="shrink-0 text-xs font-medium text-accent-400">Resume</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}

export function HomePage() {
	const home = useResource<Home>((signal) => api.home(signal), []);
	const recent = useResource<BrowseList>((signal) => api.recentlyAdded(1, signal), []);

	if (home.loading) {
		return (
			<div className="space-y-10">
				<Skeleton className="h-64 w-full rounded-card" />
				<CardGridSkeleton count={12} />
			</div>
		);
	}

	if (home.error || !home.data) {
		return <ErrorState error={home.error ?? new Error('No data returned')} onRetry={home.reload} />;
	}

	const { data } = home;
	const today = data['1d']?.manhwa ?? [];

	return (
		<div className="space-y-12">
			{/* Per-period degradation: /v1/home fetches three rankings independently and
			    reports the ones that failed, so a partial page is normal, not a bug. */}
			{data.errors.length > 0 && (
				<p
					role="status"
					className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
				>
					Some rankings are unavailable right now (
					{data.errors.map((period) => PERIOD_LABELS[period as Period] ?? period).join(', ')}
					). The rest of the page is up to date.
				</p>
			)}

			<HeroSlideshow items={today} />

			<ContinueReading />

			{today.length > 1 && (
				<section className="space-y-4">
					<div className="flex items-baseline justify-between">
						<h2 className="text-lg font-semibold text-ink-100">Trending today</h2>
						<Link
							to="/rankings?period=1d"
							className="text-sm font-medium text-accent-400 hover:text-accent-500"
						>
							See all
						</Link>
					</div>
					<SeriesGrid items={today.slice(1, 19)} ranked />
				</section>
			)}

			<RecentlyAdded resource={recent} />

			<Rail title={PERIOD_LABELS['1w']} to="/rankings?period=1w" items={data['1w']?.manhwa ?? []} />
			<Rail title={PERIOD_LABELS['1m']} to="/rankings?period=1m" items={data['1m']?.manhwa ?? []} />

			{today.length === 0 && data.errors.length === 0 && (
				<p className="text-sm text-ink-400">No rankings were returned.</p>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Recently Added
// ---------------------------------------------------------------------------

/** A single card in the Recently Added rail. */
function RecentlyAddedCard({ item }: { item: BrowseEntry }) {
	return (
		<li className="w-36 shrink-0 snap-start sm:w-40">
			<Link
				to={`/series/${encodeURIComponent(item.slug)}`}
				className="group block focus:outline-none"
			>
				<div className="relative overflow-hidden rounded-card bg-ink-850 ring-1 ring-ink-700 transition group-hover:ring-accent-500 group-focus-visible:ring-accent-400">
					<CoverImage
						src={item.cover_url}
						alt={item.title}
						className="aspect-2/3 w-full transition duration-300 group-hover:scale-[1.03]"
					/>

					{item.badge && (
						<span className="absolute left-2 top-2 rounded-md bg-accent-600/90 px-2 py-0.5 text-xs font-bold tabular-nums text-white backdrop-blur-sm">
							{item.badge}
						</span>
					)}

					{item.rating !== null && (
						<span className="absolute right-2 top-2 rounded-md bg-ink-950/75 px-1.5 py-0.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
							★ {formatRating(item.rating)}
						</span>
					)}
				</div>

				<h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-ink-100 transition group-hover:text-accent-400">
					{item.title}
				</h3>
			</Link>
		</li>
	);
}

/** Horizontally scrolling "Recently Added" rail, fetched independently of /v1/home. */
function RecentlyAdded({ resource }: { resource: ReturnType<typeof useResource<BrowseList>> }) {
	if (resource.error) return null; // fail silently — it's a bonus section

	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between">
				<h2 className="text-lg font-semibold text-ink-100">Recently added</h2>
			</div>

			{resource.loading ? (
				<ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
					{Array.from({ length: 8 }, (_, i) => (
						<li key={i} className="w-36 shrink-0 space-y-2 sm:w-40">
							<Skeleton className="aspect-2/3 w-full rounded-lg" />
							<Skeleton className="h-3 w-4/5" />
							<Skeleton className="h-3 w-3/5" />
						</li>
					))}
				</ul>
			) : resource.data && resource.data.results.length > 0 ? (
				<ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
					{resource.data.results.map((item, i) => (
						<RecentlyAddedCard key={`${item.slug}-${i}`} item={item} />
					))}
				</ul>
			) : null}
		</section>
	);
}
