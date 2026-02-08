function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex: string): string | null {
	const value = hex.trim();
	const shortHex = /^#([0-9a-fA-F]{3})$/;
	const longHex = /^#([0-9a-fA-F]{6})$/;

	if (shortHex.test(value)) {
		const digits = value.slice(1);
		return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`.toLowerCase();
	}
	if (longHex.test(value)) {
		return value.toLowerCase();
	}
	return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const normalized = normalizeHex(hex);
	if (!normalized) return null;
	const value = normalized.slice(1);
	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	return { r, g, b };
}

function toLinearSrgb(channel: number) {
	const normalized = clamp(channel / 255, 0, 1);
	if (normalized <= 0.03928) return normalized / 12.92;
	return ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminanceFromRgb(rgb: { r: number; g: number; b: number }) {
	const r = toLinearSrgb(rgb.r);
	const g = toLinearSrgb(rgb.g);
	const b = toLinearSrgb(rgb.b);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getReadableForegroundColor(backgroundHex: string) {
	const rgb = hexToRgb(backgroundHex);
	if (!rgb) return "#f8f8f8";
	const luminance = luminanceFromRgb(rgb);
	return luminance > 0.45 ? "#111111" : "#f8f8f8";
}

export function isValidHexColor(value: string | null | undefined): value is string {
	if (!value) return false;
	return normalizeHex(value) !== null;
}
