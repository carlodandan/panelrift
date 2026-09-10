import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';
import { api } from '../api/client';
import { PERIODS, PERIOD_LABELS, type Period, type RankingPeriod } from '../api/types';
import { useResource } from '../hooks/useResource';
import { SeriesGrid } from '../components/SeriesCard';
import { CardGridSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { cn } from '../lib/cn';

function isPeriod(value: string | null): value is Period {
	return value !== null && (PERIODS as readonly string[]).includes(value);
}

export function RankingsPage() {
	useEffect(() => {
		trackEvent('open_rankings');
	}, []);

	const [params, setParams] = useSearchParams();
	const raw = params.get('period');
	// An unknown ?period= would earn a 400 from the API, so normalise before asking.
	const period: Period = isPeriod(raw) ? raw : '1d';

	const ranking = useResource<RankingPeriod>((signal) => api.ranking(period, signal), [period]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink-100">Most viewed</h1>
				<p className="mt-1 text-sm text-ink-400">
					Ranked by upstream view counts over the selected window.
				</p>
			</div>

			<div
				role="tablist"
				aria-label="Ranking period"
				className="flex gap-1 border-b border-ink-800"
			>
				{PERIODS.map((value) => (
					<button
						key={value}
						type="button"
						role="tab"
						aria-selected={value === period}
						onClick={() => setParams({ period: value }, { replace: true })}
						className={cn(
							'-mb-px border-b-2 px-4 py-2 text-sm font-medium transition',
							value === period
								? 'border-accent-500 text-ink-100'
								: 'border-transparent text-ink-400 hover:text-ink-200',
						)}
					>
						{PERIOD_LABELS[value]}
					</button>
				))}
			</div>

			{ranking.loading ? (
				<CardGridSkeleton count={18} />
			) : ranking.error || !ranking.data ? (
				<ErrorState
					error={ranking.error ?? new Error('No data returned')}
					onRetry={ranking.reload}
				/>
			) : ranking.data.manhwa.length === 0 ? (
				<p className="text-sm text-ink-400">This ranking came back empty.</p>
			) : (
				<SeriesGrid items={ranking.data.manhwa} ranked />
			)}
		</div>
	);
}
