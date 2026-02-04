import type { Meta, StoryObj } from "@storybook/react";
import { ReviewButtons, defaultSimpleButtons, defaultSm2Buttons } from "./review-buttons";

const meta = {
	title: "Features/Review/ReviewButtons",
	component: ReviewButtons,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ReviewButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

// Simple mode stories
export const SimpleMode: Story = {
	args: {
		mode: "simple",
		buttons: defaultSimpleButtons,
		onSelect: (result) => console.log("Selected:", result),
		disabled: false,
	},
};

export const SimpleModeDisabled: Story = {
	args: {
		mode: "simple",
		buttons: defaultSimpleButtons,
		onSelect: (result) => console.log("Selected:", result),
		disabled: true,
	},
};

// SM-2 mode stories
export const Sm2Mode: Story = {
	args: {
		mode: "sm2",
		buttons: defaultSm2Buttons,
		onSelect: (grade) => console.log("Selected:", grade),
		disabled: false,
	},
};

export const Sm2ModeDisabled: Story = {
	args: {
		mode: "sm2",
		buttons: defaultSm2Buttons,
		onSelect: (grade) => console.log("Selected:", grade),
		disabled: true,
	},
};

// Custom button configurations
export const SimpleModeCustom: Story = {
	args: {
		mode: "simple",
		buttons: [
			{
				result: "forgot",
				label: "No",
				icon: "❌",
				subLabel: "Try again",
				className: "border-orange-200 hover:bg-orange-50 hover:text-orange-700",
			},
			{
				result: "remembered",
				label: "Yes",
				icon: "✓",
				subLabel: "Good job!",
				className: "bg-blue-600 hover:bg-blue-700 text-white",
			},
		],
		onSelect: (result) => console.log("Selected:", result),
		disabled: false,
	},
};

export const Sm2ModeWithCustomIntervals: Story = {
	args: {
		mode: "sm2",
		buttons: [
			{ grade: "again", label: "Again", variant: "destructive", subLabel: "1m" },
			{ grade: "hard", label: "Hard", variant: "secondary", subLabel: "6h" },
			{ grade: "good", label: "Good", variant: "default", subLabel: "1d" },
			{ grade: "easy", label: "Easy", variant: "outline", subLabel: "4d" },
		],
		onSelect: (grade) => console.log("Selected:", grade),
		disabled: false,
	},
};
