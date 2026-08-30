// src/components/Skeleton.tsx

import { cn } from '../lib/cn';

/** A single shimmering block. Sized by the caller. */
export function Skeleton({ className }: { className?: string }) {
	return (
		<div className={cn('animate-pulse rounded-md bg-ink-800', className)} aria-hidden="true" />
	);
}

/**
 * Placeholder grid shown while a listing loads.
 *
 * Mirrors the real card's aspect ratio so the layout does not jump when data
 * arrives — the shift is what makes a loading state feel broken.
 */
export function CardGridSkeleton({ count = 12 }: { count?: number }) {
	return (
		<div
			className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
			aria-hidden="true"
		>
			{Array.from({ length: count }, (_, index) => (
				<div key={index} className="space-y-2">
					<Skeleton className="aspect-2/3 w-full" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-3 w-2/5" />
				</div>
			))}
		</div>
	);
}

export function DetailSkeleton() {
	return (
		<div className="space-y-8" aria-hidden="true">
			<div className="flex flex-col gap-6 sm:flex-row">
				<Skeleton className="aspect-2/3 w-44 shrink-0 sm:w-52" />
				<div className="flex-1 space-y-3">
					<Skeleton className="h-8 w-2/3" />
					<Skeleton className="h-4 w-1/3" />
					<Skeleton className="h-20 w-full" />
					<div className="flex gap-2">
						<Skeleton className="h-7 w-20" />
						<Skeleton className="h-7 w-24" />
						<Skeleton className="h-7 w-16" />
					</div>
				</div>
			</div>
			<div className="space-y-2">
				{Array.from({ length: 8 }, (_, index) => (
					<Skeleton key={index} className="h-12 w-full" />
				))}
			</div>
		</div>
	);
}
