import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MIN_TERM } from '../lib/constants';

interface Props {
	/** Pre-fill, used when the search page mounts from a shared ?term= URL. */
	initialTerm?: string;
	autoFocus?: boolean;
	onSubmitTerm?: (term: string) => void;
}

/**
 * The search input.
 *
 * The API rejects terms under two characters with a 400, and it is rate limited
 * far tighter than the read routes because clients tend to fire it per keystroke.
 * So this guards on length locally and leaves the debouncing to the caller — the
 * header navigates on submit only, while the search page debounces as you type.
 */
export function SearchBar({ initialTerm = '', autoFocus = false, onSubmitTerm }: Props) {
	const [term, setTerm] = useState(initialTerm);
	const navigate = useNavigate();
	const input = useRef<HTMLInputElement>(null);

	// Keep in step with the URL when the reader navigates back to an older search.
	useEffect(() => setTerm(initialTerm), [initialTerm]);

	// "/" focuses search, the convention on every site with a search box. Ignored
	// while the reader is already typing somewhere.
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const typing =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable === true;
			if (event.key === '/' && !typing) {
				event.preventDefault();
				input.current?.focus();
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const trimmed = term.trim();
	const tooShort = trimmed.length > 0 && trimmed.length < MIN_TERM;

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (trimmed.length < MIN_TERM) return;
		if (onSubmitTerm) onSubmitTerm(trimmed);
		else navigate(`/search?term=${encodeURIComponent(trimmed)}`);
		input.current?.blur();
	}

	return (
		<form onSubmit={submit} role="search" className="relative w-full">
			<label htmlFor="site-search" className="sr-only">
				Search series by title
			</label>
			<svg
				viewBox="0 0 24 24"
				className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
				aria-hidden="true"
			>
				<path
					fill="currentColor"
					d="M10 2a8 8 0 1 0 4.9 14.32l4.39 4.39 1.42-1.42-4.39-4.39A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
				/>
			</svg>
			<input
				id="site-search"
				ref={input}
				type="search"
				value={term}
				autoFocus={autoFocus}
				onChange={(event) => {
					const next = event.target.value;
					setTerm(next);
					// Live search only once the term is long enough for the API to accept.
					if (onSubmitTerm && next.trim().length >= MIN_TERM) onSubmitTerm(next.trim());
					if (onSubmitTerm && next.trim().length === 0) onSubmitTerm('');
				}}
				placeholder="Search series…  (press /)"
				aria-describedby={tooShort ? 'search-hint' : undefined}
				className="w-full rounded-full border border-ink-700 bg-ink-850 py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none"
			/>
			{tooShort && (
				<p id="search-hint" className="absolute mt-1 text-xs text-ink-400">
					Keep typing — at least {MIN_TERM} characters.
				</p>
			)}
		</form>
	);
}
