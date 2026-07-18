
import { PostEditor } from "@/components/admin/PostEditor"
import { AuroraBackground } from "@/components/layout/AuroraBackground"
import { SiteNav } from "@/components/layout/SiteNav"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "投稿",
}

export default function NewPostPage() {
    return (
        <div className="relative min-h-screen font-sans">
            <AuroraBackground />
            <SiteNav />
            <PostEditor />
        </div>
    )
}
