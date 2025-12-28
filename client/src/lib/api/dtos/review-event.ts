import type { ReviewEvent } from "../entities/review-event";

export type ReviewEventInsert = Omit<ReviewEvent, "id" | "created_at">;
