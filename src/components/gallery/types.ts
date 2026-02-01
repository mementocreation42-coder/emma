export type MediaType = 'image' | 'video';

export interface MediaItem {
    id: string;
    type: MediaType;
    src: string; // Cover image (or single item)
    aspectRatio: number;
    alt: string;
    date: string;
    description?: string;
    transcription?: string;
    gallery?: Array<{ // For multi-image posts
        src: string;
        type: 'image' | 'video';
        aspectRatio: number; // Individual aspect ratio
    }>;
}
