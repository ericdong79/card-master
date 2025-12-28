import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Card as CardEntity } from "@/lib/api/entities/card";

type CardFormDialogProps = {
	mode: "create" | "edit";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { prompt: string; answer: string }) => Promise<void>;
	card?: CardEntity | null;
};

export function CardFormDialog({ mode, open, onOpenChange, onSubmit, card }: CardFormDialogProps) {
	const [prompt, setPrompt] = useState("");
	const [answer, setAnswer] = useState("");
	const [pending, setPending] = useState(false);

	useEffect(() => {
		if (open) {
			setPrompt(card?.prompt ?? "");
			setAnswer(card?.answer ?? "");
		}
	}, [open, card]);

	const handleSubmit = async () => {
		setPending(true);
		try {
			await onSubmit({ prompt: prompt.trim(), answer: answer.trim() });
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="space-y-4">
				<DialogHeader>
					<DialogTitle>{mode === "create" ? "Create card" : "Edit card"}</DialogTitle>
					<DialogDescription>
						{mode === "create" ? "Add a new prompt and answer." : "Update this card."}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div className="space-y-2">
						<Label htmlFor="card-prompt">Prompt</Label>
						<Input
							id="card-prompt"
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder="E.g. What is spaced repetition?"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="card-answer">Answer</Label>
						<Textarea
							id="card-answer"
							value={answer}
							onChange={(e) => setAnswer(e.target.value)}
							placeholder="Your answer..."
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={pending || !prompt.trim()}>
						{pending ? (
							<>
								<Spinner size="sm" className="text-primary-foreground" />
								{mode === "create" ? "Creating..." : "Saving..."}
							</>
						) : mode === "create" ? (
							"Create"
						) : (
							"Save"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
