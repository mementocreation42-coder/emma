
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWordPressPosts } from "@/lib/wordpress"
import { formatDate } from "@/lib/utils"
import { Plus } from "lucide-react"
import { PostActions } from "@/components/admin/PostActions"

// Force dynamic rendering to ensure the latest list is always fetched
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const posts = await fetchWordPressPosts(100) // Fetch last 100 posts

    return (
        <div className="min-h-screen bg-zinc-200">
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <Link href="/admin/post">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Post
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Posts ({posts.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border bg-background">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-medium">Title</th>
                                        <th className="p-4 font-medium hidden md:table-cell">Date</th>
                                        <th className="p-4 font-medium hidden md:table-cell">Status</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posts.map((post) => (
                                        <tr key={post.id} className="border-t hover:bg-muted/20 transition-colors">
                                            <td className="p-4 font-medium">
                                                {post.title.rendered || "(No Title)"}
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                {formatDate(post.date)}
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                                    Published
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <PostActions postId={post.id} />
                                            </td>
                                        </tr>
                                    ))}
                                    {posts.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                No posts found. Create your first one!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
