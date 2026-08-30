// src/pages/HomePage.tsx

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { PERIOD_LABELS, type Home, type ManhwaSummary, type Period } from '../api/types';
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
			{/* Blurred backdrop */}
			<div className="absolute inset-0 opacity-25">
				<CoverImage src={series.cover_url} alt="" className="h-full w-full blur-2xl" eager={rank === 1} />
			</div>
			<div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-transparent" />
			{/* Bottom gradient so dots sit on a readable surface */}
			<div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/80 to-transparent" />

			<div className="relative flex h-full flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
				<CoverImage
					src={series.cover_url}
					alt={series.title}
					eager={rank === 1}
					className="aspect-2/3 w-36 shrink-0 rounded-lg ring-1 ring-ink-600 sm:w-44"
				/>
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent-400">
						#{rank} today
					</p>
					<h1 className="mt-2 text-2xl font-bold leading-tight text-ink-100 sm:text-3xl">
						{series.title}
					</h1>
					<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-200">
						{series.rating !== null && (
							<span className="text-amber-300">★ {formatRating(series.rating)}</span>
						)}
						{series.latest_chapter && (
							<span>Latest: chapter {formatChapterNumber(series.latest_chapter)}</span>
						)}
						{series.last_updated && (
							<span className="text-ink-400">{formatUpstreamAge(series.last_updated)}</span>
						)}
					</div>
					<Link
						to={`/series/${encodeURIComponent(series.slug)}`}
						className="mt-5 inline-block rounded-md bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500"
						tabIndex={active ? 0 : -1}
					>
						Start reading
					</Link>
				</div>
			</div>
		</div>
	);
}

/** Slideshow hero cycling through all of today's trending titles. */
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
			if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
			if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
		},
		[next, prev],
	);

	if (total === 0) return null;

	return (
		<section
			className="relative overflow-hidden rounded-card border border-ink-700 bg-ink-900"
			style={{ minHeight: '16rem' }}
			onMouseEnter={() => { paused.current = true; }}
			onMouseLeave={() => { paused.current = false; }}
			onFocus={() => { paused.current = true; }}
			onBlur={() => { paused.current = false; }}
			onKeyDown={handleKeyDown}
			aria-label="Trending today slideshow"
			aria-roledescription="carousel"
		>
			{items.map((series, i) => (
				<HeroSlide key={series.slug} series={series} rank={i + 1} active={i === current} />
			))}

			{/* Dot navigation — middle bottom */}
			{total > 1 && (
				<div
					className="absolute inset-x-0 bottom-4 flex justify-center gap-2"
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
								i === current
									? 'w-6 bg-accent-400'
									: 'w-2 bg-ink-600 hover:bg-ink-400',
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

			<Rail title={PERIOD_LABELS['1w']} to="/rankings?period=1w" items={data['1w']?.manhwa ?? []} />
			<Rail title={PERIOD_LABELS['1m']} to="/rankings?period=1m" items={data['1m']?.manhwa ?? []} />

			{today.length === 0 && data.errors.length === 0 && (
				<p className="text-sm text-ink-400">No rankings were returned.</p>
			)}
		</div>
	);
}
