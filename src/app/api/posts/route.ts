import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createPost, uploadMedia } from "@/lib/wordpress";
import { isAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const date = formData.get("date") as string;
        const mediaType = formData.get("mediaType") as string;
        const cloudinaryId = formData.get("cloudinaryId") as string;

        // Upload images to WordPress
        const images = formData.getAll("images") as File[];
        const uploadedImagesList = (await Promise.all(
            images
                .filter((image): image is File => image instanceof File && image.size > 0)
                .map(async (image) => {
                    const uploaded = await uploadMedia(image, title);
                    return uploaded ? { id: uploaded.id, url: uploaded.source_url } : null;
                })
        )).filter((image): image is { id: number; url: string } => image !== null);
        let featuredMediaId: number | undefined = undefined;

        let finalContent = content || "";

        if (uploadedImagesList.length > 0) {
            featuredMediaId = uploadedImagesList[0].id;

            // Append <img> tags so the frontend's gallery extraction picks them up
            const galleryHtml = uploadedImagesList.map(img =>
                `<img src="${img.url}" class="wp-image-${img.id}" />`
            ).join("\n");

            finalContent = `${finalContent}\n\n<!-- Gallery Automatic Append -->\n${galleryHtml}`;
        }

        // Prepare ACF data
        const acf = {
            media_type: mediaType,
            cloudinary_id: cloudinaryId,
            wp_image: featuredMediaId, // Required field: Map the first uploaded image
        };

        // Create Post in WordPress
        const newPost = await createPost({
            title,
            content: finalContent,
            date,
            status: 'publish',
            featured_media: featuredMediaId,
            acf: acf
        });

        // The gallery is served from a tagged cache; without this the new post
        // would stay invisible until the timed revalidate.
        revalidateTag("gallery", "max");

        return NextResponse.json({ success: true, post: newPost });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
