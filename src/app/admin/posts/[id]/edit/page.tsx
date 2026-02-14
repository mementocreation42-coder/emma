
import { PostEditor } from "@/components/admin/PostEditor"
import { fetchWordPressPost } from "@/lib/wordpress"
import { notFound } from "next/navigation"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: PageProps) {
    const { id } = await params
    const post = await fetchWordPressPost(parseInt(id))

    if (!post) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-zinc-100/80">
            <PostEditor initialData={post} />
        </div>
    )
}
