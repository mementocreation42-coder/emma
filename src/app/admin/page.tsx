
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWordPressPosts } from "@/lib/wordpress"
import { formatDate } from "@/lib/utils" // Assuming utils has formatDate, if not I'll standard js it.
import { Plus, Edit } from "lucide-react"

import { PostActions } from "@/components/admin/PostActions"

// Force dynamic rendering to ensure the latest list is always fetched
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const posts = await fetchWordPressPosts(100) // Fetch last 100 posts

    return (
        <div className="min-h-screen bg-zinc-100/80">
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <Link href="/admin/posts/new">
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
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        )
}
