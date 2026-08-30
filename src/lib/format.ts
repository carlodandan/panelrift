/** Render a rating as one decimal, or an em dash when the API gave us null. */
export function formatRating(rating: number | null): string {
	return rating === null ? '—' : rating.toFixed(1);
}

/**
 * Compact a count for display: 1234 -> "1.2K".
 *
 * The API passes some counts through as upstream's own strings ("4.2M"), so this
 * only runs on the numeric fields and leaves pre-formatted strings alone.
 */
export function formatCount(value: number | null): string {
	if (value === null) return '—';
	if (value < 1000) return String(value);
	const units = [
		{ limit: 1_000_000_000, suffix: 'B' },
		{ limit: 1_000_000, suffix: 'M' },
		{ limit: 1_000, suffix: 'K' },
	];
	for (const { limit, suffix } of units) {
		if (value >= limit) {
			const scaled = value / limit;
			return `${scaled >= 10 ? Math.round(scaled) : scaled.toFixed(1)}${suffix}`;
		}
	}
	return String(value);
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
	{ amount: 60, unit: 'second' },
	{ amount: 60, unit: 'minute' },
	{ amount: 24, unit: 'hour' },
	{ amount: 7, unit: 'day' },
	{ amount: 4.34524, unit: 'week' },
	{ amount: 12, unit: 'month' },
	{ amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

/**
 * Turn an ISO timestamp into "3 days ago".
 *
 * Prefers `published_at` where the API has it, since upstream's own relative
 * strings ("2 years ago") were rendered when the page was scraped, not when it
 * is being read, and drift as the cache ages.
 */
export function formatRelative(iso: string | null): string | null {
	if (!iso) return null;
	const parsed = Date.parse(iso);
	if (!Number.isFinite(parsed)) return null;

	let delta = (parsed - Date.now()) / 1000;
	for (const { amount, unit } of DIVISIONS) {
		if (Math.abs(delta) < amount) return RELATIVE.format(Math.round(delta), unit);
		delta /= amount;
	}
	return null;
}

/** Best available date string for a chapter: computed if possible, else upstream's. */
export function chapterDate(published: string | null, fallback: string | null): string | null {
	return formatRelative(published) ?? fallback;
}

/**
 * Clean a chapter label for display.
 *
 * Upstream labels carry a locale suffix — the API hands back "6-eng-li", not "6" —
 * and multi-part labels are hyphenated slugs. Verified against live data: both the
 * ranking `latest_chapter` and each `chapters[].number` arrive suffixed.
 */
export function formatChapterNumber(number: string): string {
	return number
		.replace(/-eng(?:-li)?$/i, '')
		.replace(/-/g, ' ')
		.trim();
}

/**
 * Upstream's "time since" strings arrive without the trailing word, so
 * "10 hours, 44 minutes" needs an "ago" to read as a time rather than a duration.
 * Anything that already reads as relative is passed through untouched.
 */
export function formatUpstreamAge(value: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (/\b(ago|just now|yesterday|today)\b/i.test(trimmed)) return trimmed;
	return /\d/.test(trimmed) ? `Last Updated: ${trimmed}` : trimmed;
}

/**
 * Upstream's chapter count is sometimes the latest chapter's label rather than a
 * count ("6-eng-li"), so present it as a chapter reference when it is not numeric.
 */
export function formatChapterCount(value: string | null): string | null {
	if (!value) return null;
	const cleaned = formatChapterNumber(value);
	return /^\d+$/.test(cleaned) ? cleaned : `latest ${cleaned}`;
}

/**
 * Recover a chapter number from an opaque chapter id.
 *
 * The chapter endpoint returns an id and a title but no number, and the id is the
 * only place the number reliably appears. Requires a digit right after
 * "-chapter-" so an id with no number in it yields null instead of a stray word.
 */
export function chapterNumberFromId(id: string): string | null {
	return /-chapter-(\d[\w.]*?)(?:-eng(?:-li)?)?\/?$/.exec(id)?.[1] ?? null;
}

/** Turn a slug back into something readable, for when no title is available. */
export function titleFromSlug(slug: string): string {
	return slug
		.replace(/-(?:mg|kk|x)\d+$/i, '')
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase());
}
