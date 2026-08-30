import { ApiError } from '../api/client';

interface Props {
	error: Error;
	onRetry?: () => void;
}

/**
 * Turn an API failure into something a reader can act on.
 *
 * The API's error codes are the point of this component: `parse_error` means the
 * scraper broke against upstream markup and no amount of retrying helps, while
 * `upstream_timeout` usually clears on its own. Saying "something went wrong" for
 * both would leave the reader guessing.
 */
function explain(error: Error): { title: string; detail: string; retryable: boolean } {
	if (!(error instanceof ApiError)) {
		return {
			title: 'Something broke on this page',
			detail: error.message,
			retryable: true,
		};
	}

	switch (error.code) {
		case 'network_error':
			return {
				title: 'No connection to the API',
				detail: 'The request never left. Check your connection, then try again.',
				retryable: true,
			};
		case 'not_found':
			return {
				title: 'Not found',
				detail: 'This series or chapter does not exist upstream any more.',
				retryable: false,
			};
		case 'rate_limited':
			return {
				title: 'Slow down a moment',
				detail: 'Too many requests from this address. Wait about a minute and retry.',
				retryable: true,
			};
		case 'parse_error':
			return {
				title: 'The source page changed shape',
				detail:
					'The API could read the page but not find what it needed. This needs a fix in the scraper, not a retry.',
				retryable: false,
			};
		case 'upstream_timeout':
			return {
				title: 'The source is slow right now',
				detail: 'Upstream did not answer in time. Retrying often works.',
				retryable: true,
			};
		case 'upstream_error':
			return {
				title: 'The source is having trouble',
				detail: 'Upstream returned an error. Try again shortly.',
				retryable: true,
			};
		default:
			return { title: 'Request failed', detail: error.message, retryable: !error.isPermanent };
	}
}

export function ErrorState({ error, onRetry }: Props) {
	const { title, detail, retryable } = explain(error);
	const code = error instanceof ApiError ? error.code : null;

	return (
		<div
			role="alert"
			className="mx-auto max-w-md rounded-card border border-ink-700 bg-ink-850 p-6 text-center"
		>
			<h2 className="text-lg font-semibold text-ink-100">{title}</h2>
			<p className="mt-2 text-sm leading-relaxed text-ink-200">{detail}</p>
			{code && <p className="mt-3 font-mono text-xs text-ink-400">{code}</p>}
			{retryable && onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className="mt-5 rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-500"
				>
					Try again
				</button>
			)}
		</div>
	);
}

/** Compact inline variant for a panel that failed inside an otherwise fine page. */
export function InlineError({ error, onRetry }: Props) {
	const { title, retryable } = explain(error);
	return (
		<div
			role="alert"
			className="flex items-center justify-between gap-4 rounded-md border border-ink-700 bg-ink-850 px-4 py-3 text-sm"
		>
			<span className="text-ink-200">{title}</span>
			{retryable && onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className="shrink-0 font-medium text-accent-400 hover:text-accent-500"
				>
					Retry
				</button>
			)}
		</div>
	);
}
