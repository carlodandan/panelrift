import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RankingsPage } from './pages/RankingsPage';
import { SearchPage } from './pages/SearchPage';
import { SeriesPage } from './pages/SeriesPage';
import { ReaderPage } from './pages/ReaderPage';
import { LibraryPage } from './pages/LibraryPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * The reader sits outside `Layout` deliberately: the site header, footer and page
 * padding all compete with full-bleed page art, so it gets its own chrome.
 */
export function App() {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/" element={<HomePage />} />
				<Route path="/rankings" element={<RankingsPage />} />
				<Route path="/search" element={<SearchPage />} />
				<Route path="/series/:slug" element={<SeriesPage />} />
				<Route path="/library" element={<LibraryPage />} />
				<Route path="*" element={<NotFoundPage />} />
			</Route>
			<Route path="/read/:chapterId" element={<ReaderPage />} />
		</Routes>
	);
}
