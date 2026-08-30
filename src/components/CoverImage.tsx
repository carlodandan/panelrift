// src/components/CoverImage.tsx

import { useState } from 'react';
import { cn } from '../lib/cn';

interface Props {
	src: string | null;
	alt: string;
	className?: string;
	/** Covers below the fold should stay lazy; a hero cover should not. */
	eager?: boolean;
}

/**
 * A cover with two failure modes handled.
 *
 * `cover_url` is null whenever upstream did not expose one — the API returns null
 * rather than fabricating a path, so there is genuinely nothing to load. And a
 * URL that exists can still fail: these are third-party image hosts that come and
 * go. Either way the reader gets a labelled placeholder, not a broken-image icon.
 *
 * `referrerPolicy="no-referrer"` because image hosts commonly reject requests
 * carrying an unfamiliar Referer.
 */
export function CoverImage({ src, alt, className, eager = false }: Props) {
	const [failed, setFailed] = useState(false);

	if (src === null || failed) {
		return (
			<div
				className={cn(
					'flex items-center justify-center bg-ink-800 text-ink-400',
					'bg-[radial-gradient(circle_at_30%_20%,var(--color-ink-700),var(--color-ink-850))]',
					className,
				)}
				role="img"
				aria-label={`${alt} — no cover available`}
			>
				<svg viewBox="0 0 24 24" className="h-8 w-8 opacity-50" aria-hidden="true">
					<path
						fill="currentColor"
						d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 1.5V10h4.5L14 5.5ZM7 13h10v1.5H7V13Zm0 3.5h7V18H7v-1.5Z"
					/>
				</svg>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt={alt}
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			referrerPolicy="no-referrer"
			onError={() => setFailed(true)}
			className={cn('object-cover', className)}
		/>
	);
}
