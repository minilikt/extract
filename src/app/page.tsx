"use client";

import { useState, useMemo, type ChangeEvent } from 'react';
import { extractMediaUrls } from '@/ai/flows/extract-media-urls';
import { useToast } from "@/hooks/use-toast";
import { Header } from '@/components/media-sifter/header';
import { Controls } from '@/components/media-sifter/controls';
import { MediaGrid } from '@/components/media-sifter/media-grid';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from '@/components/ui/pagination';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';


type CsvData = {
  headers: string[];
  rows: Record<string, string>[];
};

type MediaItem = {
  url: string;
  row: Record<string, string>;
  type: 'image' | 'gif';
};

type FilterType = 'all' | 'image' | 'gif';

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { toast } = useToast();

  const parseCsv = (csvText: string): CsvData => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error("CSV must have a header and at least one data row.");
    }
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      // This is a simple parser. It won't handle commas within quoted fields.
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i];
      });
      return row;
    });
    return { headers, rows };
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setSelectedItems(new Set());
    setCurrentPage(1);

    try {
      const fileContent = await file.text();
      const parsedData = parseCsv(fileContent);
      setCsvData(parsedData);
      
      const result = await extractMediaUrls({ csvData: fileContent });

      if (!result.mediaUrls || result.mediaUrls.length === 0) {
        toast({
          title: "No Media Found",
          description: "The AI could not extract any valid image or GIF URLs from the CSV.",
          variant: "destructive"
        });
        setMediaItems([]);
        return;
      }
      
      const newMediaItems: MediaItem[] = [];
      const seenUrls = new Set<string>();
      result.mediaUrls.forEach(url => {
        if (seenUrls.has(url)) return;
        const foundRow = parsedData.rows.find(row => Object.values(row).includes(url));
        if (foundRow) {
          const type = url.toLowerCase().endsWith('.gif') ? 'gif' : 'image';
          newMediaItems.push({ url, row: foundRow, type });
          seenUrls.add(url);
        }
      });
      setMediaItems(newMediaItems);

    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "An unexpected error occurred while processing the file.",
        variant: "destructive"
      });
      handleClear();
    } finally {
      setIsLoading(false);
      // Reset file input value to allow re-uploading the same file
      event.target.value = '';
    }
  };

  const handleSelectionChange = (url: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(url)) {
        newSelection.delete(url);
      } else {
        newSelection.add(url);
      }
      return newSelection;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === paginatedMediaItems.length) {
      setSelectedItems(new Set());
    } else {
       // Select only visible items on the current page
      const currentPageUrls = new Set(paginatedMediaItems.map(item => item.url));
      const newSelection = new Set(selectedItems);
      currentPageUrls.forEach(url => newSelection.add(url));
      setSelectedItems(newSelection);
    }
  };
  
  const selectAllInFile = () => {
    if (selectedItems.size === filteredMediaItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredMediaItems.map(item => item.url)));
    }
  };

  const handleDownload = async () => {
    if (selectedItems.size === 0) {
      toast({ title: "No items selected", description: "Please select images or GIFs to download." });
      return;
    }
    
    setIsDownloading(true);
    toast({ title: "Starting Download...", description: `Preparing ${selectedItems.size} files for download.` });

    const zip = new JSZip();
    let imageCounter = 1;
    const hasTitleHeader = csvData?.headers.includes('title');

    await Promise.all(Array.from(selectedItems).map(async (url) => {
      try {
        const mediaItem = mediaItems.find(item => item.url === url);
        if (!mediaItem) return;

        // Use our server-side proxy to fetch to avoid CORS issues.
        const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);

        const blob = await response.blob();
        
        const originalFileName = url.split('/').pop()?.split('?')[0] || 'download';
        let extension = originalFileName.split('.').pop() || 'jpg';
        if (extension.length > 4) { // handle cases with no extension
            const type = response.headers.get('content-type');
            if (type?.includes('jpeg') || type?.includes('jpg')) extension = 'jpg';
            else if (type?.includes('png')) extension = 'png';
            else if (type?.includes('gif')) extension = 'gif';
        }
        
        let newFileName;
        if (hasTitleHeader && mediaItem.row['title']) {
            newFileName = mediaItem.row['title'].replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\s/g, '_');
        } else {
            newFileName = `image-${imageCounter++}`;
        }
        
        zip.file(`${newFileName}.${extension}`, blob);

      } catch (error) {
        console.error(`Failed to download ${url}:`, error);
        toast({
          title: "Download Error",
          description: `Could not download ${url.substring(0, 50)}...`,
          variant: "destructive"
        });
      }
    }));
    
    if (Object.keys(zip.files).length > 0) {
        zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, "mediasifter-download.zip");
        });
        toast({ title: "Download Complete", description: `All selected files have been zipped for download.` });
    } else {
        toast({ title: "Download Failed", description: "Could not download any of the selected files." , variant: 'destructive'});
    }
    
    setIsDownloading(false);
  };
  
  const handleClear = () => {
    setCsvData(null);
    setMediaItems([]);
    setSelectedItems(new Set());
    setFileName(null);
    setCurrentPage(1);
  }

  const filteredMediaItems = useMemo(() => {
    if (filter === 'all') return mediaItems;
    return mediaItems.filter(item => item.type === filter);
  }, [mediaItems, filter]);

  const totalPages = Math.ceil(filteredMediaItems.length / ITEMS_PER_PAGE);

  const paginatedMediaItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredMediaItems.slice(startIndex, endIndex);
  }, [filteredMediaItems, currentPage]);
  
  // Reset page to 1 when filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [filter]);


  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <main className="container mx-auto px-4 min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex flex-col gap-8 pb-8">
        <Controls
          onFileChange={handleFileChange}
          onDownload={handleDownload}
          onClear={handleClear}
          isProcessing={isLoading || isDownloading}
          hasMedia={mediaItems.length > 0}
          selectedCount={selectedItems.size}
          totalCount={filteredMediaItems.length}
          visibleCount={paginatedMediaItems.length}
          filter={filter}
          onFilterChange={setFilter}
          fileName={fileName}
          selectAll={selectAll}
          selectAllInFile={selectAllInFile}
        />
        <MediaGrid
          items={paginatedMediaItems}
          selectedItems={selectedItems}
          onSelectionChange={handleSelectionChange}
          isLoading={isLoading}
        />
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none text-muted-foreground' : ''}
                />
              </PaginationItem>
              <PaginationItem>
                 <PaginationLink isActive>
                  Page {currentPage} of {totalPages}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none text-muted-foreground' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </main>
  );
}
