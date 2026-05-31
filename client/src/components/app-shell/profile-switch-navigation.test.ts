import { describe, expect, it } from "vitest";

import { getProfileSwitchRedirectPath } from "./profile-switch-navigation";

describe("getProfileSwitchRedirectPath", () => {
	it("returns home for card-pack scoped routes", () => {
		expect(getProfileSwitchRedirectPath("/pack/pack-1/cards")).toBe("/");
		expect(getProfileSwitchRedirectPath("/pack/pack-1/review")).toBe("/");
		expect(getProfileSwitchRedirectPath("/pack/pack-1/quick-review")).toBe("/");
	});

	it("does not redirect global routes", () => {
		expect(getProfileSwitchRedirectPath("/")).toBeNull();
		expect(getProfileSwitchRedirectPath("/review")).toBeNull();
		expect(getProfileSwitchRedirectPath("/quick-start")).toBeNull();
		expect(getProfileSwitchRedirectPath("/preferences")).toBeNull();
	});
});
