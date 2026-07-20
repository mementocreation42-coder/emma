import { Hero } from "@/components/sections/Hero";
import { GalleryContainer } from "@/components/gallery/GalleryContainer";
import { SiteNav } from "@/components/layout/SiteNav";
import { getPosts } from "@/lib/api";

// Statically prerendered and kept fresh two ways: the underlying WordPress
// fetches revalidate every 5 minutes, and every post mutation calls
// revalidateTag("gallery"), so uploads still show up on the next reload while
// ordinary visits get cached HTML with no WordPress round-trip.

export default async function Home() {
  const posts = await getPosts();

  return (
    <div className="relative flex min-h-screen flex-col font-sans">
      {/* Vignette Overlay - Fixed to viewport */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.25)_100%)]" style={{ transform: 'translateZ(0)' }} />

      <SiteNav />

      <main className="flex-1">
        <Hero />
        <GalleryContainer initialItems={posts} />
      </main>
      <footer className="py-8 text-center text-xs text-muted-foreground/60 tracking-widest">
        Est. 2026
      </footer>
    </div>
  );
}
