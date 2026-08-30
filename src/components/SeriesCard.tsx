// src/components/SeriesCard.tsx

import { Link } from 'react-router-dom';
import type { ManhwaSummary } from '../api/types';
import { CoverImage } from './CoverImage';
import { formatChapterNumber, formatRating, formatUpstreamAge } from '../lib/format';
import { cn } from '../lib/cn';

interface Props {
	series: ManhwaSummary;
	/** Rank badge for ranking grids. Omit elsewhere. */
	rank?: number;
	eager?: boolean;
}

export function SeriesCard({ series, rank, eager }: Props) {
	return (
		<Link
			to={`/series/${encodeURIComponent(series.slug)}`}
			className="group block focus:outline-none"
		>
			<div className="relative overflow-hidden rounded-card bg-ink-850 ring-1 ring-ink-700 transition group-hover:ring-accent-500 group-focus-visible:ring-accent-400">
				<CoverImage
					src={series.cover_url}
					alt={series.title}
					eager={eager}
					className="aspect-2/3 w-full transition duration-300 group-hover:scale-[1.03]"
				/>

				{rank !== undefined && (
					<span
						className={cn(
							'absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums backdrop-blur-sm',
							rank <= 3 ? 'bg-accent-600/90 text-white' : 'bg-ink-950/75 text-ink-200',
						)}
					>
						{rank}
					</span>
				)}

				{series.rating !== null && (
					<span className="absolute right-2 top-2 rounded-md bg-ink-950/75 px-1.5 py-0.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
						★ {formatRating(series.rating)}
					</span>
				)}

				{series.latest_chapter && (
					<span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent px-2 pb-1.5 pt-6 text-xs text-ink-200">
						Ch. {formatChapterNumber(series.latest_chapter)}
					</span>
				)}
			</div>

			<h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-ink-100 transition group-hover:text-accent-400">
				{series.title}
			</h3>
			{series.last_updated && (
				<p className="text-xs text-ink-400">{formatUpstreamAge(series.last_updated)}</p>
			)}
		</Link>
	);
}

export function SeriesGrid({
	items,
	ranked = false,
}: {
	items: ManhwaSummary[];
	ranked?: boolean;
}) {
	return (
		<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{items.map((series, index) => (
				<li key={`${series.slug}-${index}`}>
					<SeriesCard series={series} rank={ranked ? index + 1 : undefined} eager={index < 6} />
				</li>
			))}
		</ul>
	);
}
