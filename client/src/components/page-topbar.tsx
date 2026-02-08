import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type BreadcrumbItem = {
	label: string;
	to?: string;
};

type PageTopBarProps = {
	title: string;
	subtitle?: string;
	breadcrumbs?: BreadcrumbItem[];
	actions?: ReactNode;
};

export function PageTopBar({
	title,
	subtitle,
	breadcrumbs = [],
	actions,
}: PageTopBarProps) {
	return (
		<header className="border-b bg-background/85 backdrop-blur">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1">
					{breadcrumbs.length > 0 ? (
						<nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							{breadcrumbs.map((item, index) => (
								<div key={`${item.label}-${index}`} className="flex items-center gap-2">
									{index > 0 ? <span>/</span> : null}
									{item.to ? (
										<Link to={item.to} className="underline-offset-4 hover:underline">
											{item.label}
										</Link>
									) : (
										<span className="text-foreground">{item.label}</span>
									)}
								</div>
							))}
						</nav>
					) : null}
					<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
					{subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
				</div>
				{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
			</div>
		</header>
	);
}
