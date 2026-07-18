import { MediaItem } from "@/types/media";
import { WordPressPost } from "./types";

/**
 * Extract images from WordPress post content (gallery blocks, image blocks)
 */
function extractGalleryImages(content: string): Array<{ src: string; aspectRatio: number }> {
    const images: Array<{ src: string; aspectRatio: number }> = [];

    // 1. Match all img tags first
    const imgTagRegex = /<img[^>]+>/gi;
    const imgTags = content.match(imgTagRegex) || [];

    imgTags.forEach(tag => {
        // 2. Extract attributes individually from each tag
        const srcMatch = /src=["']([^"']+)["']/i.exec(tag);
        const widthMatch = /width=["'](\d+)["']/i.exec(tag);
        const heightMatch = /height=["'](\d+)["']/i.exec(tag);

        if (srcMatch) {
            const src = srcMatch[1];

            // Skip if it's an emoji or icon
            if (src.includes("emoji") || src.includes("icon")) return;

            const width = widthMatch ? parseInt(widthMatch[1]) : 16;
            const height = heightMatch ? parseInt(heightMatch[1]) : 9;

            images.push({
                src,
                aspectRatio: width / height,
            });
        }
    });

    return images;
}

/**
 * Determine if content contains video
 */
function extractVideoFromContent(content: string): string | null {
    // Match video URLs (mp4, webm, etc.)
    const videoRegex = /<video[^>]+src="([^"]+)"/i;
    const match = videoRegex.exec(content);
    return match ? match[1] : null;
}

/**
 * Convert WordPress posts to MediaItem format
 */
export function convertToMediaItems(posts: WordPressPost[]): MediaItem[] {
    return posts.map((post) => {
        const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
        const galleryImages = extractGalleryImages(post.content.rendered);
        const videoSrc = extractVideoFromContent(post.content.rendered);

        // Check for Cloudinary video from ACF
        const cloudinaryId = post.acf?.cloudinary_id;
        const acfMediaType = post.acf?.media_type;

        // Determine media type (Cloudinary video takes priority)
        const isVideo = !!cloudinaryId || acfMediaType === 'video' || videoSrc !== null || featuredMedia?.mime_type?.startsWith("video/");
        const type: "image" | "video" = isVideo ? "video" : "image";

        // Get the main image/video source
        let src = "";
        let thumbSrc: string | undefined;
        let aspectRatio = 16 / 9; // Default aspect ratio

        // Priority 1: Cloudinary ID (for videos)
        if (cloudinaryId) {
            src = cloudinaryId; // Cloudinary component will handle the full URL
        }
        // Priority 2: Featured Media
        else if (featuredMedia) {
            src = featuredMedia.source_url;
            // Use a pre-scaled WP size for grid thumbnails instead of the full original
            const sizes = featuredMedia.media_details?.sizes;
            thumbSrc = sizes?.large?.source_url || sizes?.medium?.source_url;
            if (featuredMedia.media_details?.width && featuredMedia.media_details?.height) {
                aspectRatio = featuredMedia.media_details.width / featuredMedia.media_details.height;
            }
        }
        // Priority 3: Gallery Images
        else if (galleryImages.length > 0) {
            src = galleryImages[0].src;
            aspectRatio = galleryImages[0].aspectRatio;
        }

        // Build gallery array if there are multiple images
        const gallery = galleryImages.length > 1
            ? galleryImages.map((img) => ({
                src: img.src,
                type: "image" as const,
                aspectRatio: img.aspectRatio,
            }))
            : undefined;

        // Extract plain text description from ACF transcription or excerpt
        const description = post.acf?.transcription || post.excerpt.rendered
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, " ")
            .trim();

        return {
            id: post.id.toString(),
            type,
            src: videoSrc || src,
            thumbSrc,
            aspectRatio,
            alt: post.title.rendered.replace(/<[^>]*>/g, ""),
            date: post.date.split("T")[0], // YYYY-MM-DD format
            description: description || undefined,
            gallery,
        };
    }).filter((item) => item.src); // Filter out items without a source
}
