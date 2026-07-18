const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/**
 * Build a Cloudinary image URL from a public ID.
 * f_auto/q_auto lets Cloudinary serve the optimal format and quality.
 */
export function cloudinaryImageUrl(publicId: string, width = 1600): string {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

/**
 * Still-frame thumbnail for a Cloudinary video.
 */
export function cloudinaryVideoThumbUrl(publicId: string, size = 600): string {
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,c_fill,w_${size},h_${size}/${publicId}.jpg`;
}

/**
 * Short muted preview clip for hover playback.
 */
export function cloudinaryVideoPreviewUrl(publicId: string, size = 400): string {
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,du_3,c_fill,h_${size},w_${size}/${publicId}.mp4`;
}
