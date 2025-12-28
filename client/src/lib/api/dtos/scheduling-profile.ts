import type { SchedulingProfile } from "../entities/scheduling-profile";

export type SchedulingProfileInsert = Omit<
	SchedulingProfile,
	"id" | "created_at"
>;
