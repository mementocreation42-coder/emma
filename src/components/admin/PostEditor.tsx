
"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
// @ts-ignore
import imageCompression from 'browser-image-compression';
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  mediaType: z.enum(["image", "video"]),
  cloudinaryId: z.string().optional(),
  images: z.array(z.any()).optional(), // Store file objects
})

import { WordPressPost } from "@/lib/wordpress"

interface PreviewImage {
  id: string;
  url: string;
  file: File;
}

interface PostEditorProps {
  initialData?: WordPressPost;
}

export function PostEditor({ initialData }: PostEditorProps) {
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title.rendered || "",
      content: initialData?.content.rendered || "",
      mediaType: (initialData?.acf?.media_type as "image" | "video") || "image",
      cloudinaryId: initialData?.acf?.cloudinary_id || "",
      images: [],
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      url: URL.createObjectURL(file),
      file
    }))
    setPreviewImages(prev => [...prev, ...newImages])
  }, [])

  const removeImage = (id: string) => {
    setPreviewImages(prev => prev.filter(img => img.id !== id))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("title", values.title)
      formData.append("content", values.content || "")
      formData.append("mediaType", values.mediaType)
      formData.append("mediaType", values.mediaType)
      if (values.cloudinaryId) formData.append("cloudinaryId", values.cloudinaryId)
      // Pass existing wp_image ID if we are editing and have it
      if (initialData?.acf?.wp_image) {
        formData.append("wp_image", initialData.acf.wp_image.toString())
      }

      // Append images with compression
      const compressionOptions = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 1920,
        useWebWorker: true
      }

      for (const img of previewImages) {
        try {
          console.log(`Compressing ${img.file.name}...`)
          const compressedFile = await imageCompression(img.file, compressionOptions);
          // Validating that we pass a File object or Blob with filename
          // browser-image-compression returns a File object usually, but let's be safe
          // and explicitly pass the original filename to FormData
          formData.append("images", compressedFile, img.file.name);
        } catch (error) {
          console.error("Compression failed:", error);
          // Fallback to original file if compression fails
          formData.append("images", img.file);
        }
      }

      const url = initialData ? `/api/posts/${initialData.id}` : "/api/posts"

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })

      let data
      try {
        data = await response.json()
      } catch (error) {
        // If response is not JSON (e.g., 413 Request Entity Too Large HTML), handle it
        if (!response.ok) {
          throw new Error(`Server Error: ${response.status} ${response.statusText}`)
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create post")
      }

      alert(initialData ? "Post updated successfully!" : "Post created successfully!")

      if (!initialData) {
        // Only reset on create, keep form on edit
        form.reset()
        setPreviewImages([])
      }

    } catch (error: any) {
      console.error(error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">{initialData ? "Edit Post" : "Create New Post"}</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Drag & Drop Zone */}
            <Card className="border-dashed border-2 overflow-hidden">
              <div
                {...getRootProps()}
                className={cn(
                  "p-10 cursor-pointer transition-colors text-center hover:bg-muted/50",
                  isDragActive && "bg-muted"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="p-4 bg-muted rounded-full">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Drag photos here</p>
                    <p className="text-sm">or click to browse</p>
                  </div>
                </div>
              </div>

              {/* Preview Grid */}
              {previewImages.length > 0 && (
                <div className="p-6 bg-muted/20 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewImages.map((img) => (
                      <div key={img.id} className="group relative aspect-[3/4] bg-background rounded-lg border overflow-hidden shadow-sm">
                        <img
                          src={img.url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Post Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter post title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your story here..."
                          className="min-h-[400px] font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        HTML is supported.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column (1/3) */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Publish</CardTitle>
              </CardHeader>
              <CardContent>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {initialData ? "Updating..." : "Publishing..."}
                    </>
                  ) : (
                    initialData ? "Update Post" : "Publish Post"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Media Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="mediaType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Media Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select media type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Note: Image URL input removed in favor of Drag & Drop */}

                <FormField
                  control={form.control}
                  name="cloudinaryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cloudinary Video ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. folder/videoname" {...field} />
                      </FormControl>
                      <FormDescription>
                        If Video is selected, enter the Cloudinary Public ID.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

        </form>
      </Form>
    </div>
  )
}
