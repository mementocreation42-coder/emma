import { Hero } from "@/components/sections/Hero";
import { GalleryContainer } from "@/components/gallery/GalleryContainer";
import { getPosts } from "@/lib/api";





export default async function Home() {
  const posts = await getPosts();

  return (
    <div className="relative flex min-h-screen flex-col font-sans">
      {/* Vignette Overlay - Fixed to viewport */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.25)_100%)]" />

      <main className="flex-1">
        <Hero />
        <GalleryContainer initialItems={posts} />
      </main>
      <footer className="py-8 text-center text-xs text-muted-foreground/60 font-serif tracking-widest">
        Est. 2026
      </footer>
    </div>
  );
}
