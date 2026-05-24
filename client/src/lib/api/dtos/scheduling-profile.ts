import type { SchedulingProfile } from "../entities/scheduling-profile";

type SchedulingProfileOwnership = Required<
	Pick<SchedulingProfile, "account_user_id" | "profile_id" | "owner_user_id">
>;

export type SchedulingProfileInsert = Omit<
	SchedulingProfile,
	"id" | "account_user_id" | "profile_id" | "owner_user_id" | "created_at"
> &
	SchedulingProfileOwnership;
