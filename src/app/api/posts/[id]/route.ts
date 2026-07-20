import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { updatePost, uploadMedia, deletePost } from "@/lib/wordpress";
import { isAuthenticated } from "@/lib/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const date = formData.get("date") as string;
        const mediaType = formData.get("mediaType") as string;
        const cloudinaryId = formData.get("cloudinaryId") as string;
        const existingWpImageId = formData.get("wp_image") as string;

        // Handle NEW images
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

        // Append NEW images to content
        if (uploadedImagesList.length > 0) {
            // The first new image overwrites the current featured image
            featuredMediaId = uploadedImagesList[0].id;

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
            date,
            acf,
        };

        if (featuredMediaId) {
            updateData.featured_media = featuredMediaId;
        }

        const updatedPost = await updatePost(parseInt(id), updateData);

        revalidateTag("gallery", "max");

        return NextResponse.json({ success: true, post: updatedPost });

    } catch (error: any) {
        console.error("API Update Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAuthenticated())) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        await deletePost(parseInt(id));
        revalidateTag("gallery", "max");
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("API Delete Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
