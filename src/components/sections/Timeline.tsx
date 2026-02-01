"use client";

import { motion } from "framer-motion";

const milestones = [
    { date: "2023.04.15", title: "Born", description: "Welcome to the world, Emma." },
    { date: "2023.10.15", title: "Half Birthday", description: "6 months of joy." },
    { date: "2024.04.15", title: "1st Birthday", description: "Celebrating her first year." },
    { date: "2024.05.20", title: "First Steps", description: "Took her first steps today!" },
];

export function Timeline() {
    return (
        <section className="py-24 px-4 bg-background">
            <div className="container mx-auto max-w-3xl">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-16 text-center text-3xl font-serif font-light tracking-wide md:text-4xl"
                >
                    Milestones
                </motion.h2>

                <div className="relative border-l border-border ml-4 md:ml-0 md:pl-0 space-y-12">
                    {milestones.map((milestone, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="relative pl-8 md:pl-0 md:grid md:grid-cols-[120px_1fr] md:gap-8 items-baseline"
                        >
                            <div className="absolute top-1 -left-[5px] w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background md:hidden" />

                            <div className="hidden md:block text-right text-sm text-muted-foreground font-medium">
                                {milestone.date}
                            </div>

                            <div>
                                <div className="md:hidden text-sm text-muted-foreground font-medium mb-1">
                                    {milestone.date}
                                </div>
                                <h3 className="text-xl font-serif font-medium text-foreground">{milestone.title}</h3>
                                <p className="mt-2 text-muted-foreground leading-relaxed">
                                    {milestone.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
