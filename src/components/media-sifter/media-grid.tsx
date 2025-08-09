"use client";

import { MediaCard } from './media-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Frown } from 'lucide-react';

type MediaItem = {
  url: string;
  row: Record<string, string>;
  type: 'image' | 'gif';
};

interface MediaGridProps {
  items: MediaItem[];
  selectedItems: Set<string>;
  onSelectionChange: (url: string) => void;
  isLoading: boolean;
}

export function MediaGrid({ items, selectedItems, onSelectionChange, isLoading }: MediaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-border rounded-lg p-12 h-full">
        <Frown className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">No Media to Display</h3>
        <p>Upload a CSV file to get started, or check your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in-50">
      {items.map((item, index) => (
        <MediaCard
          key={`${item.url}-${index}`}
          url={item.url}
          isSelected={selectedItems.has(item.url)}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </div>
  );
}
