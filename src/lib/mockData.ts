import { MediaItem } from "@/components/gallery/types";

// Sample images from Unsplash (free to use)
export const mockPosts: MediaItem[] = [
    {
        id: "1",
        type: "image",
        src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
        aspectRatio: 3 / 4,
        alt: "Portrait photo",
        date: "2026-01-15",
        description: "A beautiful portrait captured in natural light.",
    },
    {
        id: "2",
        type: "image",
        src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
        aspectRatio: 16 / 9,
        alt: "Mountain landscape",
        date: "2026-01-10",
        description: "Majestic mountains at sunrise.",
        gallery: [
            {
                src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
                type: "image",
                aspectRatio: 16 / 9,
            },
            {
                src: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800",
                type: "image",
                aspectRatio: 16 / 9,
            },
            {
                src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
                type: "image",
                aspectRatio: 16 / 9,
            },
        ],
    },
    {
        id: "3",
        type: "video",
        src: "samples/elephants", // Cloudinary sample video
        aspectRatio: 16 / 9,
        alt: "Elephants video",
        date: "2026-01-08",
        description: "Elephants in their natural habitat.",
    },
    {
        id: "4",
        type: "image",
        src: "https://images.unsplash.com/photo-1518173946687-a4c036bc4a03?w=800",
        aspectRatio: 1,
        alt: "Family moment",
        date: "2026-01-05",
        description: "Precious family memories.",
    },
    {
        id: "5",
        type: "image",
        src: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800",
        aspectRatio: 4 / 3,
        alt: "Beach sunset",
        date: "2026-01-02",
        description: "Golden hour at the beach.",
        gallery: [
            {
                src: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800",
                type: "image",
                aspectRatio: 4 / 3,
            },
            {
                src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
                type: "image",
                aspectRatio: 16 / 9,
            },
        ],
    },
    {
        id: "6",
        type: "image",
        src: "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=800",
        aspectRatio: 3 / 2,
        alt: "City lights",
        date: "2025-12-28",
        description: "City skyline at night.",
    },
    {
        id: "7",
        type: "image",
        src: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800",
        aspectRatio: 2 / 3,
        alt: "Child playing",
        date: "2025-12-25",
        description: "Joy of childhood.",
    },
    {
        id: "8",
        type: "image",
        src: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800",
        aspectRatio: 16 / 9,
        alt: "Autumn colors",
        date: "2025-12-20",
        description: "Fall foliage in full bloom.",
    },
];
