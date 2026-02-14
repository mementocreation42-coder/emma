
import { NextRequest, NextResponse } from "next/server";
import { updatePost, uploadMedia } from "@/lib/wordpress";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const mediaType = formData.get("mediaType") as string;
        const cloudinaryId = formData.get("cloudinaryId") as string;
        const existingWpImageId = formData.get("wp_image") as string;

        // Handle NEW images
        const images = formData.getAll("images") as File[];
        const uploadedImagesList: { id: number, url: string }[] = [];
        let featuredMediaId: number | undefined = undefined;

        for (const image of images) {
            if (image instanceof File) {
                // Skip if it's not a real file (e.g. empty)
                if (image.size === 0) continue;

                const uploaded = await uploadMedia(image, title);
                if (uploaded) {
                    uploadedImagesList.push({ id: uploaded.id, url: uploaded.source_url });
                }
            }
        }

        let finalContent = content || "";

        // Append NEW images to content
        if (uploadedImagesList.length > 0) {
            // If there's no featured media set on the post yet, maybe we should set it?
            // For updates, we might default to NOT changing featured media unless explicitly asked,
            // OR if it's the first image added to a post that had none.
            // For simplicity, let's just use the first new image as a candidate for featured media
            // BUT only if we want to overwrite. 
            // Let's decided: New images are appended to content. 
            // Featured Media logic: passing `featured_media` updates it. 
            // Maybe we only update it if we have new images and want to?
            // Let's set it if we have new images.
            featuredMediaId = uploadedImagesList[0].id; // This will overwrite current featured image

            const galleryHtml = uploadedImagesList.map(img =>
                `<img src="${img.url}" class="wp-image-${img.id}" />`
            ).join("\n");

            finalContent = `${finalContent}\n\n<!-- Gallery Automatic Append -->\n${galleryHtml}`;
        }

        // Prepare ACF data
        const acf: any = {
            media_type: mediaType,
            cloudinary_id: cloudinaryId,
        };

        if (featuredMediaId) {
            acf.wp_image = featuredMediaId;
        } else if (existingWpImageId) {
            // Keep existing image if no new one is uploaded
            acf.wp_image = parseInt(existingWpImageId);
        }

        const updateData: any = {
            title,
            content: finalContent,
            acf,
        };

        if (featuredMediaId) {
            updateData.featured_media = featuredMediaId;
        }

        const updatedPost = await updatePost(parseInt(id), updateData);

        return NextResponse.json({ success: true, post: updatedPost });

    } catch (error: any) {
        console.error("API Update Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { deletePost } from "@/lib/wordpress";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await deletePost(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("API Delete Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
