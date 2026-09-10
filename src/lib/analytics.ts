declare global {
	interface Window {
		gtag: (...args: any[]) => void;
	}
}

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
