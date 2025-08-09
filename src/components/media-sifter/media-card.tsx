"use client";

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaCardProps {
  url: string;
  isSelected: boolean;
  onSelectionChange: (url: string) => void;
}

export function MediaCard({ url, isSelected, onSelectionChange }: MediaCardProps) {
    const [isLoading, setIsLoading] = useState(true);
    
    return (
        <div
            className={cn(
                "group relative aspect-square rounded-lg border-2 bg-card overflow-hidden transition-all duration-300 cursor-pointer shadow-md",
                isSelected ? 'border-primary scale-95 shadow-primary/40' : 'border-transparent hover:border-accent'
            )}
            onClick={() => onSelectionChange(url)}
        >
            {isLoading && <Skeleton className="w-full h-full" />}
            <Image
                src={url}
                alt="Extracted media"
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                className={cn(
                    "object-cover transition-transform duration-300",
                    isSelected ? 'scale-110' : 'group-hover:scale-110',
                    isLoading ? 'opacity-0' : 'opacity-100'
                )}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)} // Handle broken links
                unoptimized={url.endsWith('.gif')} // a little trick for gifs
            />
            <div className={cn(
                "absolute inset-0 bg-black/50 transition-opacity",
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )} />
            <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelectionChange(url)}
                className="absolute top-3 right-3 h-6 w-6 z-10 bg-background/50 border-white/50 data-[state=checked]:bg-primary"
                aria-label={`Select image ${url}`}
            />
        </div>
    );
}
