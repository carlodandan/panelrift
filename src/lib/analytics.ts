declare global {
	interface Window {
		/** Google Tag Manager / Google Analytics 4 command queue. */
		gtag: (...args: any[]) => void;
	}
}

/**
 * Dispatches a custom interaction event to Google Analytics 4 via `window.gtag`.
 * Includes `'event_category': 'engagement'` by default and logs to console in development.
 *
 * @param eventName - The unique event identifier (e.g. `'open_browse'`, `'add_to_library'`).
 * @param eventParams - Optional key-value parameters passed alongside the event.
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
	if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
		const params = {
			event_category: 'engagement',
			...eventParams,
		};
		console.log(`[Analytics] Sending event: ${eventName}`, params);
		window.gtag('event', eventName, params);
	}
}
