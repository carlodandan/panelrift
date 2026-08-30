/** The API rejects search terms shorter than this with a 400. */
export const MIN_TERM = 2;

/** Chapter list page size. The API clamps `per_page` at 500. */
export const CHAPTERS_PER_PAGE = 60;

/** How long to wait after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 350;
