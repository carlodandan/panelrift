import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Chapter } from '../api/types';
import { useResource } from '../hooks/useResource';
import { useProgress } from '../hooks/useLibrary';
import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { chapterNumberFromId, formatChapterNumber, titleFromSlug } from '../lib/format';
import { cn } from '../lib/cn';

/** Reading width. Full-bleed suits phones; a capped column suits a desktop monitor. */
const WIDTHS = {
	comfortable: 'max-w-3xl',
	wide: 'max-w-5xl',
	full: 'max-w-none',
} as const;

type WidthKey = keyof typeof WIDTHS;
const WIDTH_KEY = 'panelrift:reader-width:v1';

function readStoredWidth(): WidthKey {
	try {
		const stored = localStorage.getItem(WIDTH_KEY);
		return stored && stored in WIDTHS ? (stored as WidthKey) : 'comfortable';
	} catch {
		return 'comfortable';
	}
}

/**
 * One page image.
 *
 * Kept as its own component so a single failed image owns its retry state instead
 * of forcing the whole chapter to reload. `aspect-2/3` reserves space before the
 * image decodes, which stops the scroll position from jumping as pages stream in.
 */
function Page({ src, index, total }: { src: string; index: number; total: number }) {
	const [attempt, setAttempt] = useState(0);
	const [failed, setFailed] = useState(false);
	const [inView, setInView] = useState(index < 2);
	const ref = useRef<HTMLDivElement>(null);

	// Load images when they come within a generous margin of the viewport.
	// This prevents all 0-height images from loading instantly at once.
	useEffect(() => {
		if (inView) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ rootMargin: '2000px 0px' } // Pre-load quite early so readers don't hit blanks
		);
		if (ref.current) observer.observe(ref.current);
		return () => observer.disconnect();
	}, [inView]);

	if (failed) {
		return (
			<div className="flex aspect-2/3 w-full flex-col items-center justify-center gap-3 bg-ink-900 text-sm text-ink-400">
				<p>
					Page {index + 1} of {total} did not load.
				</p>
				<button
					type="button"
					onClick={() => {
						setFailed(false);
						setAttempt((value) => value + 1);
					}}
					className="rounded-md bg-ink-800 px-3 py-1.5 text-ink-100 hover:bg-ink-700"
				>
					Retry page
				</button>
			</div>
		);
	}

	if (!inView) {
		// Placeholder with aspect ratio to ensure native lazy loading/scroll positions aren't broken.
		return <div ref={ref} className="aspect-2/3 w-full bg-ink-900" />;
	}

	return (
		<img
			// Changing the key on retry forces a fresh request rather than a cached failure.
			key={attempt}
			src={src}
			alt={`Page ${index + 1} of ${total}`}
			loading="eager" // We handle lazy loading manually via IntersectionObserver
			decoding="async"
			referrerPolicy="no-referrer"
			onError={() => setFailed(true)}
			className="reader-page bg-ink-900"
		/>
	);
}

/** Thin scroll-progress bar pinned under the reader chrome. */
function ScrollProgress() {
	const [ratio, setRatio] = useState(0);

	useEffect(() => {
		function update() {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			setRatio(scrollable <= 0 ? 0 : Math.min(1, window.scrollY / scrollable));
		}
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	}, []);

	return (
		<div
			className="h-0.5 w-full bg-ink-800"
			role="progressbar"
			aria-label="Reading progress"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(ratio * 100)}
		>
			<div
				className="h-full bg-accent-500 transition-[width] duration-150"
				style={{ width: `${ratio * 100}%` }}
			/>
		</div>
	);
}

export function ReaderPage() {
	const { chapterId = '' } = useParams();
	const navigate = useNavigate();
	const chapter = useResource<Chapter>((signal) => api.chapter(chapterId, signal), [chapterId]);
	const { record } = useProgress();

	const [width, setWidth] = useState<WidthKey>(readStoredWidth);
	const [chromeVisible, setChromeVisible] = useState(true);
	const lastScrollY = useRef(0);

	const data = chapter.data;
	const number = useMemo(() => chapterNumberFromId(chapterId), [chapterId]);

	const goTo = useCallback(
		(target: string | null) => {
			if (!target) return;
			navigate(`/read/${encodeURIComponent(target)}`);
			window.scrollTo({ top: 0, behavior: 'auto' });
		},
		[navigate],
	);

	// Remember where the reader got to, keyed on the series so the series page can
	// offer "resume". Runs on arrival rather than on unmount: a closed tab still counts.
	useEffect(() => {
		if (!data?.manhwa_slug) return;
		record({
			slug: data.manhwa_slug,
			chapterId: data.id,
			chapterNumber: number ?? data.chapter_title ?? '?',
		});
	}, [data, number, record]);

	// A new chapter starts at the top; without this the browser restores the previous
	// scroll offset and drops the reader into the middle of page four.
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'auto' });
		setChromeVisible(true);
	}, [chapterId]);

	// Hide the chrome while scrolling down, bring it back on any scroll up or near
	// the top. Reading is the whole point of the page; the toolbar is not.
	useEffect(() => {
		function onScroll() {
			const y = window.scrollY;
			const goingDown = y > lastScrollY.current;
			if (Math.abs(y - lastScrollY.current) > 8) {
				setChromeVisible(!goingDown || y < 80);
				lastScrollY.current = y;
			}
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(WIDTH_KEY, width);
		} catch {
			/* Preference is cosmetic; losing it is not worth handling. */
		}
	}, [width]);

	// Keyboard navigation. Left/right move between chapters, Escape returns to the
	// series page. Space and arrows-down keep their native scrolling behaviour.
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const target = event.target as HTMLElement | null;
			if (target instanceof HTMLInputElement || target?.isContentEditable === true) return;

			if (event.key === 'ArrowLeft') goTo(data?.prev_chapter_id ?? null);
			else if (event.key === 'ArrowRight') goTo(data?.next_chapter_id ?? null);
			else if (event.key === 'Escape' && data?.manhwa_slug) {
				navigate(`/series/${encodeURIComponent(data.manhwa_slug)}`);
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [data, goTo, navigate]);

	if (chapter.loading) {
		return (
			<div className="mx-auto max-w-3xl space-y-1 px-4 py-8">
				<Skeleton className="mb-6 h-8 w-2/3" />
				{Array.from({ length: 3 }, (_, index) => (
					<Skeleton key={index} className="aspect-2/3 w-full rounded-none" />
				))}
			</div>
		);
	}

	if (chapter.error || !data) {
		return (
			<div className="px-4 py-16">
				<ErrorState
					error={chapter.error ?? new Error('No chapter returned')}
					onRetry={chapter.reload}
				/>
			</div>
		);
	}

	const seriesName =
		data.manhwa_title ?? (data.manhwa_slug ? titleFromSlug(data.manhwa_slug) : null);
	const seriesHref = data.manhwa_slug ? `/series/${encodeURIComponent(data.manhwa_slug)}` : '/';
	const heading = number
		? `Chapter ${formatChapterNumber(number)}`
		: (data.chapter_title ?? 'Chapter');

	return (
		<div className="min-h-dvh bg-ink-950">
			<header
				className={cn(
					'sticky top-0 z-40 border-b border-ink-800 bg-ink-900/90 backdrop-blur-md transition-transform duration-200',
					!chromeVisible && '-translate-y-full',
				)}
			>
				<div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
					<Link
						to={seriesHref}
						className="shrink-0 rounded-md px-2 py-1 text-sm text-ink-200 hover:bg-ink-800 hover:text-ink-100"
					>
						← {seriesName ?? 'Series'}
					</Link>

					<span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-ink-100">
						{heading}
						<span className="ml-2 text-xs text-ink-400">{data.page_count} pages</span>
					</span>

					<div role="group" aria-label="Reading width" className="hidden shrink-0 gap-1 sm:flex">
						{(Object.keys(WIDTHS) as WidthKey[]).map((key) => (
							<button
								key={key}
								type="button"
								onClick={() => setWidth(key)}
								aria-pressed={width === key}
								className={cn(
									'rounded-md px-2 py-1 text-xs capitalize transition',
									width === key
										? 'bg-ink-700 text-ink-100'
										: 'text-ink-400 hover:bg-ink-850 hover:text-ink-200',
								)}
							>
								{key}
							</button>
						))}
					</div>
				</div>
				<ScrollProgress />
			</header>

			<main className={cn('mx-auto', WIDTHS[width])}>
				{data.images.length === 0 ? (
					// The API raises a 502 parse_error for an empty chapter, so this is a
					// belt-and-braces branch rather than an expected state.
					<p className="px-4 py-16 text-center text-sm text-ink-400">This chapter has no pages.</p>
				) : (
					<div className="flex flex-col">
						{data.images.map((src, index) => (
							<Page key={src} src={src} index={index} total={data.images.length} />
						))}
					</div>
				)}
			</main>

			<nav
				aria-label="Chapter navigation"
				className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-8"
			>
				<button
					type="button"
					onClick={() => goTo(data.prev_chapter_id)}
					disabled={!data.prev_chapter_id}
					className="rounded-md border border-ink-700 px-4 py-2.5 text-sm font-medium text-ink-200 transition enabled:hover:border-accent-500 enabled:hover:text-ink-100 disabled:opacity-40"
				>
					← Previous
				</button>

				<Link
					to={seriesHref}
					className="rounded-md px-4 py-2.5 text-sm text-ink-400 transition hover:text-ink-100"
				>
					All chapters
				</Link>

				<button
					type="button"
					onClick={() => goTo(data.next_chapter_id)}
					disabled={!data.next_chapter_id}
					className="rounded-md bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-accent-500 disabled:opacity-40"
				>
					Next →
				</button>
			</nav>

			<p className="pb-10 text-center text-xs text-ink-400">
				Use ← and → to change chapter, Esc for the series page.
			</p>
		</div>
	);
}
