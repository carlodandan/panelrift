# Panelrift API & Data Client Reference

This document provides a comprehensive reference for the typed client in `src/api/client.ts` and the underlying data schemas in `src/api/types.ts`.

---

## 1. Overview & Client Configuration

The frontend interacts with the API through the exported `api` singleton. All requests are asynchronous and accept an optional `AbortSignal` for cancellation upon component unmount or route change.

```typescript
import { api, ApiError } from '../api/client';
```

### Base URL Resolution
- **Development**: Proxied via Vite config from `/api/*` to `http://127.0.0.1:8787`.
- **Production**: Intercepted by Cloudflare Pages Functions (`functions/api/[[path]].ts`) and forwarded across service bindings.
- **Override**: Set `VITE_API_BASE_URL` in `.env` only if calling a remote, standalone worker directly.

---

## 2. API Endpoints

### 2.1 `api.home(signal?)`
Fetches home page aggregates, including 24-hour trending titles, weekly top series, monthly top series, and upstream errors.

- **Route**: `GET /v1/home`
- **Return Type**: `Promise<Home>`
- **Example**:
```typescript
const homeData = await api.home();
console.log(homeData['1d']?.manhwa); // Trending today
```

---

### 2.2 `api.ranking(period, signal?)`
Retrieves a full ranking list for a specific time window.

- **Route**: `GET /v1/home?period=:period`
- **Parameters**:
  - `period`: `'1d' | '1w' | '1m'` (day, week, month)
- **Return Type**: `Promise<RankingPeriod>`
- **Example**:
```typescript
const weekly = await api.ranking('1w');
```

---

### 2.3 `api.browse(query, signal?)`
Performs faceted catalog searches with genre filtering, sorting, release status, and pagination.

- **Route**: `GET /v1/browse?...`
- **Parameters**: `BrowseQuery`
  - `page`: Page index (1-based integer).
  - `sort?`: `'recently_added' | 'latest' | 'popular_daily' | 'popular_weekly' | 'popular_monthly' | 'popular_all_time' | 'rating' | 'az' | 'za'`.
  - `status?`: `'ongoing' | 'completed' | 'hiatus'`.
  - `type?`: `'manga' | 'manhwa' | 'manhua' | 'webtoon'`.
  - `include_genres?`: Comma-separated list of genres (e.g. `'Action,Fantasy'`).
  - `exclude_genres?`: Comma-separated list of genres to exclude.
- **Return Type**: `Promise<BrowseList>`

---

### 2.4 `api.search(term, signal?)`
Searches manhwa by title. Rate-limited by the worker to prevent scraping abuse.

- **Route**: `GET /v1/search?term=:term`
- **Parameters**:
  - `term`: Search term (minimum 2 characters).
- **Return Type**: `Promise<SearchResponse>`

---

### 2.5 `api.manhwa(slug, signal?)`
Retrieves comprehensive details for a specific series.

- **Route**: `GET /v1/manhwa/:slug`
- **Parameters**:
  - `slug`: Series slug identifier (e.g. `'solo-leveling'`).
- **Return Type**: `Promise<Manhwa>`

---

### 2.6 `api.chapters(slug, page, perPage, signal?)`
Returns a paginated list of chapters for a series.

- **Route**: `GET /v1/manhwa/:slug/chapters?page=:page&per_page=:perPage`
- **Return Type**: `Promise<ChapterList>`

---

### 2.7 `api.chapter(chapterId, signal?)`
Fetches high-resolution page image URLs and metadata for a single chapter.

- **Route**: `GET /v1/chapters/:chapterId`
- **Parameters**:
  - `chapterId`: Opaque chapter identifier.
- **Return Type**: `Promise<Chapter>`

---

### 2.8 `api.recentlyAdded(page?, signal?)`
Retrieves recently added series from the catalog.

- **Route**: `GET /v1/recently_added?page=:page`
- **Return Type**: `Promise<BrowseList>`

---

## 3. Data Models (`src/api/types.ts`)

```typescript
export interface ManhwaSummary {
  title: string;
  slug: string;
  cover_url: string | null;
  rating: number | null;
  latest_chapter: string | null;
  last_updated: string | null;
}

export interface Manhwa extends ManhwaSummary {
  alternative_title: string | null;
  author: string | null;
  status: string | null;
  description: string | null;
  genres: string[];
  views: string | null;
  bookmarks: string | null;
  rating_count: number | null;
  chapter_count: number | null;
  chapters_truncated: boolean;
  chapters: ChapterSummary[];
}

export interface Chapter {
  id: string;
  manhwa_slug: string | null;
  manhwa_title: string | null;
  chapter_title: string | null;
  page_count: number;
  prev_chapter_id: string | null;
  next_chapter_id: string | null;
  images: string[];
}
```

---

## 4. Error Handling (`ApiError`)

The client encapsulates errors into an `ApiError` class:

```typescript
export class ApiError extends Error {
  readonly status: number; // HTTP status code (or 0 for network drop)
  readonly code: string;   // API error code ('parse_error', 'not_found', etc.)
  get isPermanent(): boolean; // True for 400 and 404 (non-retryable)
}
```

### Common Error Codes

| Code | Meaning | User Guidance | Retryable? |
|---|---|---|---|
| `network_error` | Failed to reach server (offline/DNS) | Check your connection | Yes |
| `not_found` | Series or chapter does not exist | Page does not exist | No |
| `parse_error` | Upstream scraper layout mismatch | Requires upstream scraper fix | No |
| `upstream_timeout`| Third-party source took too long | Upstream slow, try again | Yes |
| `rate_limited` | Exceeded 20 req/10s rate limit | Cool down and retry | Yes (after delay) |
