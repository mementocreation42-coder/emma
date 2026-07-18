/**
 * The site's shared "liquid glass" backdrop: a solid tinted base with the
 * Hero's rose/teal/amber blooms on top. Fixed and non-interactive, meant to sit
 * behind translucent (bg-white/25 + backdrop-blur) surfaces. Used by both the
 * schedule and the CMS so they read as one product.
 */
export function AuroraBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/60 via-amber-50/40 to-teal-50/60 dark:from-rose-950/50 dark:via-neutral-950 dark:to-teal-950/50" />
            <div className="absolute -left-[15%] -top-[20%] h-[850px] w-[850px] rounded-full bg-rose-400/20 blur-3xl dark:bg-rose-900/30" />
            <div className="absolute -right-[15%] top-[10%] h-[800px] w-[800px] rounded-full bg-teal-400/[0.16] blur-3xl dark:bg-teal-900/30" />
            <div className="absolute -bottom-[25%] left-1/4 h-[650px] w-[750px] rounded-full bg-amber-400/[0.14] blur-3xl dark:bg-amber-900/25" />
        </div>
    );
}

/** Translucent panel that lets the aurora show through — the schedule's card look. */
export const GLASS_PANEL =
    "rounded-xl border border-white/60 bg-white/40 shadow-[0_2px_4px_rgba(0,0,0,0.05),0_16px_36px_-14px_rgba(0,0,0,0.24)] backdrop-blur-md dark:border-white/10 dark:bg-white/5";
