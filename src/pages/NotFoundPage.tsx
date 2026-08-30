// src/pages/NotFoundPage.tsx

import { Link } from 'react-router-dom';

export function NotFoundPage() {
	return (
		<div className="mx-auto max-w-md py-20 text-center">
			<p className="font-mono text-sm text-accent-400">404</p>
			<h1 className="mt-2 text-2xl font-bold text-ink-100">No such page</h1>
			<p className="mt-3 text-sm leading-relaxed text-ink-200">
				That URL does not match anything here. If you followed a chapter link, the id may have
				changed upstream — open the series and pick the chapter again.
			</p>
			<Link
				to="/"
				className="mt-6 inline-block rounded-md bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500"
			>
				Back to browse
			</Link>
		</div>
	);
}
