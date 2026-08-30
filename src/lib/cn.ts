// src/lib/cn.ts

/** Join class names, dropping anything falsy so conditionals read inline. */
export function cn(...parts: (string | false | null | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}
