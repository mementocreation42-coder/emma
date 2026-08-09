"use client";
import { LazyMotion, m } from "framer-motion";
import { loadMotionFeatures } from "@/lib/motion";

export function Hero() {
    return (
        <LazyMotion features={loadMotionFeatures}>
        {/* Deliberately short of a full viewport: the first row of photographs
            should already be on screen when the site opens, so the gallery —
            not the title card — is what greets you. */}
        {/* A compromise height: the hero video is a 9:16 phone clip, so a short
            band crops it hard, but a full screen pushes the gallery off the
            fold. This keeps most of the frame and still shows the first photos. */}
        <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-background">
            <video
                className="absolute inset-0 z-[1] h-full w-full object-cover object-center opacity-50 motion-reduce:hidden"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
            >
                <source src="/hero.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 z-[1] bg-background/48" />
            {/* Abstract Background Element */}
            <div className="absolute inset-0 z-[2] opacity-20" style={{ transform: 'translateZ(0)' }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-rose-100 to-teal-100 blur-3xl dark:from-rose-900/20 dark:to-teal-900/20" />
            </div>

            {/* Fade the photograph into the gallery's paper-toned background. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-48 bg-gradient-to-b from-transparent to-background sm:h-64" />

            <div className="z-10 text-center px-4">

                <m.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                    className="text-6xl md:text-8xl lg:text-9xl font-serif font-normal tracking-tighter text-foreground"
                >
                    Emma
                    <span className="block text-4xl md:text-6xl lg:text-7xl mt-2 text-foreground/80">Kobayashi</span>
                </m.h1>
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mt-8 flex justify-center gap-4"
                >
                    <div className="h-10 w-[1px] bg-border" />
                </m.div>
            </div>
        </section>
        </LazyMotion>
    )
}
