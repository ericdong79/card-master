import type { Meta, StoryObj } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import { PackCardsHeader } from "./pack-cards-header";

const meta = {
	title: "Features/Cards/PackCardsHeader",
	component: PackCardsHeader,
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<BrowserRouter>
				<Story />
			</BrowserRouter>
		),
	],
	tags: ["autodocs"],
} satisfies Meta<typeof PackCardsHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		cardPackId: "pack-1",
		packName: "JavaScript Basics",
		onCreateClick: () => console.log("Create clicked"),
	},
};

export const Loading: Story = {
	args: {
		cardPackId: "pack-1",
		packName: undefined,
		onCreateClick: () => console.log("Create clicked"),
	},
};

export const LongPackName: Story = {
	args: {
		cardPackId: "pack-1",
		packName:
			"Advanced JavaScript Concepts and Design Patterns for Modern Web Development",
		onCreateClick: () => console.log("Create clicked"),
	},
};
