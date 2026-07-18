
import { PostEditor } from "@/components/admin/PostEditor"
import { AuroraBackground } from "@/components/layout/AuroraBackground"
import { SiteNav } from "@/components/layout/SiteNav"
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
        <div className="relative min-h-screen font-sans">
            <AuroraBackground />
            <SiteNav />
            <PostEditor initialData={post} />
        </div>
    )
}
