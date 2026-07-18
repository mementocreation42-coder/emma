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
