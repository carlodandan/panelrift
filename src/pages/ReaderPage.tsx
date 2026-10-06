import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Chapter } from '../api/types';
import { useResource } from '../hooks/useResource';
import { useProgress } from '../hooks/useLibrary';
import { useSEO } from '../hooks/useSEO';
import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { chapterNumberFromId, formatChapterNumber, titleFromSlug } from '../lib/format';
import { cn } from '../lib/cn';
import { ChapterChooserDrawer } from '../components/ChapterChooserDrawer';

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
function Page({
	src,
	index,
	total,
	seriesName,
	chapterHeading,
}: {
	src: string;
	index: number;
	total: number;
	seriesName?: string | null;
	chapterHeading?: string;
}) {
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
			{ rootMargin: '2000px 0px' }, // Pre-load quite early so readers don't hit blanks
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

	const altText = `${seriesName ? `${seriesName} ` : ''}${chapterHeading ? `${chapterHeading} ` : ''}Page ${index + 1} of ${total}`;

	return (
		<img
			// Changing the key on retry forces a fresh request rather than a cached failure.
			key={attempt}
			src={src}
			alt={altText}
			draggable={false}
			loading="eager" // We handle lazy loading manually via IntersectionObserver
			decoding="async"
			referrerPolicy="no-referrer"
			onError={() => setFailed(true)}
			className="reader-page select-none bg-ink-900"
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
	const [drawerOpen, setDrawerOpen] = useState(false);
	const lastScrollY = useRef(0);
	const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

	const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		pointerStartRef.current = {
			x: e.clientX,
			y: e.clientY,
			time: Date.now(),
		};
	}, []);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const start = pointerStartRef.current;
			pointerStartRef.current = null;
			if (!start) return;

			const dx = Math.abs(e.clientX - start.x);
			const dy = Math.abs(e.clientY - start.y);
			const dt = Date.now() - start.time;

			// Ignore drags/scrolls (>12px movement or >450ms hold)
			if (dx > 12 || dy > 12 || dt > 450) return;

			const target = e.target as HTMLElement | null;
			if (
				target?.closest(
					'button, a, input, select, textarea, [role="button"], [role="dialog"], [data-no-reader-tap]',
				)
			) {
				return;
			}

			if (drawerOpen) {
				setDrawerOpen(false);
				return;
			}

			// Single tap on screen toggles reader controls above
			setChromeVisible((prev) => !prev);
		},
		[drawerOpen],
	);

	const data = chapter.data;
	const number = useMemo(() => chapterNumberFromId(chapterId), [chapterId]);

	const seriesName =
		data?.manhwa_title ?? (data?.manhwa_slug ? titleFromSlug(data.manhwa_slug) : null);
	const heading = number
		? `Chapter ${formatChapterNumber(number)}`
		: (data?.chapter_title ?? 'Chapter');

	useSEO({
		title: data ? `${seriesName ?? 'Manhwa'} ${heading} — Read Online` : undefined,
		description: data
			? `Read ${seriesName ?? 'Manhwa'} ${heading} online for free in high-resolution vertical scroll format on Panelrift.`
			: undefined,
		canonicalUrl: `https://panelrift.eu.cc/read/${encodeURIComponent(chapterId)}`,
		jsonLd: data
			? {
					'@context': 'https://schema.org',
					'@type': 'BreadcrumbList',
					itemListElement: [
						{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://panelrift.eu.cc/' },
						...(data.manhwa_slug
							? [
									{
										'@type': 'ListItem',
										position: 2,
										name: seriesName ?? 'Series',
										item: `https://panelrift.eu.cc/series/${encodeURIComponent(data.manhwa_slug)}`,
									},
								]
							: []),
						{
							'@type': 'ListItem',
							position: data.manhwa_slug ? 3 : 2,
							name: heading,
							item: `https://panelrift.eu.cc/read/${encodeURIComponent(chapterId)}`,
						},
					],
				}
			: undefined,
	});

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
		setDrawerOpen(false);
	}, [chapterId]);

	// Hide the chrome while scrolling down, bring it back on any scroll up or near
	// the top. Reading is the whole point of the page; the toolbar is not.
	useEffect(() => {
		function onScroll() {
			if (drawerOpen) return;
			const y = window.scrollY;
			const goingDown = y > lastScrollY.current;
			if (Math.abs(y - lastScrollY.current) > 8) {
				setChromeVisible(!goingDown || y < 80);
				lastScrollY.current = y;
			}
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [drawerOpen]);

	useEffect(() => {
		try {
			localStorage.setItem(WIDTH_KEY, width);
		} catch {
			/* Preference is cosmetic; losing it is not worth handling. */
		}
	}, [width]);

	// Keyboard navigation. Left/right move between chapters, Escape returns to the
	// series page or closes drawer. Space and arrows-down keep their native scrolling behaviour.
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const target = event.target as HTMLElement | null;
			if (target instanceof HTMLInputElement || target?.isContentEditable === true) return;

			if (event.key === 'ArrowLeft') goTo(data?.prev_chapter_id ?? null);
			else if (event.key === 'ArrowRight') goTo(data?.next_chapter_id ?? null);
			else if (event.key === 'Escape') {
				if (drawerOpen) {
					setDrawerOpen(false);
				} else if (data?.manhwa_slug) {
					navigate(`/series/${encodeURIComponent(data.manhwa_slug)}`);
				}
			} else if (event.key === 'c' || event.key === 'C') {
				setDrawerOpen((prev) => !prev);
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [data, goTo, navigate, drawerOpen]);

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

	const seriesHref = data.manhwa_slug ? `/series/${encodeURIComponent(data.manhwa_slug)}` : '/';

	return (
		<div
			className="min-h-dvh bg-ink-950 [touch-action:manipulation]"
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
		>
			<header
				className={cn(
					'sticky top-0 z-40 border-b border-ink-800 bg-ink-900/90 backdrop-blur-md transition-transform duration-200',
					!chromeVisible && '-translate-y-full',
				)}
			>
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
					<Link
						to={seriesHref}
						className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs sm:text-sm text-ink-200 hover:bg-ink-800 hover:text-ink-100 transition"
						title={seriesName ? `Back to ${seriesName}` : 'Back to series'}
					>
						<span aria-hidden="true">←</span>
						<span className="max-w-[6.5rem] sm:max-w-[12rem] md:max-w-[16rem] truncate">
							{seriesName ?? 'Series'}
						</span>
					</Link>

					{/* Center: Chapter navigation & chooser */}
					<div className="flex items-center gap-1 sm:gap-1.5">
						<button
							type="button"
							onClick={() => goTo(data.prev_chapter_id)}
							disabled={!data.prev_chapter_id}
							aria-label="Previous chapter"
							title={data.prev_chapter_id ? 'Previous chapter (← key)' : 'No previous chapter'}
							className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700/60 bg-ink-850/80 text-ink-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100 disabled:opacity-30 disabled:hover:border-ink-700/60 disabled:hover:bg-ink-850/80 disabled:cursor-not-allowed"
						>
							<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
								<path
									fillRule="evenodd"
									d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06-.02z"
									clipRule="evenodd"
								/>
							</svg>
						</button>

						<button
							type="button"
							onClick={() => setDrawerOpen((open) => !open)}
							aria-haspopup="dialog"
							aria-expanded={drawerOpen}
							aria-label="Choose chapter"
							title="Choose chapter (C key)"
							className={cn(
								'group flex h-9 items-center gap-1.5 sm:gap-2 rounded-lg border px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition active:scale-95',
								drawerOpen
									? 'border-accent-500 bg-accent-600/20 text-accent-300'
									: 'border-ink-700/70 bg-ink-850/90 text-ink-100 hover:border-ink-600 hover:bg-ink-800',
							)}
						>
							<span className="truncate max-w-[7.5rem] sm:max-w-[14rem]">{heading}</span>
							<svg
								viewBox="0 0 20 20"
								fill="currentColor"
								className={cn(
									'h-4 w-4 text-ink-400 group-hover:text-accent-400 transition-transform duration-200',
									drawerOpen && 'rotate-180 text-accent-400',
								)}
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
									clipRule="evenodd"
								/>
							</svg>
						</button>

						<button
							type="button"
							onClick={() => goTo(data.next_chapter_id)}
							disabled={!data.next_chapter_id}
							aria-label="Next chapter"
							title={data.next_chapter_id ? 'Next chapter (→ key)' : 'No next chapter'}
							className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700/60 bg-ink-850/80 text-ink-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100 disabled:opacity-30 disabled:hover:border-ink-700/60 disabled:hover:bg-ink-850/80 disabled:cursor-not-allowed"
						>
							<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
								<path
									fillRule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06.02z"
									clipRule="evenodd"
								/>
							</svg>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<span className="hidden text-xs text-ink-400 sm:inline">{data.page_count} pages</span>

						<div role="group" aria-label="Reading width" className="hidden shrink-0 gap-1 md:flex">
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

						<button
							type="button"
							onClick={() => setDrawerOpen(true)}
							aria-label="All chapters"
							title="Browse all chapters"
							className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-700/60 bg-ink-850/80 px-2.5 text-xs font-medium text-ink-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-ink-100"
						>
							<svg
								viewBox="0 0 20 20"
								fill="currentColor"
								className="h-4 w-4 text-ink-400"
								aria-hidden="true"
							>
								<path
									fillRule="evenodd"
									d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
									clipRule="evenodd"
								/>
							</svg>
							<span className="hidden sm:inline">Chapters</span>
						</button>
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
							<Page
								key={src}
								src={src}
								index={index}
								total={data.images.length}
								seriesName={seriesName}
								chapterHeading={heading}
							/>
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

				<button
					type="button"
					onClick={() => setDrawerOpen(true)}
					className="rounded-md border border-ink-800 bg-ink-900/60 px-4 py-2.5 text-sm font-medium text-ink-300 transition hover:border-ink-700 hover:bg-ink-850 hover:text-ink-100"
				>
					Choose chapter
				</button>

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
				Use ← and → to change chapter, C to choose chapter, tap screen to toggle controls.
			</p>

			<ChapterChooserDrawer
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				slug={data.manhwa_slug}
				currentChapterId={data.id}
				seriesTitle={seriesName}
				onSelectChapter={goTo}
			/>
		</div>
	);
}
