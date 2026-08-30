// src/pages/SearchPage.tsx

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { SearchResponse } from '../api/types';
import { useResource } from '../hooks/useResource';
import { SearchBar } from '../components/SearchBar';
import { SeriesGrid } from '../components/SeriesCard';
import { CardGridSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { MIN_TERM, SEARCH_DEBOUNCE_MS } from '../lib/constants';

export function SearchPage() {
	const [params, setParams] = useSearchParams();
	const urlTerm = params.get('term') ?? '';

	// Two terms on purpose: `typed` follows the keyboard, `term` follows the debounce
	// and is what actually gets fetched. The search route is the tightest-limited one
	// on the API (20 requests / 10s), so firing per keystroke would earn a 429.
	const [typed, setTyped] = useState(urlTerm);
	const [term, setTerm] = useState(urlTerm);

	useEffect(() => {
		setTyped(urlTerm);
		setTerm(urlTerm);
	}, [urlTerm]);

	useEffect(() => {
		if (typed === term) return;
		const timer = setTimeout(() => {
			setTerm(typed);
			// replace, not push: typing should not leave a history entry per keystroke.
			setParams(typed ? { term: typed } : {}, { replace: true });
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [typed, term, setParams]);

	const ready = term.trim().length >= MIN_TERM;
	const results = useResource<SearchResponse | null>(
		(signal) => (ready ? api.search(term.trim(), signal) : Promise.resolve(null)),
		[term, ready],
	);

	return (
		<div className="space-y-6">
			<div className="mx-auto max-w-xl">
				<h1 className="mb-4 text-center text-2xl font-bold text-ink-100">Search</h1>
				<SearchBar initialTerm={urlTerm} autoFocus onSubmitTerm={setTyped} />
			</div>

			{!ready && (
				<p className="pt-4 text-center text-sm text-ink-400">
					Type at least {MIN_TERM} characters to search by title.
				</p>
			)}

			{ready && results.loading && <CardGridSkeleton count={12} />}

			{ready && results.error && <ErrorState error={results.error} onRetry={results.reload} />}

			{ready && !results.loading && !results.error && results.data && (
				<>
					<p className="text-sm text-ink-400">
						{results.data.count === 0
							? 'No matches.'
							: `${results.data.count} ${results.data.count === 1 ? 'result' : 'results'} for “${results.data.term}”`}
					</p>
					{results.data.count === 0 ? (
						<p className="pt-6 text-center text-sm text-ink-200">
							Nothing matched that title. Try a shorter or differently spelled term — search matches
							titles only, not authors or genres.
						</p>
					) : (
						<SeriesGrid items={results.data.results} />
					)}
				</>
			)}
		</div>
	);
}
