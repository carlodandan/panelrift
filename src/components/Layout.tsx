import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { cn } from '../lib/cn';

const NAV = [
	{ to: '/', label: 'Home' },
	{ to: '/browse', label: 'Browse' },
	{ to: '/rankings', label: 'Rankings' },
	{ to: '/library', label: 'Library' },
];

function Logo() {
	return (
		<Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Panelrift, home">
			<img
				src="/icons/android-icon-192x192.png"
				alt=""
				className="h-7 w-7 rounded-md object-cover"
				aria-hidden="true"
			/>
			<span className="text-lg font-bold tracking-widest text-accent-400">PANELRIFT</span>
		</Link>
	);
}

export function Layout() {
	const { pathname, search } = useLocation();

	// Automatically scroll to the top of the page whenever the route changes.
	// This ensures clicking footer links doesn't leave the user stuck at the bottom.
	useEffect(() => {
		window.scrollTo(0, 0);
	}, [pathname, search]);

	return (
		<div className="flex min-h-dvh flex-col bg-ink-950">
			{/* A keyboard user should not have to tab the whole header to reach the page. */}
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
			>
				Skip to content
			</a>

			<header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/85 backdrop-blur-md">
				<div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
					<Logo />

					<nav aria-label="Main" className="order-3 w-full sm:order-none sm:w-auto">
						<ul className="flex gap-1">
							{NAV.map((item) => (
								<li key={item.to}>
									<NavLink
										to={item.to}
										end={item.to === '/'}
										className={({ isActive }) =>
											cn(
												'rounded-md px-3 py-1.5 text-sm font-medium transition',
												isActive
													? 'bg-ink-800 text-ink-100'
													: 'text-ink-200 hover:bg-ink-850 hover:text-ink-100',
											)
										}
									>
										{item.label}
									</NavLink>
								</li>
							))}
						</ul>
					</nav>

					<div className="ml-auto w-full max-w-sm sm:w-64 md:w-80">
						{/* Remount on route change so a stale term does not linger in the box. */}
						<SearchBar key={pathname} />
					</div>
				</div>
			</header>

			<main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
				<Outlet />
			</main>

			<footer className="border-t border-ink-800 bg-ink-900/60">
				<div className="mx-auto max-w-7xl px-4 py-12">
					{/* Top grid: brand + nav columns */}
					<div className="grid gap-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-3">
						{/* Brand */}
						<div className="flex flex-col items-center space-y-4 sm:items-start">
							<Link to="/" className="inline-flex items-center gap-2" aria-label="Panelrift home">
								<img
									src="/icons/android-icon-192x192.png"
									alt=""
									className="h-8 w-8 rounded-md object-cover"
									aria-hidden="true"
								/>
								<span className="text-lg font-bold tracking-widest text-accent-400">PANELRIFT</span>
							</Link>
							<p className="max-w-xs text-sm leading-relaxed text-ink-400">
								A fast, clean reader for manhwa and webtoons. Rankings, search, and a
								distraction-free vertical reader - all fetched live, nothing stored on our end.
							</p>
						</div>

						{/* Navigate */}
						<div className="space-y-4">
							<h3 className="text-xs font-semibold uppercase tracking-widest text-ink-200">
								Navigate
							</h3>
							<ul className="space-y-2">
								{NAV.map((item) => (
									<li key={item.to}>
										<Link
											to={item.to}
											className="text-sm text-ink-400 transition hover:text-accent-400"
										>
											{item.label}
										</Link>
									</li>
								))}
								<li>
									<Link
										to="/rankings?period=1d"
										className="text-sm text-ink-400 transition hover:text-accent-400"
									>
										Trending today
									</Link>
								</li>
								<li>
									<Link
										to="/rankings?period=1w"
										className="text-sm text-ink-400 transition hover:text-accent-400"
									>
										This week
									</Link>
								</li>
							</ul>
						</div>

						{/* Disclaimer */}
						<div className="space-y-4">
							<h3 className="text-xs font-semibold uppercase tracking-widest text-ink-200">
								Disclaimer
							</h3>
							<p className="text-sm leading-relaxed text-ink-400">
								Panelrift does not host or store any manga or manhwa content. All series metadata,
								artwork, and chapters belong to their respective creators and publishers.
							</p>
							<p className="text-sm leading-relaxed text-ink-400">
								Bookmarks and reading progress are stored locally in your browser and never sent to
								any server.
							</p>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink-800 pt-6 text-center sm:flex-row sm:text-left">
						<p className="text-xs text-ink-400">
							© {new Date().getFullYear()} Panelrift. For personal use only.
						</p>
						<p className="text-xs text-ink-400">
							Built using <span className="font-mono text-ink-200">manhwa-api</span>
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
