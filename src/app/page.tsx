import { Hero } from "@/components/sections/Hero";
import { GalleryContainer } from "@/components/gallery/GalleryContainer";
import { getPosts } from "@/lib/api";





export default async function Home() {
  const posts = await getPosts();

  return (
    <div className="flex min-h-screen flex-col font-sans">
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
