import { useCallback, useEffect, useState } from "react";

import {
	DEFAULT_CARD_PACK_TYPE,
	resolveCardPackType,
	type CardPackType,
} from "@/lib/api/entities/card-pack";

const SYSTEM_PREFERENCES_STORAGE_KEY = "card-master.preferences.system.v1";
const SYSTEM_PREFERENCES_EVENT = "card-master:system-preferences-updated";

export type SystemPreferences = {
	enableMultiPackTypes: boolean;
	defaultCardPackType: CardPackType;
};

const DEFAULT_SYSTEM_PREFERENCES: SystemPreferences = {
	enableMultiPackTypes: false,
	defaultCardPackType: DEFAULT_CARD_PACK_TYPE,
};

function isCardPackType(value: unknown): value is CardPackType {
	return value === "basic" || value === "image-recall" || value === "pinyin-hanzi";
}

function normalizeSystemPreferences(value: unknown): SystemPreferences {
	if (!value || typeof value !== "object") {
		return DEFAULT_SYSTEM_PREFERENCES;
	}
	const record = value as Record<string, unknown>;
	return {
		enableMultiPackTypes: Boolean(record.enableMultiPackTypes),
		defaultCardPackType: isCardPackType(record.defaultCardPackType)
			? record.defaultCardPackType
			: DEFAULT_SYSTEM_PREFERENCES.defaultCardPackType,
	};
}

export function getSystemPreferences(): SystemPreferences {
	if (typeof window === "undefined") {
		return DEFAULT_SYSTEM_PREFERENCES;
	}
	const raw = window.localStorage.getItem(SYSTEM_PREFERENCES_STORAGE_KEY);
	if (!raw) return DEFAULT_SYSTEM_PREFERENCES;

	try {
		const parsed = JSON.parse(raw) as unknown;
		return normalizeSystemPreferences(parsed);
	} catch {
		return DEFAULT_SYSTEM_PREFERENCES;
	}
}

export function saveSystemPreferences(
	updates: Partial<SystemPreferences>,
): SystemPreferences {
	const previous = getSystemPreferences();
	const next: SystemPreferences = {
		enableMultiPackTypes:
			typeof updates.enableMultiPackTypes === "boolean"
				? updates.enableMultiPackTypes
				: previous.enableMultiPackTypes,
		defaultCardPackType: resolveCardPackType(
			updates.defaultCardPackType ?? previous.defaultCardPackType,
		),
	};

	if (typeof window !== "undefined") {
		window.localStorage.setItem(
			SYSTEM_PREFERENCES_STORAGE_KEY,
			JSON.stringify(next),
		);
		window.dispatchEvent(new Event(SYSTEM_PREFERENCES_EVENT));
	}
	return next;
}

export function useSystemPreferences() {
	const [preferences, setPreferences] = useState<SystemPreferences>(() =>
		getSystemPreferences(),
	);

	useEffect(() => {
		const syncFromStorage = () => {
			setPreferences(getSystemPreferences());
		};
		window.addEventListener("storage", syncFromStorage);
		window.addEventListener(SYSTEM_PREFERENCES_EVENT, syncFromStorage);
		return () => {
			window.removeEventListener("storage", syncFromStorage);
			window.removeEventListener(SYSTEM_PREFERENCES_EVENT, syncFromStorage);
		};
	}, []);

	const updatePreferences = useCallback(
		(updates: Partial<SystemPreferences>) => {
			const next = saveSystemPreferences(updates);
			setPreferences(next);
		},
		[],
	);

	return {
		preferences,
		updatePreferences,
	};
}
