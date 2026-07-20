
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { fetchWordPressPosts } from "@/lib/wordpress"
import { formatDate } from "@/lib/utils"
import { Plus } from "lucide-react"
import { PostActions } from "@/components/admin/PostActions"
import { AuroraBackground, GLASS_PANEL } from "@/components/layout/AuroraBackground"
import { SiteNav } from "@/components/layout/SiteNav"
import { cn } from "@/lib/utils"

// Force dynamic rendering to ensure the latest list is always fetched
export const dynamic = 'force-dynamic'

import { Metadata } from "next"

export const metadata: Metadata = {
    title: "ダッシュボード",
}

export default async function AdminDashboard() {
    const posts = await fetchWordPressPosts(100) // Fetch last 100 posts

    return (
        <div className="relative min-h-screen font-sans">
            <AuroraBackground />
            <SiteNav />

            <main className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-20 sm:pt-24">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-wide">ダッシュボード</h1>
                        <p className="mt-1 text-sm text-muted-foreground">投稿 {posts.length} 件</p>
                    </div>
                    <Link href="/admin/post">
                        <Button size="sm" className="text-xs">
                            <Plus className="mr-1 h-3 w-3" />
                            新規作成
                        </Button>
                    </Link>
                </div>

                <div className={cn("overflow-hidden", GLASS_PANEL)}>
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/40 bg-white/25 text-xs text-muted-foreground dark:border-white/10">
                            <tr>
                                <th className="px-4 py-3 font-medium">タイトル</th>
                                <th className="hidden px-4 py-3 font-medium md:table-cell">日付</th>
                                <th className="hidden px-4 py-3 font-medium md:table-cell">状態</th>
                                <th className="px-4 py-3 text-right font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map((post) => (
                                <tr
                                    key={post.id}
                                    className="border-b border-white/30 transition-colors last:border-0 hover:bg-white/30 dark:border-white/5"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        {post.title.rendered || "(無題)"}
                                    </td>
                                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                                        {formatDate(post.date)}
                                    </td>
                                    <td className="hidden px-4 py-3 md:table-cell">
                                        <span className="inline-flex items-center rounded-full border border-emerald-600/25 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                            公開
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <PostActions postId={post.id} />
                                    </td>
                                </tr>
                            ))}
                            {posts.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                                        投稿がありません。最初の1件を作成してください。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}
