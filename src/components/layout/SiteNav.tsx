"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type TouchEvent, useEffect, useRef, useState } from "react";
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
    const router = useRouter();
    const touchStartX = useRef<number | null>(null);
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);

    // Highlight the tapped tab immediately instead of waiting for the route
    // change to commit — on dynamic pages that wait made every tap feel laggy.
    // (adjust-during-render, same pattern as MediaModal's index reset)
    const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
    const [prevPathname, setPrevPathname] = useState(pathname);
    if (pathname !== prevPathname) {
        setPrevPathname(pathname);
        setOptimisticHref(null);
    }
    const activeHref = optimisticHref ?? pathname;
    const activeIndex = LINKS.findIndex((link) => link.href === activeHref);

    useEffect(() => {
        const handleModalChange = (event: Event) => {
            setGalleryModalOpen(Boolean((event as CustomEvent<boolean>).detail));
        };
        window.addEventListener("gallery-modal-change", handleModalChange);
        return () => window.removeEventListener("gallery-modal-change", handleModalChange);
    }, []);

    function handleTouchStart(event: TouchEvent<HTMLElement>) {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    }

    function handleTouchEnd(event: TouchEvent<HTMLElement>) {
        const startX = touchStartX.current;
        touchStartX.current = null;
        const endX = event.changedTouches[0]?.clientX;
        if (startX === null || endX === undefined || Math.abs(endX - startX) < 42) return;

        // The selection follows the finger: swiping right moves to the tab on
        // the right in the row, swiping left to the one on the left. Touch
        // events only run on phones, while the links remain available everywhere.
        const nextIndex = activeIndex + (endX < startX ? -1 : 1);
        const nextLink = LINKS[nextIndex];
        if (nextLink) {
            setOptimisticHref(nextLink.href);
            router.push(nextLink.href);
        }
    }

    return (
        <nav
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={cn(
                "fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 touch-pan-y items-center gap-1 rounded-full border border-white/60 bg-white/45 p-1.5 text-[10px] uppercase tracking-[0.14em] shadow-[0_8px_28px_-12px_rgba(0,0,0,0.32)] backdrop-blur-md transition-[opacity,translate] duration-200 sm:bottom-8 sm:gap-2 sm:p-2 sm:text-[11px] dark:border-white/10 dark:bg-neutral-900/50",
                galleryModalOpen && "pointer-events-none translate-y-16 opacity-0"
            )}
        >
            {LINKS.map((link) => {
                const isActive = activeHref === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOptimisticHref(link.href)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            "whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-violet-200/70 hover:text-violet-950 sm:px-3 dark:hover:bg-violet-400/30 dark:hover:text-violet-50",
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
