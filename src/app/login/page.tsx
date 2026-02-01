"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [isPending, setIsPending] = useState(false); // Simulate pending state

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setError(""); // Clear previous errors

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password");

        // Simulate a network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        if (password === "0531") {
            document.cookie = "auth=true; path=/";
            router.push("/");
        } else {
            setError("ACCESS DENIED");
        }
        setIsPending(false);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] text-zinc-800">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-xs px-4"
            >
                <div className="mb-12 text-center">
                    <h1 className="text-sm font-medium tracking-[0.2em] text-zinc-400 uppercase">
                        Private Archive
                    </h1>
                    <div className="mt-4 text-xs text-zinc-300 font-serif italic">
                        For Family Only
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <input
                            type="password"
                            name="password"
                            placeholder="Enter Access Key"
                            required
                            className="w-full px-4 py-3 text-center bg-transparent border-b border-zinc-200 outline-none placeholder:text-zinc-300 focus:border-zinc-400 transition-colors font-serif text-lg tracking-widest"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-3 text-xs font-medium tracking-widest text-white bg-zinc-900 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                        {isPending ? "UNLOCKING..." : "ENTER"}
                    </button>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-xs text-red-400 font-medium tracking-wide mt-4"
                        >
                            {error}
                        </motion.p>
                    )}
                </form>
            </motion.div>
        </div>
    );
}
