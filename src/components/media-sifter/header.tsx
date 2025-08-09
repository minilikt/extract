import { Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-center py-6 md:py-8">
      <div className="flex items-center gap-3 text-3xl md:text-4xl font-bold text-primary transition-transform hover:scale-105">
        <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-accent" />
        <h1 className="font-headline tracking-tight">MediaSifter</h1>
      </div>
    </header>
  );
}
