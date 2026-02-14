import { MediaItem } from "@/components/gallery/types";

// WordPress API Configuration
const WP_API_URL = process.env.WORDPRESS_API_URL || "https://memory.emma-kobayashi.com/wp-json/wp/v2";
const WP_USER = process.env.WORDPRESS_APP_USERNAME;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

function getAuthHeaders() {
    if (!WP_USER || !WP_APP_PASSWORD) {
        throw new Error("WordPress credentials not configured");
    }
    const token = btoa(`${WP_USER}:${WP_APP_PASSWORD}`);
    return {
        "Authorization": `Basic ${token}`,
    };
}

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
    acf?: {
        media_type?: string; // 'image' or 'video'
        cloudinary_id?: string; // Cloudinary Public ID for videos
        transcription?: string; // Optional description
        wp_image?: number; // Image ID (Required by ACF)
    };
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
    const url = `${WP_API_URL}/posts?per_page=${perPage}&status=publish&_embed`;

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
 * Upload a media file to WordPress
 */
export async function uploadMedia(file: File | Blob, title: string): Promise<WordPressMedia | null> {
    const url = `${WP_API_URL}/media`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    // formData.append('caption', title); 

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`WordPress Upload Error: ${response.status}`, errorText);
            throw new Error(`Failed to upload media: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to upload media:", error);
        throw error;
    }
}

/**
 * Create a new Post
 */
export async function createPost(postData: {
    title: string;
    content: string;
    status: 'publish' | 'draft';
    featured_media?: number;
    acf?: Record<string, any>;
}): Promise<WordPressPost> {
    const url = `${WP_API_URL}/posts`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`WordPress Create Post Error: ${response.status}`, errorText);
            throw new Error(`Failed to create post: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to create post:", error);
        throw error;
    }
}

/**
 * Extract images from WordPress post content (gallery blocks, image blocks)
 */
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
        let aspectRatio = 16 / 9; // Default aspect ratio

        // Priority 1: Cloudinary ID (for videos)
        if (cloudinaryId) {
            src = cloudinaryId; // Cloudinary component will handle the full URL
        }
        // Priority 2: Featured Media
        else if (featuredMedia) {
            src = featuredMedia.source_url;
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
            aspectRatio,
            alt: post.title.rendered.replace(/<[^>]*>/g, ""),
            date: post.date.split("T")[0], // YYYY-MM-DD format
            description: description || undefined,
            gallery,
        };
    }).filter((item) => item.src); // Filter out items without a source
}

/**
 * Fetch a single post by ID
 */
export async function fetchWordPressPost(id: number): Promise<WordPressPost | null> {
    const url = `${WP_API_URL}/posts/${id}?_embed`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 0 }, // No cache for editing
        });

        if (!response.ok) {
            console.error(`WordPress API error: ${response.status} ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch WordPress post ${id}:`, error);
        return null;
    }
}

/**
 * Update an existing Post
 */
export async function updatePost(id: number, postData: {
    title?: string;
    content?: string;
    status?: 'publish' | 'draft';
    featured_media?: number;
    acf?: Record<string, any>;
}): Promise<WordPressPost> {
    const url = `${WP_API_URL}/posts/${id}`;

    try {
        const response = await fetch(url, {
            method: 'POST', // WP API uses POST for updates (or PUT)
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`WordPress Update Post Error: ${response.status}`, errorText);
            throw new Error(`Failed to update post: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to update post:", error);
        throw error;
    }
}

/**
 * Delete a Post
 */
export async function deletePost(id: number): Promise<boolean> {
    const url = `${WP_API_URL}/posts/${id}?force=true`; // force=true to skip trash and delete permanently

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`WordPress Delete Post Error: ${response.status}`, errorText);
            throw new Error(`Failed to delete post: ${response.status} ${errorText}`);
        }

        return true;
    } catch (error) {
        console.error("Failed to delete post:", error);
        throw error;
    }
}
