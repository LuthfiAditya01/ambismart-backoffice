"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/api/authCollection";

const navigationItems = [
	{ href: "/", label: "Dashboard" },
	{ href: "/category", label: "Kategori" },
	{ href: "/class", label: "Kelas" },
];

export default function Sidebar({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error("Logout failed:", error);
		} finally {
			router.replace("/login");
		}
	};

	if (pathname === "/login") {
		return <>{children}</>;
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 lg:flex">
			<aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-slate-950/95 px-5 py-6 backdrop-blur lg:flex">
				<div className="mb-8 flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold tracking-tight text-white">
						AS
					</div>
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
							AmbiSmart
						</p>
						<p className="text-lg font-semibold text-white">Backoffice</p>
					</div>
				</div>

				<nav className="flex flex-1 flex-col gap-1">
					{navigationItems.map((item) => {
						const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

						return (
							<Link
								key={item.href}
								href={item.href}
								className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
									isActive
										? "bg-white/10 text-white"
										: "text-slate-400 hover:bg-white/5 hover:text-white"
								}`}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Session</p>
					<p className="mt-2 text-sm text-slate-200">Protected dashboard layout powered by auth verification.</p>
				</div>
			</aside>

			<div className="flex min-h-screen flex-1 flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
				<header className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
								AmbiSmart Backoffice
							</p>
							<h1 className="text-lg font-semibold text-slate-900 dark:text-white">Administrative Portal</h1>
						</div>

						<div className="flex items-center gap-3">
							<div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
								Authenticated view
							</div>
							<button
								onClick={handleLogout}
								className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
								aria-label="Logout"
							>
								Logout
							</button>
						</div>
					</div>
				</header>

				<main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
			</div>
		</div>
	);
}
