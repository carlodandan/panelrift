# SEO, Structured Data & Analytics Guide

This document outlines Panelrift's technical SEO architecture, JSON-LD structured data implementation, Google Analytics 4 event tracking, and crawler configurations.

---

## 1. Zero-Dependency Head Management (`src/hooks/useSEO.ts`)

Rather than relying on heavy third-party packages, Panelrift uses a native React hook (`useSEO`) to manage document head tags, canonical URLs, and structured data during client-side navigation.

### Hook Signature

```typescript
export interface SEOProps {
  title?: string;
  description?: string;
  image?: string | null;
  canonicalUrl?: string;
  type?: 'website' | 'article' | 'book';
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function useSEO(props?: SEOProps): void;
```

### Managed Tags
1. `<title>`: Updates document title (`${title} | Panelrift`).
2. `<meta name="description">`, `og:description`, `twitter:description`.
3. `<link rel="canonical" href="...">`: Dynamically updates to match current URL.
4. `og:image`, `twitter:image`, `og:type`, `twitter:card`.
5. `<script type="application/ld+json" data-seo-jsonld="true">`: Injects and cleans up route-specific schema.

---

## 2. Structured Data Strategy (JSON-LD)

Panelrift employs a dual-layer structured data approach:

### 2.1 Static Site-Wide Schema (`index.html`)
Included directly in the initial HTML for immediate parsing by basic web crawlers:
- **`WebSite`**: Declares website name, URL, and a `SearchAction` enabling Google sitelinks search.
- **`Organization`**: Declares brand name and official logo URL.

### 2.2 Dynamic Entity Schema (React `useSEO`)
Injected dynamically based on API responses:
- **`Book` / `CreativeWorkSeries`** (`/series/:slug`): Includes series title, alternate title, author, synopsis, cover image, genres, and **`aggregateRating`** (triggering star ratings in Google search snippets).
- **`BreadcrumbList`** (`/series/:slug`, `/browse`, `/rankings`): Generates structured navigation breadcrumbs for Google SERP display.

---

## 3. Heading Hierarchy & Core Web Vitals Standards

### 3.1 Single H1 per Page
- Every page guarantees exactly **one** `<h1>` element.
- Home Page uses a primary semantic `<h1>` while carousel slide titles use `<h2>`.
- Browse, Rankings, and Reader pages feature clear, accessible `<h1>` headings.

### 3.2 Strict Heading Flow
- Heading levels never skip: `<h1>` -> `<h2>` -> `<h3>`.
- Card titles inside grids are styled as `<h3>`, nested beneath section `<h2>` headings.

### 3.3 Core Web Vitals Image Prioritization
- **LCP Optimization**: Active hero covers and series detail covers use `fetchPriority="high"` and `eager`.
- **Bandwidth Preservation**: Off-screen or hidden carousel slides use `fetchPriority="low"`.
- **CLS Prevention**: All image wrappers reserve a `2:3` aspect ratio before images decode.

---

## 4. Google Analytics 4 Event Tracking (`src/lib/analytics.ts`)

Custom interaction events are dispatched to Google Analytics 4 via `gtag()`:

| Event Name | Trigger | Parameters |
|---|---|---|
| `open_browse` | User navigates to Browse catalog | `{ event_category: 'engagement' }` |
| `open_rankings`| User navigates to Rankings view | `{ event_category: 'engagement' }` |
| `open_title` | User opens a series detail page | `{ content_id: slug, event_category: 'engagement' }` |
| `add_to_library`| User bookmarks a manhwa | `{ content_id: slug, content_type: 'manhwa', title: string }` |

---

## 5. Crawler & Security Configurations

### 5.1 Cloudflare Headers (`public/_headers`)
Enforces HTTPS and security policies across all routes:
```http
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 5.2 AI Engine Indexation (`public/llms.txt`)
Provides structured documentation for LLMs and AI search engines (Perplexity, Google Gemini, Search AI Overviews) detailing site purpose, routes, and API architecture.
