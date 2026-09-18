import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';

const BrowsePage = lazy(() => import('./pages/BrowsePage').then((m) => ({ default: m.BrowsePage })));
const RankingsPage = lazy(() => import('./pages/RankingsPage').then((m) => ({ default: m.RankingsPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const SeriesPage = lazy(() => import('./pages/SeriesPage').then((m) => ({ default: m.SeriesPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then((m) => ({ default: m.ReaderPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

/**
 * The reader sits outside `Layout` deliberately: the site header, footer and page
 * padding all compete with full-bleed page art, so it gets its own chrome.
 */
export function App() {
	return (
		<Suspense fallback={<div className="min-h-[50vh]" />}>
			<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<HomePage />} />
					<Route path="/browse" element={<BrowsePage />} />
					<Route path="/rankings" element={<RankingsPage />} />
					<Route path="/search" element={<SearchPage />} />
					<Route path="/series/:slug" element={<SeriesPage />} />
					<Route path="/library" element={<LibraryPage />} />
					<Route path="*" element={<NotFoundPage />} />
				</Route>
				<Route path="/read/:chapterId" element={<ReaderPage />} />
			</Routes>
		</Suspense>
	);
}
