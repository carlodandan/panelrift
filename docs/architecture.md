# Panelrift Architecture Documentation

This document outlines the high-level architecture, system components, data flows, and design decisions for the **Panelrift** web client.

---

## 1. System Overview

Panelrift is a high-performance web client built for discovering, browsing, and reading manhwa and webtoons. It is deployed as a single-page application (SPA) on Cloudflare Pages, consuming data from the headless `manhwa-api` worker over internal Cloudflare service bindings.

```mermaid
graph TD
    User([Reader / Browser]) -->|HTTPS Requests| CFP[Cloudflare Pages: panelrift]
    CFP -->|Static Assets & Hydration| SPA[React 19 Frontend App]
    CFP -->|/api/* Requests| PF[Pages Function: functions/api/[[path]].ts]
    PF -->|Internal Service Binding API| CFW[Cloudflare Worker: panelrift-api]
    CFW -->|Scraping & Upstream Caching| Upstream[(Upstream Providers / CDNs)]
    SPA -->|Local Storage Cache| LS[(Browser LocalStorage)]
    SPA -->|Telemetry Events| GA[Google Analytics 4 & GTM]
```

---

## 2. C4 Architecture Models

### 2.1 Level 1: System Context Diagram

```mermaid
C4Context
    title System Context Diagram for Panelrift

    Person(reader, "Manhwa Reader", "Visits Panelrift to discover and read webtoons with zero ad distractions.")
    System(panelrift, "Panelrift Web Client", "Provides responsive vertical reading, live rankings, filters, and local bookmarking.")
    System_Ext(apiWorker, "Panelrift API (Worker)", "Stateless backend proxy and scraper delivering normalized JSON payloads.")
    System_Ext(ga4, "Google Analytics 4", "Tracks user interaction events and route page views.")
    System_Ext(imageHost, "Upstream Image CDNs", "Delivers comic chapter page panels and series cover art.")

    Rel(reader, panelrift, "Browses, searches, reads chapters via", "HTTPS")
    Rel(panelrift, apiWorker, "Proxies /api/* calls through", "Cloudflare Service Binding")
    Rel(panelrift, ga4, "Dispatches telemetry events to", "gtag.js")
    Rel(panelrift, imageHost, "Fetches cover art & comic pages from", "HTTPS (no-referrer)")
```

### 2.2 Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram for Panelrift Frontend

    Container(spa, "SPA Frontend", "React 19, TypeScript, Tailwind CSS v4, Vite", "Client-side routing, reader controls, UI components, local state")
    Container(pagesFunc, "Pages Function", "TypeScript, Cloudflare Pages Functions", "Same-origin reverse proxy, forwarder, security header injector")
    ContainerDb(storage, "Browser LocalStorage", "Web Storage API", "Holds bookmarks, reading progress, reader widths")

    Rel(spa, pagesFunc, "Calls /api/* endpoints", "HTTP fetch")
    Rel(spa, storage, "Persists progress and bookmarks", "useStoredMap hook")
```

---

## 3. Data Flow & Proxy Architecture

### 3.1 Same-Origin Zero-CORS Gateway

The browser **never** calls the backend worker's public URL directly. All requests are routed through `/api/*` on the same domain:

```mermaid
sequenceDiagram
    autonumber
    actor Reader as Browser
    participant PF as Pages Function (/api/*)
    participant CFW as Worker (panelrift-api)
    participant Upstream as Upstream Source

    Reader->>PF: GET /api/v1/manhwa/solo-leveling
    Note over PF: Drops inbound X-Proxy-Secret<br/>Attaches secret PROXY_SECRET<br/>Forwards client IP
    PF->>CFW: Dispatch over Service Binding
    CFW->>Upstream: Scrape / Retrieve Cache
    Upstream-->>CFW: Raw HTML / Upstream Data
    CFW-->>PF: Normalized JSON { data }
    PF-->>Reader: 200 OK + JSON
```

### 3.2 Benefits of Service Binding Architecture
1. **Zero CORS Overhead**: Browser communicates exclusively with its own origin (`https://panelrift.eu.cc`).
2. **Internal Network Dispatch**: Requests travel over Cloudflare's private backbone rather than the public internet.
3. **Hidden Worker**: The backend worker can run with `workers_dev = false`, eliminating public endpoint exposure.
4. **Client IP Forwarding**: Pages Functions preserve `CF-Connecting-IP`, preventing the entire site from sharing a single IP rate-limiting bucket.

---

## 4. Frontend Component Hierarchy

```mermaid
graph TD
    App[App.tsx - Router]
    Layout[Layout.tsx - Main Layout]
    Reader[ReaderPage.tsx - Fullscreen Reader]

    App --> Layout
    App --> Reader

    Layout --> Header[Header: Logo, Nav, SearchBar]
    Layout --> MainContent[Outlet: Page Components]
    Layout --> Footer[Footer: Navigation, Popular Genres, Disclaimer]

    MainContent --> Home[HomePage.tsx]
    MainContent --> Browse[BrowsePage.tsx]
    MainContent --> Rankings[RankingsPage.tsx]
    MainContent --> Series[SeriesPage.tsx]
    MainContent --> Search[SearchPage.tsx]
    MainContent --> Library[LibraryPage.tsx]
    MainContent --> NotFound[NotFoundPage.tsx]

    Home --> Hero[HeroSlideshow & HeroSlide]
    Home --> SeriesGrid[SeriesGrid & SeriesCard]
    Browse --> FilterSidebar[Filters: Sort, Type, Status, Genres]
    Browse --> BrowseGrid[SeriesGrid]
    Series --> ChaptersList[Chapters with Pagination]
    Series --> CoverImg[CoverImage]
    SeriesCard --> CoverImg
```

---

## 5. Performance & Core Web Vitals Strategy

### 5.1 Largest Contentful Paint (LCP)
- The active hero slideshow cover (`rank === 1`) on the Home Page and the series cover on the Series Detail Page explicitly use `fetchPriority="high"` and `eager`.
- Background, inactive carousel slides use `fetchPriority="low"` and `eager={false}` to prevent network contention.

### 5.2 Cumulative Layout Shift (CLS)
- All card images and reader page slots reserve exact aspect ratios (`aspect-2/3`) before images decode.
- Skeleton components render identical dimensional footprints to incoming API data.

### 5.3 Interaction to Next Paint (INP)
- Search inputs use a two-tier debouncing model (`typed` state reflects immediate keystrokes; `term` debounces API requests by `SEARCH_DEBOUNCE_MS`).
- Filter updates and scroll events are throttled and run inside passive event listeners.

---

## 6. Client-Side Privacy & Storage Architecture

Panelrift is intentionally stateless with no user registration. User data is stored locally:

- **Key `panelrift:bookmarks:v1`**: Stored as a hash map of bookmarked series keyed by slug.
- **Key `panelrift:progress:v1`**: Stored as reading progress keyed by slug, containing `chapterId`, `chapterNumber`, and `read_at` timestamp.
- **Cross-Tab Synchronization**: Custom `EventTarget` dispatches local change events within the same tab, while native `storage` events synchronize changes across multiple open tabs.
