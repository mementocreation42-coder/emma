"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
    { href: "/admin/post", label: "New Post" },
    { href: "/", label: "Gallery" },
    { href: "/schedule", label: "Schedule" },
];

/**
 * Deliberately not in the root layout: /login must stay bare, and the nav is
 * only meaningful once past it.
 */
export function SiteNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/60 bg-white/45 p-1.5 font-serif text-[10px] uppercase tracking-[0.14em] shadow-[0_8px_28px_-12px_rgba(0,0,0,0.32)] backdrop-blur-md sm:bottom-8 sm:gap-2 sm:p-2 sm:text-[11px] dark:border-white/10 dark:bg-neutral-900/50">
            {LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            "rounded-full px-2.5 py-1.5 transition-all hover:bg-white/45 hover:text-foreground sm:px-3",
                            isActive
                                ? "bg-violet-300/75 text-violet-950 shadow-sm dark:bg-violet-400/35 dark:text-violet-50"
                                : "text-muted-foreground/80"
                        )}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
