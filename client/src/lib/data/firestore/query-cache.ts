export type ProfileScope = {
	accountUserId: string;
	profileId: string;
};

type CacheRecord = {
	expiresAt: number;
	value: unknown;
};

const cache = new Map<string, CacheRecord>();

export function createProfileCacheKey(
	accountUserId: string,
	profileId: string,
	resource: string,
	qualifier = "all",
): string {
	return `${accountUserId}:${profileId}:${resource}:${qualifier}`;
}

export function getCachedQuery<T>(key: string): T | null {
	const cached = cache.get(key);
	if (!cached) return null;
	if (cached.expiresAt <= Date.now()) {
		cache.delete(key);
		return null;
	}
	return cached.value as T;
}

export function setCachedQuery<T>(key: string, value: T, ttlMs: number): void {
	cache.set(key, {
		expiresAt: Date.now() + ttlMs,
		value,
	});
}

export function clearQueryCache(scope?: ProfileScope): void {
	if (!scope) {
		cache.clear();
		return;
	}

	const prefix = `${scope.accountUserId}:${scope.profileId}:`;
	for (const key of cache.keys()) {
		if (key.startsWith(prefix)) {
			cache.delete(key);
		}
	}
}
