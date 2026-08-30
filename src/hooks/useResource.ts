// src/hooks/useResource.ts

import { useCallback, useEffect, useState } from 'react';

export interface Resource<T> {
	data: T | undefined;
	error: Error | undefined;
	loading: boolean;
	/** Refetch on demand — wired to the retry button in ErrorState. */
	reload: () => void;
}

/**
 * Fetch-on-mount with cancellation.
 *
 * The abort on cleanup is the important part: navigating away mid-flight would
 * otherwise resolve into an unmounted component, and — worse for a reader — a
 * slow chapter request could land after a faster one and show the wrong pages.
 *
 * `deps` is the identity of the request. Pass the same values you interpolate
 * into the fetcher; a fetcher defined inline is a new function every render and
 * cannot be a dependency itself.
 */
export function useResource<T>(
	fetcher: (signal: AbortSignal) => Promise<T>,
	deps: readonly unknown[],
): Resource<T> {
	const [data, setData] = useState<T | undefined>(undefined);
	const [error, setError] = useState<Error | undefined>(undefined);
	const [loading, setLoading] = useState(true);
	const [attempt, setAttempt] = useState(0);

	const reload = useCallback(() => setAttempt((n) => n + 1), []);

	useEffect(() => {
		const controller = new AbortController();
		let active = true;

		setLoading(true);
		setError(undefined);

		fetcher(controller.signal)
			.then((result) => {
				if (!active) return;
				setData(result);
				setLoading(false);
			})
			.catch((cause: unknown) => {
				if (!active || controller.signal.aborted) return;
				setData(undefined);
				setError(cause instanceof Error ? cause : new Error(String(cause)));
				setLoading(false);
			});

		return () => {
			active = false;
			controller.abort();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...deps, attempt]);

	return { data, error, loading, reload };
}
