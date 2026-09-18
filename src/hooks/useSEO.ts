import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://panelrift.eu.cc';
const DEFAULT_TITLE = 'Panelrift — Read Manhwa';
const DEFAULT_DESCRIPTION =
	'Browse and read manhwa: daily, weekly and monthly rankings, full-text search and a vertical webtoon reader.';
const DEFAULT_IMAGE = `${BASE_URL}/icons/android-icon-192x192.png`;

export interface SEOProps {
	title?: string;
	description?: string;
	image?: string | null;
	canonicalUrl?: string;
	type?: 'website' | 'article' | 'book';
	jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Lightweight, zero-dependency hook that dynamically manages <title>,
 * <meta>, canonical <link>, and JSON-LD structured data for SPAs.
 */
export function useSEO({
	title,
	description,
	image,
	canonicalUrl,
	type = 'website',
	jsonLd,
}: SEOProps = {}) {
	const location = useLocation();

	useEffect(() => {
		// 1. Page Title
		const finalTitle = title ? `${title} | Panelrift` : DEFAULT_TITLE;
		document.title = finalTitle;

		// Helper to find or create meta tag
		function setMeta(attribute: 'name' | 'property', attrValue: string, content: string) {
			let element = document.querySelector(
				`meta[${attribute}="${attrValue}"]`,
			) as HTMLMetaElement | null;
			if (!element) {
				element = document.createElement('meta');
				element.setAttribute(attribute, attrValue);
				document.head.appendChild(element);
			}
			element.content = content;
		}

		// 2. Meta Description
		const finalDescription = description || DEFAULT_DESCRIPTION;
		setMeta('name', 'description', finalDescription);
		setMeta('property', 'og:description', finalDescription);
		setMeta('property', 'twitter:description', finalDescription);

		// 3. Open Graph & Twitter Titles
		setMeta('property', 'og:title', finalTitle);
		setMeta('property', 'twitter:title', finalTitle);

		// 4. Type & Images
		setMeta('property', 'og:type', type);
		setMeta('property', 'twitter:card', 'summary_large_image');
		const finalImage = image || DEFAULT_IMAGE;
		setMeta('property', 'og:image', finalImage);
		setMeta('property', 'twitter:image', finalImage);

		// 5. Canonical Link & URL
		const finalUrl = canonicalUrl || `${BASE_URL}${location.pathname}`;
		setMeta('property', 'og:url', finalUrl);
		setMeta('property', 'twitter:url', finalUrl);

		let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
		if (!canonicalLink) {
			canonicalLink = document.createElement('link');
			canonicalLink.rel = 'canonical';
			document.head.appendChild(canonicalLink);
		}
		canonicalLink.href = finalUrl;

		// 6. JSON-LD Structured Data
		let scriptTag: HTMLScriptElement | null = document.querySelector(
			'script[data-seo-jsonld="true"]',
		);
		if (jsonLd) {
			if (!scriptTag) {
				scriptTag = document.createElement('script');
				scriptTag.type = 'application/ld+json';
				scriptTag.setAttribute('data-seo-jsonld', 'true');
				document.head.appendChild(scriptTag);
			}
			scriptTag.textContent = JSON.stringify(jsonLd);
		} else if (scriptTag) {
			scriptTag.remove();
		}

		return () => {
			// Cleanup JSON-LD on route leave
			const existingScript = document.querySelector('script[data-seo-jsonld="true"]');
			if (existingScript) {
				existingScript.remove();
			}
		};
	}, [title, description, image, canonicalUrl, type, jsonLd, location.pathname]);
}
