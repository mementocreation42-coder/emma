
"use client"

import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface PostActionsProps {
    postId: number
}

export function PostActions({ postId }: PostActionsProps) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) {
            return
        }

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                throw new Error("Failed to delete post")
            }

            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Failed to delete post")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex justify-end gap-2">
            <Link href={`/admin/posts/${postId}/edit`}>
                <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                </Button>
            </Link>
            <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
            >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
            </Button>
        </div>
    )
}
