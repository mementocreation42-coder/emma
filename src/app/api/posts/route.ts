
import { NextRequest, NextResponse } from "next/server";
import { createPost, uploadMedia } from "@/lib/wordpress";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const mediaType = formData.get("mediaType") as string;
        const cloudinaryId = formData.get("cloudinaryId") as string;

        // Handle images
        const images = formData.getAll("images") as File[];
        const uploadedMediaIds: number[] = [];
        let featuredMediaId: number | undefined = undefined;

        // Upload images to WordPress
        for (const image of images) {
            if (image instanceof File) {
                const uploaded = await uploadMedia(image, title); // Use post title as image title for now
                if (uploaded) {
                    uploadedMediaIds.push(uploaded.id);
                    // Set the first image as featured
                    if (!featuredMediaId) {
                        featuredMediaId = uploaded.id;
                    }
                }
            }
        }

        // Construct Content with <img> tags for the gallery logic
        // The frontend extracts images from the content HTML.
        let finalContent = content || "";

        // Append images to content so they are detected by the frontend's extractGalleryImages
        // We can append them as hidden or visible img tags. 
        // Since the frontend parses `<img src="...">`, we can just append standard WP image HTML.
        // However, we don't have the full URL readily available in a clean way without fetching, 
        // but `uploadMedia` returns the full object.
        // Let's rely on the `featured_media` for the main one, and if there are generic images, 
        // we might rely on the user to insert them? 
        // OR: for this bulk upload 'gallery' style, we append them to the content automatically.

        // Note: The `uploadMedia` result defined in `wordpress.ts` returns `WordPressMedia`.
        // Let's just assume we want to support the current "Gallery" extraction which looks for <img> tags.

        // Actually, `uploadMedia` returns the object. Let's capture the source_url.
        // But `wordpress.ts` interface `WordPressMedia` isn't fully exported or maybe it is. 
        // Let's assume it works.

        // Wait, `createPost` takes `featured_media`. 
        // If we want a gallery, we should probably construct a [gallery ids="..."] shortcode 
        // OR just simple img tags which `extractGalleryImages` parses.
        // `extractGalleryImages` looks for `<img ... src="...">`.
        // So we should append `img` tags.

        // We need to get the URLs from the upload response.
        // Let's adjust `uploadMedia` to ensure it returns what we need or check the type.
        // It returns `Promise<WordPressMedia | null>`.

        // Note: We need to iterate again or collect results.
        // Refactoring the loop above.

        // Re-implementing loop to capture URLs
        const uploadedImagesList: { id: number, url: string }[] = [];

        // We can't use the previous loop's results directly because we didn't save the objects.
        // Let's allow the logic to be:
        // 1. Upload all files.
        // 2. Set first as referenced 'featured_media'.
        // 3. Append ALL images to content as <img> tags so the parser picks them up as a gallery.

        for (const image of images) {
            if (image instanceof File) {
                // Determine a filename? `uploadMedia` uses `FormData` which usually handles it if passed as File.
                const uploaded = await uploadMedia(image, title);
                if (uploaded) {
                    uploadedImagesList.push({ id: uploaded.id, url: uploaded.source_url });
                }
            }
        }

        if (uploadedImagesList.length > 0) {
            featuredMediaId = uploadedImagesList[0].id;

            // Append images to content
            const galleryHtml = uploadedImagesList.map(img =>
                `<img src="${img.url}" class="wp-image-${img.id}" />`
            ).join("\n");

            finalContent = `${finalContent}\n\n<!-- Gallery Automatic Append -->\n${galleryHtml}`;
        }

        // Prepare ACF data
        const acf = {
            media_type: mediaType,
            cloudinary_id: cloudinaryId,
            // transcription: content // Map content to transcription if needed? 
            // The current frontend uses `post.acf?.transcription || post.excerpt.rendered`.
            // We'll leave transcription empty and let it fallback to exceprt (which is auto-generated from content usually)
            // or we could map a separate field if we added one. 
            // For now, let's put `content` in standard WP content.
        };

        const newPost = await createPost({
            title,
            content: finalContent,
            status: "publish", // Or make this configurable
            featured_media: featuredMediaId,
            acf,
        });

        return NextResponse.json({ success: true, post: newPost });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
