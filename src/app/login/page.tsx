"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { login } from "./actions";

// Submit Button Component to handle pending state
function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-3 text-xs font-medium tracking-widest text-white bg-zinc-900 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
            {pending ? "UNLOCKING..." : "ENTER"}
        </button>
    );
}

export default function LoginPage() {
    const [state, formAction] = useActionState(login, { error: "" });

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] text-zinc-800 overflow-hidden">
            {/* Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.08)_100%)]" />

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

                <form action={formAction} className="space-y-6">
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

                    <SubmitButton />

                    {state?.error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-xs text-red-400 font-medium tracking-wide mt-4"
                        >
                            {state.error}
                        </motion.p>
                    )}
                </form>
            </motion.div>
        </div>
    );
}
