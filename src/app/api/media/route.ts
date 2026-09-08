import { NextRequest, NextResponse } from "next/server";
import { uploadMedia } from "@/lib/wordpress";
import { isAuthenticated } from "@/lib/auth";

/**
 * Uploads ONE image to the WordPress media library and returns its id/url.
 * The editor calls this once per photo so a post can carry any number of
 * images: sending them all inside /api/posts would hit the serverless
 * request-body cap (~4.5MB) after a dozen or so photos.
 */
export async function POST(request: NextRequest) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const title = (formData.get("title") as string) || "";

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
        }

        const uploaded = await uploadMedia(file, title);
        if (!uploaded) {
            return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: uploaded.id, url: uploaded.source_url });
    } catch (error) {
        console.error("API Media Upload Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
