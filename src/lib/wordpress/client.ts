import { WordPressPost, WordPressMedia } from "./types";
import { SCHEDULE_CATEGORY_SLUG } from "@/types/schedule";

// WordPress API Configuration
export const WP_API_URL = process.env.WORDPRESS_API_URL || "https://memory.emma-kobayashi.com/wp-json/wp/v2";
const WP_USER = process.env.WORDPRESS_APP_USERNAME;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

export function getAuthHeaders() {
    if (!WP_USER || !WP_APP_PASSWORD) {
        throw new Error("WordPress credentials not configured");
    }
    const token = btoa(`${WP_USER}:${WP_APP_PASSWORD}`);
    return {
        "Authorization": `Basic ${token}`,
    };
}

const categoryIdCache = new Map<string, number | null>();

/**
 * Resolve a category slug to its ID. Returns null when the category does not
 * exist yet, so callers can degrade instead of failing.
 */
export async function fetchCategoryIdBySlug(slug: string): Promise<number | null> {
    // Only positive results are memoised. A miss must not stick: a category
    // created after the server started would otherwise stay invisible until a
    // restart. The in-process Map still spares the repeat lookups once found.
    const cached = categoryIdCache.get(slug);
    if (cached) return cached;

    try {
        // Short revalidate, not no-store: a miss cached before the category
        // existed can only linger 5 minutes, while every cold start stops
        // paying a blocking round-trip before the posts fetch.
        const response = await fetch(`${WP_API_URL}/categories?slug=${encodeURIComponent(slug)}`, {
            next: { revalidate: 300 },
        });
        if (!response.ok) return null;

        const categories: Array<{ id: number }> = await response.json();
        const id = categories[0]?.id ?? null;
        if (id) categoryIdCache.set(slug, id);
        return id;
    } catch (error) {
        console.error(`Failed to resolve category "${slug}":`, error);
        return null;
    }
}

/**
 * Fetch posts from WordPress REST API
 */
export async function fetchWordPressPosts(perPage: number = 100): Promise<WordPressPost[]> {
    const scheduleCategoryId = await fetchCategoryIdBySlug(SCHEDULE_CATEGORY_SLUG);

    // Only the fields transform.ts reads, and only the featured-media embed:
    // embedding author/terms/replies and returning every post field roughly
    // doubled the payload for nothing. _links must stay in _fields or WP
    // drops _embedded entirely.
    const fields = "id,date,title,content,excerpt,acf,_links,_embedded";
    let url = `${WP_API_URL}/posts?per_page=${perPage}&status=publish&_embed=wp:featuredmedia&_fields=${fields}`;
    if (scheduleCategoryId) {
        // Keep schedule entries out of the gallery.
        url += `&categories_exclude=${scheduleCategoryId}`;
    }

    try {
        // Cached and tag-invalidated like the calendar: every post mutation
        // goes through /api/posts*, which calls revalidateTag("gallery"), so a
        // newly published photo still appears on the next reload while normal
        // visits skip the WordPress round-trip entirely.
        const response = await fetch(url, {
            next: { revalidate: 300, tags: ["gallery"] },
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
    date?: string;
    status: 'publish' | 'draft';
    featured_media?: number;
    categories?: number[];
    acf?: Record<string, unknown>;
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
 * Update an existing Post
 */
export async function updatePost(id: number, postData: {
    title?: string;
    content?: string;
    date?: string;
    status?: 'publish' | 'draft';
    featured_media?: number;
    acf?: Record<string, unknown>;
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
