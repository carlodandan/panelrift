// src/components/Layout.tsx

import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { cn } from '../lib/cn';

const NAV = [
	{ to: '/', label: 'Browse' },
	{ to: '/rankings', label: 'Rankings' },
	{ to: '/library', label: 'Library' },
];

function Logo() {
	return (
		<Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Panelrift, home">
			<img src="/panelrift_logo.png" alt="" className="h-7 w-7 rounded-md object-cover" aria-hidden="true" />
			<span className="text-lg font-bold tracking-widest text-accent-400">PANELRIFT</span>
		</Link>
	);
}

export function Layout() {
	const { pathname } = useLocation();

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

			<footer className="border-t border-ink-800 px-4 py-8 text-sm text-ink-400">
				<div className="mx-auto max-w-7xl space-y-2">
					<p>
						Panelrift is a reader UI over <span className="font-mono text-ink-200">manhwa-api</span>
						. It stores nothing: every page is fetched live and cached at the edge.
					</p>
					<p>
						Series metadata and artwork belong to their respective creators and publishers.
						Bookmarks and reading progress stay in this browser.
					</p>
				</div>
			</footer>
		</div>
	);
}
