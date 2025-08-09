import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="flex flex-col items-center justify-center py-6 md:py-8">
      <div className="flex items-center gap-3 text-3xl md:text-4xl font-bold text-primary transition-transform hover:scale-105">
        <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-accent" />
        <h1 className="font-headline tracking-tight">MediaSifter</h1>
      </div>
      <nav className="mt-4 flex gap-4 flex-wrap justify-center">
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary">Main App</Link>
        <Link href="/test" className="text-sm font-medium text-muted-foreground hover:text-primary">Manual GIF Editor</Link>
        <Link href="/test/auto" className="text-sm font-medium text-muted-foreground hover:text-primary">AI GIF Editor</Link>
        <Link href="/test2" className="text-sm font-medium text-muted-foreground hover:text-primary">Automatic Editor</Link>
      </nav>
    </header>
  );
}
