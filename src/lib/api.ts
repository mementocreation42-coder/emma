import { MediaItem } from "@/types/media";
import { fetchWordPressPosts, convertToMediaItems } from "./wordpress";

/**
 * Fetch posts from WordPress CMS
 */
export async function getPosts(): Promise<MediaItem[]> {
    try {
        const wpPosts = await fetchWordPressPosts();
        return convertToMediaItems(wpPosts);
    } catch (error) {
        console.error("Failed to fetch from WordPress:", error);
        return [];
    }
}
