import { uploadMedia } from "@/lib/wordpress";

/**
 * Images already uploaded one-by-one via /api/media arrive as a JSON list of
 * {id, url}. Any files still sent inline (legacy path) are uploaded here.
 */
export async function collectImages(formData: FormData, title: string): Promise<{ id: number; url: string }[]> {
    const preUploaded: { id: number; url: string }[] = [];
    const raw = formData.get("uploadedImages");
    if (typeof raw === "string" && raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (typeof item?.id === "number" && typeof item?.url === "string") {
                        preUploaded.push({ id: item.id, url: item.url });
                    }
                }
            }
        } catch {
            // ignore malformed payload; fall through to inline files
        }
    }

    const images = formData.getAll("images") as File[];
    const inline = (await Promise.all(
        images
            .filter((image): image is File => image instanceof File && image.size > 0)
            .map(async (image) => {
                const uploaded = await uploadMedia(image, title);
                return uploaded ? { id: uploaded.id, url: uploaded.source_url } : null;
            })
    )).filter((image): image is { id: number; url: string } => image !== null);

    return [...preUploaded, ...inline];
}
