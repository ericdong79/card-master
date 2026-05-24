import { useState } from "react";
import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/use-auth";
import logoImage from "@/assets/logo/logo.png";

export function LoginPage() {
	const { t } = useTranslation();
	const { error: authError, signIn } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSignIn = async () => {
		setLoading(true);
		setError(null);

		try {
			await signIn();
		} catch (signInError) {
			console.error("Google sign-in failed", signInError);
			setError(t("auth.login.failed"));
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-dvh items-center justify-center bg-muted/20 p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<img
						src={logoImage}
						alt={t("brand.name")}
						className="mb-2 size-14 rounded-md object-contain"
					/>
					<CardTitle className="text-2xl">{t("auth.login.title")}</CardTitle>
					<CardDescription>{t("auth.login.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button
						type="button"
						className="w-full"
						onClick={handleSignIn}
						disabled={loading}
					>
						{loading ? <Spinner size="sm" /> : <LogIn className="size-4" />}
						{t("auth.login.google")}
					</Button>
					{error ? (
						<p className="text-center text-sm text-destructive">{error}</p>
					) : null}
					{authError ? (
						<p className="text-center text-sm text-destructive">
							{t("auth.unavailable")}
						</p>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
