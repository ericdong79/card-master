import type { Meta, StoryObj } from "@storybook/react-vite";
import { PackCardsLoading } from "./pack-cards-loading";

const meta = {
	title: "Features/Cards/PackCardsLoading",
	component: PackCardsLoading,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof PackCardsLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};
