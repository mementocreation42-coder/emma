"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { X, Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { WordPressPost } from "@/lib/wordpress"
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
import { GLASS_PANEL } from "@/components/layout/AuroraBackground"

const formSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  content: z.string().optional(),
  date: z.string().optional(), // Local "YYYY-MM-DDTHH:MM" for datetime-local input
  mediaType: z.enum(["image", "video"]),
  cloudinaryId: z.string().optional(),
})

// datetime-local wants local time; toISOString() would shift to UTC (e.g. -9h in JST)
function localNowForInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const GALLERY_MARKER = "<!-- Gallery Automatic Append -->";

// The create/update API appends gallery <img> tags to the content, and the
// frontend gallery extraction depends on them. Keep that block out of the
// editable textarea so it neither clutters the editor nor accumulates
// wpautop-mangled markup across repeated edits.
function splitGalleryContent(rendered: string): { text: string; galleryHtml: string } {
  const idx = rendered.indexOf(GALLERY_MARKER);
  if (idx === -1) return { text: rendered.trim(), galleryHtml: "" };
  return {
    // The marker may have been wrapped in a <p> by WP rendering — drop the dangling tag
    text: rendered.slice(0, idx).replace(/<p>\s*$/, "").trim(),
    galleryHtml: rendered.slice(idx),
  };
}

interface PreviewImage {
  id: string;
  url: string;
  file: File;
}

interface PostEditorProps {
  initialData?: WordPressPost;
}

interface VideoUploadState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;
  fileName?: string;
  error?: string;
}

export function PostEditor({ initialData }: PostEditorProps) {
  const router = useRouter()
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([])
  const [videoUpload, setVideoUpload] = useState<VideoUploadState>({ status: 'idle', progress: 0 })

  // Existing auto-appended gallery block, kept out of the textarea and re-attached on submit
  const { text: initialContentText, galleryHtml } = useMemo(
    () => splitGalleryContent(initialData?.content.rendered || ""),
    [initialData]
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title.rendered || "",
      content: initialContentText,
      // WP post dates are site-local "YYYY-MM-DDTHH:MM:SS" — slice fits datetime-local as-is
      date: initialData?.date ? initialData.date.slice(0, 16) : localNowForInput(),
      mediaType: (initialData?.acf?.media_type as "image" | "video") || "image",
      cloudinaryId: initialData?.acf?.cloudinary_id || "",
    },
  })

  // Videos upload straight from the browser to Cloudinary (signed) — they must not
  // go through /api/posts because serverless request bodies cap at ~4.5MB
  const uploadVideoToCloudinary = useCallback(async (file: File) => {
    setVideoUpload({ status: 'uploading', progress: 0, fileName: file.name })
    try {
      const sigRes = await fetch('/api/cloudinary-signature', { method: 'POST' })
      const sig = await sigRes.json()
      if (!sigRes.ok) throw new Error(sig.error || 'Failed to get upload signature')

      const fd = new FormData()
      fd.append('file', file)
      fd.append('api_key', sig.apiKey)
      fd.append('timestamp', String(sig.timestamp))
      fd.append('signature', sig.signature)
      if (sig.folder) fd.append('folder', sig.folder)

      // XMLHttpRequest for upload progress (fetch has no upload progress events)
      const publicId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            setVideoUpload(v => ({ ...v, progress }))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText).public_id)
          } else {
            let message = `Upload failed (${xhr.status})`
            try { message = JSON.parse(xhr.responseText).error?.message || message } catch { }
            reject(new Error(message))
          }
        }
        xhr.onerror = () => reject(new Error('Network error during video upload'))
        xhr.send(fd)
      })

      form.setValue('cloudinaryId', publicId)
      form.setValue('mediaType', 'video')
      setVideoUpload({ status: 'done', progress: 100, fileName: file.name })
    } catch (error) {
      setVideoUpload({
        status: 'error',
        progress: 0,
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [form])

  const onDrop = useCallback(async (droppedFiles: File[]) => {
    const videoFile = droppedFiles.find(f => f.type.startsWith('video/'))
    const acceptedFiles = droppedFiles.filter(f => f.type.startsWith('image/'))

    if (videoFile) {
      uploadVideoToCloudinary(videoFile)
    }

    const newImages = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      url: URL.createObjectURL(file),
      file
    }))
    setPreviewImages(prev => [...prev, ...newImages])

    // Auto-detect date from the first image if it's not already set by the user (or is default)
    if (acceptedFiles.length > 0 && !initialData) {
      try {
        // Loaded on demand — exifreader is only needed when photos are dropped
        const ExifReader = (await import('exifreader')).default;
        const tags = await ExifReader.load(acceptedFiles[0]);
        // Check for DateTimeOriginal (standard for photos)
        const dateOriginal = tags['DateTimeOriginal']?.description;
        if (dateOriginal) {
          // Format is usually "YYYY:MM:DD HH:MM:SS"
          // Convert to ISO format "YYYY-MM-DDTHH:MM" for input type="datetime-local"
          const [datePart, timePart] = dateOriginal.split(' ');
          const isoDate = `${datePart.replace(/:/g, '-')}T${timePart.slice(0, 5)}`;

          form.setValue('date', isoDate);
        }
      } catch (error) {
        console.error("Failed to read Exif data:", error);
      }
    }
  }, [form, initialData])

  const removeImage = (id: string) => {
    setPreviewImages(prev => {
      const removed = prev.find(img => img.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter(img => img.id !== id)
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm']
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("title", values.title)
      // Re-attach the preserved gallery block that was split out of the textarea
      const contentWithGallery = galleryHtml
        ? `${values.content || ""}\n\n${galleryHtml}`
        : (values.content || "")
      formData.append("content", contentWithGallery)
      // Send local time as-is; WP interprets `date` as site-local.
      // Converting via toISOString() would shift it to UTC (-9h in JST).
      if (values.date) formData.append("date", `${values.date}:00`)
      formData.append("mediaType", values.mediaType)
      if (values.cloudinaryId) formData.append("cloudinaryId", values.cloudinaryId)
      // Pass existing wp_image ID if we are editing and have it
      if (initialData?.acf?.wp_image) {
        formData.append("wp_image", initialData.acf.wp_image.toString())
      }

      // Append images with compression
      const compressionOptions = {
        maxSizeMB: 0.5, // Reduced to 0.5MB as requested
        maxWidthOrHeight: 1920,
        useWebWorker: true
      }

      // Loaded on demand — the compression lib is only needed when submitting with images
      const imageCompression = previewImages.length > 0
        ? (await import('browser-image-compression')).default
        : null;

      for (const img of previewImages) {
        try {
          const compressedFile = await imageCompression!(img.file, compressionOptions);
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

      alert(initialData ? "投稿を更新しました" : "投稿を公開しました")

      previewImages.forEach(img => URL.revokeObjectURL(img.url))
      setPreviewImages([])
      if (!initialData) {
        form.reset()
      }
      // Back to the dashboard with a fresh post list
      router.push("/admin")
      router.refresh()

    } catch (error: any) {
      console.error(error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-20 sm:pt-24">
      <h1 className="mb-8 font-serif text-2xl font-semibold tracking-wide sm:text-3xl">
        {initialData ? "投稿を編集" : "新規投稿"}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-4xl space-y-8">

          <div className="space-y-8">

            {/* Drag & Drop Zone */}
            <Card className={cn(GLASS_PANEL, "overflow-hidden border-2 border-dashed py-0")}>
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
                    <p className="font-medium text-foreground">写真または動画をここへドラッグ</p>
                    <p className="text-sm">またはクリックして選択 — 動画はCloudinaryへ直接アップロードされます</p>
                  </div>
                </div>
              </div>

              {/* Video Upload Status */}
              {videoUpload.status !== 'idle' && (
                <div className="px-6 py-4 border-t bg-muted/20 text-sm space-y-2">
                  {videoUpload.status === 'uploading' && (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{videoUpload.fileName} をアップロード中… {videoUpload.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-foreground/70 transition-all duration-300"
                          style={{ width: `${videoUpload.progress}%` }}
                        />
                      </div>
                    </>
                  )}
                  {videoUpload.status === 'done' && (
                    <p className="text-green-700">✓ {videoUpload.fileName} をアップロードしました — Cloudinary IDを自動設定しました</p>
                  )}
                  {videoUpload.status === 'error' && (
                    <p className="text-red-600">動画のアップロードに失敗しました: {videoUpload.error}</p>
                  )}
                </div>
              )}

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

            <Card className={GLASS_PANEL}>
              <CardHeader>
                <CardTitle className="font-serif text-base font-semibold tracking-wide">投稿内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>タイトル</FormLabel>
                      <FormControl>
                        <Input placeholder="タイトルを入力" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>日時</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        初期値は現在日時です。写真のExif情報があれば自動で設定されます。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>本文</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="ここに本文を入力..."
                          className="min-h-[400px] font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        HTMLに対応しています。ギャラリー画像は自動管理され、この欄には表示されません。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className={GLASS_PANEL}>
              <CardHeader>
                <CardTitle className="font-serif text-base font-semibold tracking-wide">公開</CardTitle>
              </CardHeader>
              <CardContent>
                <Button type="submit" className="w-full" disabled={isLoading || videoUpload.status === 'uploading'}>
                  {videoUpload.status === 'uploading' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      動画をアップロード中…
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {initialData ? "更新中..." : "公開中..."}
                    </>
                  ) : (
                    initialData ? "投稿を更新" : "投稿を公開"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className={GLASS_PANEL}>
              <CardHeader>
                <CardTitle className="font-serif text-base font-semibold tracking-wide">メディア設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="mediaType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メディア種別</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="メディア種別を選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="image">画像</SelectItem>
                          <SelectItem value="video">動画</SelectItem>
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
                      <FormLabel>Cloudinary動画ID</FormLabel>
                      <FormControl>
                        <Input placeholder="例: folder/videoname" {...field} />
                      </FormControl>
                      <FormDescription>
                        動画を追加すると自動設定されます。手動での入力も可能です。
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
