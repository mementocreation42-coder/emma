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
    acf?: { // Advanced Custom Fields
        media_type?: string;
        wp_image?: number | string; // Can be ID or sometimes object depending on config, usually ID
        cloudinary_id?: string; // Cloudinary Public ID
        transcription?: string;
        // Supports up to 10 gallery images
        // Deprecated: Supports up to 10 gallery images (Old Legacy)
        gallery_image_1?: number | string;
        gallery_image_2?: number | string;
        gallery_image_3?: number | string;
        gallery_image_4?: number | string;
        gallery_image_5?: number | string;
        gallery_image_6?: number | string;
        gallery_image_7?: number | string;
        gallery_image_8?: number | string;
        gallery_image_9?: number | string;
        gallery_image_10?: number | string;

        // New: Gallery Field (Array of IDs)
        gallery_images?: number[];
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
    const url = `${WP_API_URL}/posts?per_page=${perPage}&_embed`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 60 }, // Revalidate every 60 seconds
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
            },
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
 * Batch fetch media items by IDs
 * Used to resolve ACF image IDs to URLs
 */
export async function fetchMediaBatch(mediaIds: number[]): Promise<Map<number, WordPressMedia>> {
    if (mediaIds.length === 0) return new Map();

    // Deduplicate IDs
    const uniqueIds = Array.from(new Set(mediaIds));
    const mediaMap = new Map<number, WordPressMedia>();

    // Optimization: If IDs list is too long, we might need to chunk it, 
    // but typically WP API handles ~50-100 items depending on server config.
    // Let's create chunks of 20 to be safe.
    const chunkSize = 20;

    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const chunk = uniqueIds.slice(i, i + chunkSize);
        const url = `${WP_API_URL}/media?include=${chunk.join(',')}&per_page=100`;

        try {
            const response = await fetch(url, {
                next: { revalidate: 3600 },
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                }
            });

            if (response.ok) {
                const mediaItems: WordPressMedia[] = await response.json();
                mediaItems.forEach(item => {
                    mediaMap.set(item.id, item);
                });
            }
        } catch (error) {
            console.error(`Failed to fetch media chunk ${chunk}:`, error);
        }
    }

    return mediaMap;
}

/**
 * Convert WordPress posts to MediaItem format
 * Resolves ACF media IDs first
 */
export async function convertToMediaItems(posts: WordPressPost[]): Promise<MediaItem[]> {
    // 1. Collect all Media IDs from ACFs
    const mediaIdsToFetch: number[] = [];

    posts.forEach(post => {
        if (!post.acf) return;

        // Collect wp_image
        if (post.acf.wp_image && typeof post.acf.wp_image === 'number') {
            mediaIdsToFetch.push(post.acf.wp_image);
        }

        // Collect gallery images 1-10 (Legacy)
        for (let i = 1; i <= 10; i++) {
            const key = `gallery_image_${i}` as keyof typeof post.acf;
            const val = post.acf[key];
            if (val && typeof val === 'number') {
                mediaIdsToFetch.push(val);
            }
        }

        // Collect new gallery field (Array)
        if (post.acf.gallery_images && Array.isArray(post.acf.gallery_images)) {
            post.acf.gallery_images.forEach(id => {
                if (typeof id === 'number') mediaIdsToFetch.push(id);
            });
        }
    });

    // 2. Batch fetch missing media details
    const mediaMap = await fetchMediaBatch(mediaIdsToFetch);

    // 3. Map posts to MediaItems
    const convertedItems = posts.map((post) => {
        // --- Strategy to find the main image ---
        let mainImageSrc = "";
        let mainAspectRatio = 16 / 9;

        // Priority 0: Cloudinary ID (Video/Image)
        if (post.acf?.cloudinary_id) {
            mainImageSrc = post.acf.cloudinary_id;
            // If it's a Cloudinary ID, we assume it's a video if media_type says so, or we can default to video 
            // if we want to force Cloudinary IDs to be treated as videos (based on user request)
            // But let's respect media_type if possible.
        }

        // Priority 1: ACF Main Image (wp_image)
        if (!mainImageSrc && post.acf?.wp_image && typeof post.acf.wp_image === 'number') {
            const media = mediaMap.get(post.acf.wp_image);
            if (media) {
                mainImageSrc = media.source_url;
                if (media.media_details.width && media.media_details.height) {
                    mainAspectRatio = media.media_details.width / media.media_details.height;
                }
            }
        }

        // Priority 2: Standard Featured Media (if ACF failed or missing)
        if (!mainImageSrc) {
            const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
            if (featuredMedia) {
                mainImageSrc = featuredMedia.source_url;
                if (featuredMedia.media_details.width && featuredMedia.media_details.height) {
                    mainAspectRatio = featuredMedia.media_details.width / featuredMedia.media_details.height;
                }
            }
        }

        // Ignore content images if we are using ACF strict mode, 
        // but can fallback if nothing found. Let's keep it safe.

        // --- Prepare Gallery ---
        let gallery: Array<{ src: string; type: 'image' | 'video'; aspectRatio: number }> = [];

        if (post.acf) {
            // Add main video/image to gallery first if it is Cloudinary
            if (post.acf.cloudinary_id) {
                gallery.push({
                    src: post.acf.cloudinary_id,
                    type: post.acf.media_type === 'video' ? 'video' : 'image', // Default to image if not specified? Or user said "Video is Cloudinary ID"
                    aspectRatio: 16 / 9, // Default for Cloudinary since we don't have dimensions
                });
            }

            for (let i = 1; i <= 10; i++) {
                const key = `gallery_image_${i}` as keyof typeof post.acf;
                const val = post.acf[key];
                if (val && typeof val === 'number') {
                    const media = mediaMap.get(val);
                    if (media) {
                        gallery.push({
                            src: media.source_url,
                            type: 'image',
                            aspectRatio: media.media_details.width && media.media_details.height
                                ? media.media_details.width / media.media_details.height
                                : 16 / 9,
                        });
                    }
                }
            }

            // Handle new Gallery Field
            if (post.acf.gallery_images && Array.isArray(post.acf.gallery_images)) {
                post.acf.gallery_images.forEach(id => {
                    const media = mediaMap.get(id);
                    if (media) {
                        gallery.push({
                            src: media.source_url,
                            type: 'image',
                            aspectRatio: media.media_details.width && media.media_details.height
                                ? media.media_details.width / media.media_details.height
                                : 16 / 9,
                        });
                    }
                });
            }
        }

        // If ACF gallery is empty, fallback to Featured Media if used as main but not in ACF
        if (gallery.length === 0 && mainImageSrc) {
            // If no gallery, maybe the main image is the gallery? 
            // Logic in GalleryItem component handles single items fine.
        }

        // If we found a main image from ACF but gallery array is empty,
        // we might want to put the main image INTO the gallery array 
        // if the design expects it. 
        // Current logic: 'gallery' prop is optional.

        // --- Determine Type ---
        // If we have a cloudinary_id, check media_type or assume video if specifically asked
        const isVideo = post.acf?.media_type === 'video' || (!!post.acf?.cloudinary_id && post.acf?.media_type !== 'image');

        // Extract plain text description from excerpt or ACF transcription
        let description = post.acf?.transcription || post.excerpt.rendered
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();

        if (!mainImageSrc && gallery.length > 0) {
            mainImageSrc = gallery[0].src;
            mainAspectRatio = gallery[0].aspectRatio;
        }

        return {
            id: post.id.toString(),
            type: (isVideo ? 'video' : 'image') as 'video' | 'image',
            src: mainImageSrc,
            aspectRatio: mainAspectRatio,
            alt: post.title.rendered.replace(/<[^>]*>/g, ""),
            date: post.date.split("T")[0],
            description: description || undefined,
            gallery: gallery.length > 1 ? gallery : undefined,
        };
    }).filter((item) => item.src); // Filter out items without a source

    return convertedItems;
}
