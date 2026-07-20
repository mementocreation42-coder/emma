import { SiteNav } from "@/components/layout/SiteNav";

/**
 * Root loading boundary — in practice this is the Gallery ("/") skeleton,
 * since /schedule ships its own. Without it, tapping "Gallery" froze on the
 * previous page until the WordPress fetch finished server-side.
 */
export default function RootLoading() {
    const tileRatios = [1.35, 0.75, 1.0, 1.2, 0.8, 1.05, 0.7, 1.3, 0.9];

    return (
        <div className="relative flex min-h-screen flex-col font-sans">
            <SiteNav />
            <main className="flex-1">
                {/* Hero placeholder: same soft wash the real hero fades in over. */}
                <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-background">
                    <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-rose-100 to-teal-100 opacity-20 blur-3xl dark:from-rose-900/20 dark:to-teal-900/20" />
                    <div className="z-10 space-y-4 text-center">
                        <div className="mx-auto h-16 w-56 animate-pulse rounded bg-foreground/5 md:h-24 md:w-80" />
                        <div className="mx-auto h-8 w-40 animate-pulse rounded bg-foreground/5 md:h-12 md:w-56" />
                    </div>
                </section>

                <section className="px-4 py-12 md:py-24">
                    <div className="container mx-auto">
                        <div className="mb-6 h-11 animate-pulse rounded-2xl bg-white/45 dark:bg-white/5" />
                        <div className="columns-3 gap-2 space-y-2 sm:columns-2 sm:gap-4 sm:space-y-4 lg:columns-3 xl:columns-4">
                            {tileRatios.map((ratio, i) => (
                                <div
                                    key={i}
                                    className="animate-pulse break-inside-avoid rounded-lg bg-gray-100 dark:bg-zinc-800"
                                    style={{ paddingBottom: `${ratio * 100}%` }}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
