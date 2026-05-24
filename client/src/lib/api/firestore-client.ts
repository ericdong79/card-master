import type { ApiClient } from "./client";
import { createIndexedDbApiClient } from "./indexeddb-client";

export function createFirestoreApiClient(): ApiClient {
	return createIndexedDbApiClient();
}
