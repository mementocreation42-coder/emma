import Link from "next/link";

export function Header() {
    return (
        <header className="fixed top-0 z-50 w-full border-b bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="font-serif text-xl font-bold tracking-tight">
                    Emma K.
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/gallery" className="transition-colors hover:text-foreground/80 text-foreground/60">Gallery</Link>
                    <Link href="/timeline" className="transition-colors hover:text-foreground/80 text-foreground/60">Timeline</Link>
                    <Link href="/journal" className="transition-colors hover:text-foreground/80 text-foreground/60">Journal</Link>
                </nav>
            </div>
        </header>
    )
}
