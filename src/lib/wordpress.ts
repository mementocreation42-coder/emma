import { MediaItem } from "@/components/gallery/types";

// WordPress API Configuration
const WP_API_URL = process.env.WORDPRESS_API_URL || "https://memory.emma-kobayashi.com/wp-json/wp/v2";

// WordPress API Response Types
export interface WordPressPost {
    id: number;
    date: string;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    excerpt: {
        rendered: string;
    };
    featured_media: number;
    _embedded?: {
        "wp:featuredmedia"?: WordPressMedia[];
    };
}

export interface WordPressMedia {
    id: number;
    source_url: string;
    alt_text: string;
    media_details: {
        width: number;
        height: number;
        sizes?: {
            medium?: { source_url: string; width: number; height: number };
            large?: { source_url: string; width: number; height: number };
            full?: { source_url: string; width: number; height: number };
        };
    };
    mime_type: string;
}

/**
 * Fetch posts from WordPress REST API
 */
export async function fetchWordPressPosts(perPage: number = 100): Promise<WordPressPost[]> {
    const url = `${WP_API_URL}/posts?per_page=${perPage}&_embed`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 60 }, // Revalidate every 60 seconds
        });

        if (!response.ok) {
            console.error(`WordPress API error: ${response.status} ${response.statusText}`);
            return [];
        }

        const posts: WordPressPost[] = await response.json();
        return posts;
    } catch (error) {
        console.error("Failed to fetch WordPress posts:", error);
        return [];
    }
}

/**
 * Fetch a single media item by ID
 */
export async function fetchWordPressMedia(mediaId: number): Promise<WordPressMedia | null> {
    if (!mediaId) return null;

    const url = `${WP_API_URL}/media/${mediaId}`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch media ${mediaId}:`, error);
        return null;
    }
}

/**
 * Extract images from WordPress post content (gallery blocks, image blocks)
 */
function extractGalleryImages(content: string): Array<{ src: string; aspectRatio: number }> {
    const images: Array<{ src: string; aspectRatio: number }> = [];

    // Match img tags in the content
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*(?:width="(\d+)")?[^>]*(?:height="(\d+)")?[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
        const src = match[1];
        const width = match[2] ? parseInt(match[2]) : 16;
        const height = match[3] ? parseInt(match[3]) : 9;

        // Skip if it's an emoji or icon
        if (src.includes("emoji") || src.includes("icon")) continue;

        images.push({
            src,
            aspectRatio: width / height,
        });
    }

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

        // Determine media type
        const isVideo = videoSrc !== null || featuredMedia?.mime_type?.startsWith("video/");
        const type: "image" | "video" = isVideo ? "video" : "image";

        // Get the main image source
        let src = "";
        let aspectRatio = 16 / 9; // Default aspect ratio

        if (featuredMedia) {
            src = featuredMedia.source_url;
            if (featuredMedia.media_details.width && featuredMedia.media_details.height) {
                aspectRatio = featuredMedia.media_details.width / featuredMedia.media_details.height;
            }
        } else if (galleryImages.length > 0) {
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

        // Extract plain text description from excerpt
        const description = post.excerpt.rendered
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, " ")
            .trim();

        return {
            id: post.id.toString(),
            type,
            src: videoSrc || src,
            aspectRatio,
            alt: post.title.rendered.replace(/<[^>]*>/g, ""),
            date: post.date.split("T")[0], // YYYY-MM-DD format
            description: description || undefined,
            gallery,
        };
    }).filter((item) => item.src); // Filter out items without a source
}
