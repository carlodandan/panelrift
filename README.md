# Panelrift

A manhwa reading site built on [`manhwa-api`](../manga-api). React + Vite + Tailwind,
deployable as static files anywhere.

It is an original interface rather than a copy of any existing site's design: the
feature set mirrors what a manhwa reader needs — rankings, search, series detail, a
vertical webtoon reader — and everything visual is its own.

## Quick start

The API has to be running first, since every page is driven by it:

```bash
# terminal 1 — the worker
cd ../manga-api && npm run dev        # http://127.0.0.1:8787

# terminal 2 — this app
npm install
npm run dev                            # http://localhost:5173
```

In dev, Vite proxies `/api/*` to `127.0.0.1:8787`, so the browser only ever talks to
one origin and CORS never comes up. A deploy keeps that same `/api` prefix, so leave
`VITE_API_BASE_URL` unset in both cases:

```bash
npm run build && npm run preview
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR and the `/api` proxy |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | typecheck, then build |

## How `/api` is served in production

The browser never calls the worker directly. `functions/api/[[path]].ts` is a Pages
Function that answers `/api/*` on this domain and forwards to the worker over the
`API` service binding declared in `wrangler.jsonc`. Cloudflare dispatches that
inside its own network, so the worker needs no public hostname at all — with
`workers_dev` off it becomes unreachable except through this app, which no CORS
allowlist can achieve on its own.

Two things to keep in mind:

- The binding has to exist for **both** Production and Preview. `wrangler.jsonc`
  declares each explicitly, because named environments do not inherit bindings.
- Adding `wrangler.jsonc` means the dashboard's own Bindings and Variables settings
  for this project are ignored. Move anything configured there into the file.

To exercise the Function locally instead of the Vite proxy, run
`wrangler pages dev dist --service API=manhwa-api` with the worker running next to
it, and drop the `rewrite` from the Vite proxy so the `/api` prefix survives.

## Routes

| Route | Page |
| --- | --- |
| `/` | Today's lead series, continue-reading, trending grid, weekly/monthly rails |
| `/rankings?period=1d\|1w\|1m` | Full ranking for one period |
| `/search?term=` | Debounced title search |
| `/series/:slug` | Detail, genres, stats, paginated chapter list |
| `/read/:chapterId` | Vertical webtoon reader |
| `/library` | Bookmarks and reading history from this browser |

Deploying to static hosting needs a SPA rewrite — every path must serve
`index.html`, or a refresh on `/series/foo` 404s. On Cloudflare Pages that is
automatic; on nginx it is `try_files $uri /index.html`.

## The reader

The reader is the page everything else exists to reach, so it gets its own chrome
outside the site layout — a header, footer and page padding all compete with
full-bleed page art.

- Vertical continuous scroll, images butted together with no seam
- Header auto-hides on scroll down, returns on scroll up
- Scroll-progress bar, page count, three reading widths (remembered)
- `←` / `→` change chapter, `Esc` returns to the series page
- A failed page image gets its own retry button rather than reloading the chapter
- Reading position is recorded on arrival, so a closed tab still counts

## Design notes

**One resource hook.** `useResource` handles every fetch: loading, error, retry, and
an `AbortController` on cleanup. The abort matters most in the reader — without it a
slow chapter request can land after a faster one and paint the wrong pages.

**Errors say what happened.** `ErrorState` reads the API's own error codes, so
`parse_error` ("the source page changed shape — this needs a scraper fix, not a
retry") and `upstream_timeout` ("retrying often works") get different copy and only
the retryable ones get a retry button.

**Nulls are expected, not exceptional.** The API returns `null` rather than
fabricating values, so covers, ratings and dates are all optional at the type level.
`CoverImage` handles both an absent URL and a URL that fails to load — these are
third-party image hosts — and sends no `Referer`, which some of them reject.

**Skeletons match their content's shape.** Placeholder grids use the real card
aspect ratio so nothing shifts when data lands.

**Chapter ids stay opaque.** They come from listings and are passed straight back;
the client never builds one, because upstream's id format is upstream's to change.

**Display-layer cleanup.** Verified against live data: chapter labels arrive with a
locale suffix (`6-eng-li`), `chapter_count` sometimes holds the latest chapter label
instead of a count, and relative dates arrive without their trailing "ago". The
formatters in `src/lib/format.ts` normalise all three at render time, each with a
comment saying why.

**Library is local by choice.** The API is stateless with no accounts, so bookmarks
and progress live in `localStorage` behind a hook that tolerates unavailable storage.
Writes are skipped when nothing changed, so re-opening a chapter does not reshuffle
the continue-reading order. The cost is that the library does not follow you to
another device — the right trade for a site with no sign-up.

**Accessibility.** Skip link, one `:focus-visible` ring everywhere, real
`aria-pressed`/`aria-current`/`role="alert"` semantics, alt text on every page image,
and `prefers-reduced-motion` honoured globally.

## Layout

```
src/
  api/        typed client + a mirror of the API's contract
  components/ Layout, SearchBar, SeriesCard, CoverImage, Pagination, Skeleton, ErrorState
  hooks/      useResource (fetch + abort), useLibrary (bookmarks, progress)
  lib/        formatters, class-name helper, shared constants
  pages/      one file per route
```

Series metadata and artwork belong to their creators and publishers; this app only
displays what the API returns and stores nothing server-side.
