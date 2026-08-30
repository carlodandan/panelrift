// src/components/Pagination.tsx

import { cn } from '../lib/cn';

interface Props {
	page: number;
	perPage: number;
	total: number;
	onChange: (page: number) => void;
}

/**
 * Build a page list with ellipses: 1 … 4 5 [6] 7 8 … 40.
 *
 * Long-running series run to several hundred chapters, so rendering every page
 * button is not an option.
 */
function pageWindow(page: number, last: number): (number | 'gap')[] {
	if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);

	const pages = new Set<number>([1, last, page]);
	for (const offset of [-2, -1, 1, 2]) {
		const candidate = page + offset;
		if (candidate > 1 && candidate < last) pages.add(candidate);
	}

	const sorted = [...pages].sort((a, b) => a - b);
	const result: (number | 'gap')[] = [];
	let previous = 0;
	for (const value of sorted) {
		if (previous && value - previous > 1) result.push('gap');
		result.push(value);
		previous = value;
	}
	return result;
}

export function Pagination({ page, perPage, total, onChange }: Props) {
	const last = Math.max(1, Math.ceil(total / perPage));
	if (last <= 1) return null;

	const items = pageWindow(page, last);

	return (
		<nav aria-label="Chapter pages" className="flex flex-wrap items-center justify-center gap-1">
			<button
				type="button"
				onClick={() => onChange(page - 1)}
				disabled={page <= 1}
				className="rounded-md px-3 py-1.5 text-sm text-ink-200 transition enabled:hover:bg-ink-800 disabled:opacity-40"
			>
				Previous
			</button>

			{items.map((item, index) =>
				item === 'gap' ? (
					<span key={`gap-${index}`} className="px-2 text-ink-400" aria-hidden="true">
						…
					</span>
				) : (
					<button
						key={item}
						type="button"
						onClick={() => onChange(item)}
						aria-current={item === page ? 'page' : undefined}
						className={cn(
							'min-w-9 rounded-md px-2.5 py-1.5 text-sm tabular-nums transition',
							item === page
								? 'bg-accent-600 font-semibold text-white'
								: 'text-ink-200 hover:bg-ink-800',
						)}
					>
						{item}
					</button>
				),
			)}

			<button
				type="button"
				onClick={() => onChange(page + 1)}
				disabled={page >= last}
				className="rounded-md px-3 py-1.5 text-sm text-ink-200 transition enabled:hover:bg-ink-800 disabled:opacity-40"
			>
				Next
			</button>
		</nav>
	);
}
