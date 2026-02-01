"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(prevState: any, formData: FormData) {
    const password = formData.get("password");

    if (password === "0531") {
        const cookieStore = await cookies();
        cookieStore.set("auth", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
        });
        redirect("/");
    } else {
        return { error: "Incorrect password" };
    }
}
