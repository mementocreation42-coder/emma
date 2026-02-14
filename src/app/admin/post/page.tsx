
import { PostEditor } from "@/components/admin/PostEditor"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "投稿",
}

export default function NewPostPage() {
    return (
        <div className="min-h-screen bg-zinc-200">
            <PostEditor />
        </div>
    )
}
