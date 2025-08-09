"use client";

import type { ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileUp, Trash2, Loader2, CheckSquare, Square } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FilterType = 'all' | 'image' | 'gif';

interface ControlsProps {
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onClear: () => void;
  isProcessing: boolean;
  hasMedia: boolean;
  selectedCount: number;
  totalCount: number;
  visibleCount: number;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  fileName: string | null;
  selectAll: () => void;
  selectAllInFile: () => void;
}

export function Controls({
  onFileChange,
  onDownload,
  onClear,
  isProcessing,
  hasMedia,
  selectedCount,
  totalCount,
  visibleCount,
  filter,
  onFilterChange,
  fileName,
  selectAll,
  selectAllInFile,
}: ControlsProps) {
  return (
    <div className="p-4 bg-card rounded-lg border shadow-sm sticky top-4 z-10">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:w-auto">
          <label htmlFor="csv-upload" className="sr-only">Upload CSV</label>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <label className="cursor-pointer">
              <FileUp className="mr-2 h-4 w-4" />
              {fileName ? 'Upload New' : 'Upload CSV'}
              <Input id="csv-upload" type="file" accept=".csv" onChange={onFileChange} className="hidden" disabled={isProcessing} />
            </label>
          </Button>
        </div>

        {hasMedia && (
          <>
            <div className="flex-grow flex flex-col sm:flex-row gap-2 items-center justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      {selectedCount === totalCount && totalCount > 0 ? <CheckSquare className="mr-2" /> : <Square className="mr-2" />}
                      <span>{selectedCount} / {totalCount} selected</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={selectAll}>Select page ({visibleCount})</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectAllInFile()}>
                      {selectedCount === totalCount ? 'Deselect all' : `Select all (${totalCount})`}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <Tabs value={filter} onValueChange={(value) => onFilterChange(value as FilterType)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="image">Images</TabsTrigger>
                <TabsTrigger value="gif">GIFs</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2">
                <Button onClick={onDownload} disabled={isProcessing || selectedCount === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download ({selectedCount})
                </Button>
                
                <Button onClick={onClear} variant="destructive" size="icon" aria-label="Clear all">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
          </>
        )}
      </div>
       {fileName && <p className="text-sm text-muted-foreground mt-2 text-center md:text-left">File: {fileName}</p>}
    </div>
  );
}
