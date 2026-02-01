"use client";
import { motion } from "framer-motion";

export function Hero() {
    return (
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
            {/* Abstract Background Element */}
            <div className="absolute inset-0 z-0 opacity-30">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-rose-100 to-teal-100 blur-3xl dark:from-rose-900/20 dark:to-teal-900/20" />
            </div>

            <div className="z-10 text-center px-4">

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                    className="text-6xl md:text-8xl lg:text-9xl font-serif font-thin tracking-tighter text-foreground"
                >
                    Emma
                    <span className="block text-4xl md:text-6xl lg:text-7xl mt-2 text-foreground/80">Kobayashi</span>
                </motion.h1>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mt-8 flex justify-center gap-4"
                >
                    <div className="h-10 w-[1px] bg-border" />
                </motion.div>
            </div>
        </section>
    )
}
