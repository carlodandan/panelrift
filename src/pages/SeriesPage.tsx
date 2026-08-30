// src/pages/SeriesPage.tsx

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { ChapterList, Manhwa } from '../api/types';
import { useResource } from '../hooks/useResource';
import { useBookmarks, useProgress, toBookmark } from '../hooks/useLibrary';
import { CoverImage } from '../components/CoverImage';
import { DetailSkeleton, Skeleton } from '../components/Skeleton';
import { ErrorState, InlineError } from '../components/ErrorState';
import { Pagination } from '../components/Pagination';
import {
	chapterDate,
	formatChapterCount,
	formatChapterNumber,
	formatCount,
	formatRating,
	formatUpstreamAge,
} from '../lib/format';
import { CHAPTERS_PER_PAGE } from '../lib/constants';
import { cn } from '../lib/cn';

function Stat({ label, value }: { label: string; value: string | null }) {
	if (!value) return null;
	return (
		<div className="rounded-md bg-ink-850 px-3 py-2">
			<dt className="text-xs uppercase tracking-wide text-ink-400">{label}</dt>
			<dd className="text-sm font-semibold text-ink-100">{value}</dd>
		</div>
	);
}

function BookmarkButton({ series }: { series: Manhwa }) {
	const { isBookmarked, toggle } = useBookmarks();
	const saved = isBookmarked(series.slug);

	return (
		<button
			type="button"
			onClick={() => toggle(toBookmark(series))}
			aria-pressed={saved}
			className={cn(
				'rounded-md border px-4 py-2.5 text-sm font-medium transition',
				saved
					? 'border-accent-500 bg-accent-600/15 text-accent-400'
					: 'border-ink-600 text-ink-200 hover:border-ink-400 hover:text-ink-100',
			)}
		>
			{saved ? '✓ In library' : '+ Add to library'}
		</button>
	);
}

/** Paginated chapter list, fetched separately from the detail record. */
function Chapters({ slug, lastRead }: { slug: string; lastRead: string | undefined }) {
	const [page, setPage] = useState(1);
	const list = useResource<ChapterList>(
		(signal) => api.chapters(slug, page, CHAPTERS_PER_PAGE, signal),
		[slug, page],
	);

	if (list.loading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 10 }, (_, index) => (
					<Skeleton key={index} className="h-14 w-full" />
				))}
			</div>
		);
	}

	if (list.error || !list.data) {
		return (
			<InlineError error={list.error ?? new Error('No chapters returned')} onRetry={list.reload} />
		);
	}

	const { chapters, total, per_page } = list.data;

	return (
		<div className="space-y-4">
			<p className="text-sm text-ink-400">{total} chapters</p>

			<ul className="divide-y divide-ink-800 overflow-hidden rounded-card border border-ink-800">
				{chapters.map((chapter) => {
					const when = chapterDate(chapter.published_at, chapter.date);
					const current = chapter.id === lastRead;
					return (
						<li key={chapter.id}>
							<Link
								to={`/read/${encodeURIComponent(chapter.id)}`}
								className={cn(
									'flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-ink-850',
									current && 'bg-accent-600/10',
								)}
							>
								<span className="min-w-0">
									<span className="block truncate text-sm font-medium text-ink-100">
										Chapter {formatChapterNumber(chapter.number)}
									</span>
									{when && <span className="text-xs text-ink-400">{when}</span>}
								</span>
								{current && (
									<span className="shrink-0 rounded-full bg-accent-600/20 px-2 py-0.5 text-xs font-medium text-accent-400">
										Last read
									</span>
								)}
							</Link>
						</li>
					);
				})}
			</ul>

			<Pagination page={page} perPage={per_page} total={total} onChange={setPage} />
		</div>
	);
}

export function SeriesPage() {
	const { slug = '' } = useParams();
	const series = useResource<Manhwa>((signal) => api.manhwa(slug, signal), [slug]);
	const { forSlug } = useProgress();
	const [expanded, setExpanded] = useState(false);

	if (series.loading) return <DetailSkeleton />;
	if (series.error || !series.data) {
		return (
			<ErrorState error={series.error ?? new Error('No data returned')} onRetry={series.reload} />
		);
	}

	const data = series.data;
	const progress = forSlug(slug);
	// The detail page's own chapter list is upstream-truncated; it is only good for
	// picking a starting point. `chapters_truncated` says so explicitly.
	const first = data.chapters.at(-1);
	const resumeId = progress?.chapterId ?? first?.id;

	return (
		<div className="space-y-10">
			<nav aria-label="Breadcrumb" className="text-sm text-ink-400">
				<Link to="/" className="hover:text-ink-200">
					Browse
				</Link>
				<span aria-hidden="true"> / </span>
				<span className="text-ink-200">{data.title}</span>
			</nav>

			<section className="flex flex-col gap-6 sm:flex-row">
				<CoverImage
					src={data.cover_url}
					alt={data.title}
					eager
					className="aspect-2/3 w-44 shrink-0 self-start rounded-card ring-1 ring-ink-700 sm:w-52"
				/>

				<div className="min-w-0 flex-1 space-y-4">
					<div>
						<h1 className="text-2xl font-bold leading-tight text-ink-100 sm:text-3xl">
							{data.title}
						</h1>
						{data.alternative_title && (
							<p className="mt-1 text-sm text-ink-400">{data.alternative_title}</p>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-200">
						{data.rating !== null && (
							<span className="text-amber-300">
								★ {formatRating(data.rating)}
								{data.rating_count !== null && (
									<span className="text-ink-400"> ({formatCount(data.rating_count)})</span>
								)}
							</span>
						)}
						{data.author && <span>{data.author}</span>}
						{data.status && (
							<span className="rounded-full border border-ink-600 px-2 py-0.5 text-xs uppercase tracking-wide">
								{data.status}
							</span>
						)}
					</div>

					{data.genres.length > 0 && (
						<ul className="flex flex-wrap gap-2">
							{data.genres.map((genre) => (
								<li key={genre} className="rounded-full bg-ink-800 px-3 py-1 text-xs text-ink-200">
									{genre}
								</li>
							))}
						</ul>
					)}

					{data.description && (
						<div>
							<p
								className={cn('text-sm leading-relaxed text-ink-200', !expanded && 'line-clamp-4')}
							>
								{data.description}
							</p>
							<button
								type="button"
								onClick={() => setExpanded((value) => !value)}
								className="mt-1 text-sm font-medium text-accent-400 hover:text-accent-500"
							>
								{expanded ? 'Show less' : 'Show more'}
							</button>
						</div>
					)}

					<dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<Stat label="Views" value={data.views} />
						<Stat label="Bookmarks" value={data.bookmarks} />
						<Stat label="Chapters" value={formatChapterCount(data.chapter_count)} />
						<Stat label="Updated" value={formatUpstreamAge(data.last_updated)} />
					</dl>

					<div className="flex flex-wrap gap-3 pt-2">
						{resumeId && (
							<Link
								to={`/read/${encodeURIComponent(resumeId)}`}
								className="rounded-md bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500"
							>
								{progress
									? `Resume chapter ${formatChapterNumber(progress.chapterNumber)}`
									: 'Start from chapter 1'}
							</Link>
						)}
						<BookmarkButton series={data} />
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-lg font-semibold text-ink-100">Chapters</h2>
				<Chapters slug={slug} lastRead={progress?.chapterId} />
			</section>
		</div>
	);
}
