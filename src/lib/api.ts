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
            return convertToMediaItems(wpPosts);
        }

        // Fall back to mock data if no posts returned
        console.log("⚠️ No WordPress posts found, using mock data");
        return mockPosts;
    } catch (error) {
        console.error("Failed to fetch from WordPress, using mock data:", error);
        return mockPosts;
    }
}
