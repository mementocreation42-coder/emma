import { MediaItem } from "@/components/gallery/types";
import { fetchWordPressPosts, convertToMediaItems } from "./wordpress";
import { mockPosts } from "./mockData";

/**
 * Fetch posts from WordPress CMS
 * Falls back to mock data if WordPress API is unavailable
 */
export async function getPosts(): Promise<MediaItem[]> {
    try {
        const wpPosts = await fetchWordPressPosts();

        if (wpPosts.length > 0) {
            console.log("📡 Fetched from WordPress:", wpPosts.length, "posts");
            return await convertToMediaItems(wpPosts);
        }

        // Return empty array if no posts returned (no fallback to mock data)
        console.log("⚠️ No WordPress posts found");
        return [];
    } catch (error) {
        console.error("Failed to fetch from WordPress:", error);
        return [];
    }
}
