import type { Meta, StoryObj } from "@storybook/react-vite";
import { PackCardsError } from "./pack-cards-error";

const meta = {
	title: "Features/Cards/PackCardsError",
	component: PackCardsError,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof PackCardsError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		message: "Card pack not found or inaccessible.",
	},
};

export const NetworkError: Story = {
	args: {
		message:
			"Failed to connect to the server. Please check your internet connection.",
	},
};

export const LongError: Story = {
	args: {
		message:
			"An unexpected error occurred while trying to fetch the card pack data. This might be due to a network issue, server maintenance, or insufficient permissions to access this resource.",
	},
};
