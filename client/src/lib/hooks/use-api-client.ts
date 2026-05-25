import { useMemo } from "react";
import type { ApiClient } from "@/lib/api/client";
import { createApiClient } from "@/lib/api/client";

/**
 * @deprecated Use feature repositories under `@/lib/data/repositories/*` instead.
 * This hook remains only for legacy call sites during migration.
 */
export function useApiClient(): ApiClient {
	return useMemo(() => createApiClient(), []);
}
