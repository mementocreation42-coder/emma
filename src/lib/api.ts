import { MediaItem } from "@/components/gallery/types";
import { mockPosts } from "./mockData";

export async function getPosts(): Promise<MediaItem[]> {
    console.log("📦 Using mock data:", mockPosts.length, "items");
    return mockPosts;
}
