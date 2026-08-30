// src/pages/LibraryPage.tsx

import { Link } from 'react-router-dom';
import { useBookmarks, useProgress } from '../hooks/useLibrary';
import { CoverImage } from '../components/CoverImage';
import { formatChapterNumber, formatRelative, titleFromSlug } from '../lib/format';

export function LibraryPage() {
	const { list, toggle } = useBookmarks();
	const { recent, forSlug } = useProgress();

	if (list.length === 0 && recent.length === 0) {
		return (
			<div className="mx-auto max-w-md py-16 text-center">
				<h1 className="text-2xl font-bold text-ink-100">Your library is empty</h1>
				<p className="mt-3 text-sm leading-relaxed text-ink-200">
					Add series from their page and they show up here, along with whatever you were last
					reading. This lives in your browser only — there is no account, so clearing site data
					clears the library too.
				</p>
				<Link
					to="/"
					className="mt-6 inline-block rounded-md bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-500"
				>
					Browse series
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-12">
			<div>
				<h1 className="text-2xl font-bold text-ink-100">Library</h1>
				<p className="mt-1 text-sm text-ink-400">Stored in this browser.</p>
			</div>

			{recent.length > 0 && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold text-ink-100">Recently read</h2>
					<ul className="divide-y divide-ink-800 overflow-hidden rounded-card border border-ink-800">
						{recent.map((entry) => (
							<li key={entry.slug} className="flex items-center gap-4 px-4 py-3">
								<span className="min-w-0 flex-1">
									<Link
										to={`/series/${encodeURIComponent(entry.slug)}`}
										className="block truncate text-sm font-medium text-ink-100 hover:text-accent-400"
									>
										{titleFromSlug(entry.slug)}
									</Link>
									<span className="text-xs text-ink-400">
										Chapter {formatChapterNumber(entry.chapterNumber)}
										{formatRelative(new Date(entry.read_at).toISOString()) && (
											<> · {formatRelative(new Date(entry.read_at).toISOString())}</>
										)}
									</span>
								</span>
								<Link
									to={`/read/${encodeURIComponent(entry.chapterId)}`}
									className="shrink-0 rounded-md bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-100 hover:bg-ink-700"
								>
									Resume
								</Link>
							</li>
						))}
					</ul>
				</section>
			)}

			{list.length > 0 && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold text-ink-100">Saved series</h2>
					<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
						{list.map((entry) => {
							const progress = forSlug(entry.slug);
							return (
								<li key={entry.slug} className="group relative">
									<Link
										to={`/series/${encodeURIComponent(entry.slug)}`}
										className="block focus:outline-none"
									>
										<CoverImage
											src={entry.cover_url}
											alt={entry.title}
											className="aspect-2/3 w-full rounded-card ring-1 ring-ink-700 transition group-hover:ring-accent-500"
										/>
										<h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-ink-100 group-hover:text-accent-400">
											{entry.title}
										</h3>
										{progress && (
											<p className="text-xs text-ink-400">
												Chapter {formatChapterNumber(progress.chapterNumber)}
											</p>
										)}
									</Link>
									<button
										type="button"
										onClick={() => toggle(entry)}
										aria-label={`Remove ${entry.title} from library`}
										className="absolute right-2 top-2 rounded-md bg-ink-950/80 px-2 py-1 text-xs text-ink-200 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-white"
									>
										Remove
									</button>
								</li>
							);
						})}
					</ul>
				</section>
			)}
		</div>
	);
}
