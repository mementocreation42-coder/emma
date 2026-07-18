import crypto from "crypto";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

/**
 * Issues a signed-upload signature so the browser can upload videos
 * DIRECTLY to Cloudinary. Videos must not pass through our own API:
 * serverless functions cap request bodies at ~4.5MB.
 */
export async function POST() {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        return NextResponse.json(
            { error: "Cloudinary credentials not configured (CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)" },
            { status: 500 }
        );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "";

    // Params must be signed in alphabetical order, joined with '&', then sha1-ed with the secret
    const paramsToSign = folder
        ? `folder=${folder}&timestamp=${timestamp}`
        : `timestamp=${timestamp}`;
    const signature = crypto
        .createHash("sha1")
        .update(paramsToSign + apiSecret)
        .digest("hex");

    return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder });
}
