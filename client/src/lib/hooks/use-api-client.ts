import { useMemo } from "react";
import type { ApiClient } from "@/lib/api/client";
import { createApiClient } from "@/lib/api/client";

export function useApiClient(): ApiClient {
	return useMemo(() => createApiClient(), []);
}
