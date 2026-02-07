import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReviewGrade } from "@/lib/scheduling/types";
import {
	defaultSimpleButtons,
	defaultSm2Buttons,
	type SimpleReviewResult,
} from "./review-buttons-config";
import { ReviewButtons } from "./review-buttons";

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
		onSelect: (result: SimpleReviewResult) => console.log("Selected:", result),
		disabled: false,
	},
};

export const SimpleModeDisabled: Story = {
	args: {
		mode: "simple",
		buttons: defaultSimpleButtons,
		onSelect: (result: SimpleReviewResult) => console.log("Selected:", result),
		disabled: true,
	},
};

// SM-2 mode stories
export const Sm2Mode: Story = {
	args: {
		mode: "sm2",
		buttons: defaultSm2Buttons,
		onSelect: (grade: ReviewGrade) => console.log("Selected:", grade),
		disabled: false,
	},
};

export const Sm2ModeDisabled: Story = {
	args: {
		mode: "sm2",
		buttons: defaultSm2Buttons,
		onSelect: (grade: ReviewGrade) => console.log("Selected:", grade),
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
			},
			{
				result: "remembered",
				label: "Yes",
				icon: "✓",
				subLabel: "Good job!",
			},
		],
		onSelect: (result: SimpleReviewResult) => console.log("Selected:", result),
		disabled: false,
	},
};

export const Sm2ModeWithCustomIntervals: Story = {
	args: {
		mode: "sm2",
		buttons: [
			{ grade: "again", label: "Again", subLabel: "1m", icon: "❌" },
			{ grade: "hard", label: "Hard", subLabel: "6h", icon: "🤔" },
			{ grade: "good", label: "Good", subLabel: "1d", icon: "🤭" },
			{ grade: "easy", label: "Easy", subLabel: "4d", icon: "👑" },
		],
		onSelect: (grade: ReviewGrade) => console.log("Selected:", grade),
		disabled: false,
	},
};
