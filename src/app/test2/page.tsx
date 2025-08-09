
"use client";

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/media-sifter/header';
import { Download, Loader2, FileUp, Wand2, Trash2 } from 'lucide-react';
import { autoReplaceGif } from '@/ai/flows/auto-replace-gif';
import { useToast } from "@/hooks/use-toast";
import { saveAs } from 'file-saver';
import JSZip from 'jszip';


type GifFile = {
  id: string;
  name: string;
  originalSrc: string;
  processedSrc: string | null;
  isLoading: boolean;
}

export default function AutoTestPage2() {
  const [gifFiles, setGifFiles] = useState<GifFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newGifFiles: GifFile[] = [];
      let filePromises = files.map(file => {
        return new Promise<GifFile>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              id: `${file.name}-${Date.now()}`,
              name: file.name,
              originalSrc: event.target?.result?.toString() || '',
              processedSrc: null,
              isLoading: false,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(results => {
        setGifFiles(prev => [...prev, ...results]);
      });
    }
    // Reset file input to allow re-uploading
    e.target.value = '';
  }

  async function handleProcessAll() {
    if (gifFiles.length === 0) {
      toast({ title: 'No GIFs uploaded', description: 'Please upload one or more GIF files.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    toast({ title: 'Processing started...', description: `Automatically editing ${gifFiles.length} GIFs.` });

    const processingPromises = gifFiles.map(async (file) => {
      // Set loading state for the individual file
      setGifFiles(prev => prev.map(f => f.id === file.id ? { ...f, isLoading: true } : f));
      
      try {
        const result = await autoReplaceGif({ gifDataUri: file.originalSrc });
        if (result.processedGifDataUri) {
          return { ...file, processedSrc: result.processedGifDataUri, isLoading: false };
        } else {
          throw new Error("Processing returned no data.");
        }
      } catch (error) {
        console.error(`Error processing GIF ${file.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: `Processing Failed for ${file.name}`, description: `${errorMessage}`, variant: "destructive" });
        return { ...file, isLoading: false }; // Return original file data on error, stop loading
      }
    });

    const results = await Promise.all(processingPromises);
    setGifFiles(results);
    
    setIsProcessing(false);
    toast({ title: 'Success!', description: 'All GIFs have been processed.' });
  }

  function handleDownloadAll() {
    const processedGifs = gifFiles.filter(f => f.processedSrc);
    if (processedGifs.length === 0) {
        toast({ title: 'No processed GIFs', description: 'Process some GIFs first.', variant: 'destructive' });
        return;
    }

    if (processedGifs.length === 1) {
        saveAs(processedGifs[0].processedSrc!, `processed-${processedGifs[0].name}`);
    } else {
        const zip = new JSZip();
        processedGifs.forEach(file => {
            const base64Data = file.processedSrc!.split(';base64,').pop();
            if(base64Data) {
              zip.file(`processed-${file.name}`, base64Data, { base64: true });
            }
        });
        zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, "processed-gifs.zip");
        });
    }
  }

  const handleClearAll = () => {
    setGifFiles([]);
  }

  const processedCount = gifFiles.filter(f => f.processedSrc).length;

  return (
    <main className="container mx-auto px-4 min-h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex flex-col gap-8 pb-8 items-center">
        <div className="p-6 bg-card rounded-lg border shadow-sm w-full max-w-2xl space-y-4 sticky top-4 z-10">
            <h2 className="text-xl font-semibold text-center">Automatic Logo & Text Remover</h2>
            <p className="text-sm text-muted-foreground text-center">Upload multiple GIFs. The AI will find the most prominent logo or text in each one and remove it automatically.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline">
                    <label className="cursor-pointer">
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload GIFs
                        <Input id="gif-upload" type="file" accept="image/gif" onChange={onFileChange} multiple className="hidden" disabled={isProcessing} />
                    </label>
                </Button>
                <Button onClick={handleProcessAll} disabled={isProcessing || gifFiles.length === 0}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Process All ({gifFiles.length})
                </Button>
                <Button onClick={handleDownloadAll} disabled={isProcessing || processedCount === 0} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download All ({processedCount})
                </Button>
                {gifFiles.length > 0 && (
                    <Button onClick={handleClearAll} variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Clear All</span>
                    </Button>
                )}
            </div>
        </div>

        {gifFiles.length > 0 && (
          <div className="w-full max-w-6xl space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-4 text-center">Original GIFs</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gifFiles.map((file) => (
                      <div key={file.id} className="p-2 bg-card rounded-lg border shadow-sm flex flex-col items-center justify-center gap-2">
                          <img src={file.originalSrc} alt={`Original ${file.name}`} className="max-w-full max-h-48 rounded" />
                          <p className="text-xs text-muted-foreground truncate w-full text-center">{file.name}</p>
                      </div>
                  ))}
              </div>
            </section>
            
            <section>
              <h3 className="text-2xl font-bold mb-4 text-center">Processed GIFs</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {gifFiles.map((file) => (
                      <div key={`processed-${file.id}`} className="p-2 bg-card rounded-lg border shadow-sm flex flex-col items-center justify-center gap-2 min-h-[10rem]">
                         {(isProcessing && file.isLoading) ? (
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                         ) : file.processedSrc ? (
                           <img src={file.processedSrc} alt={`Processed ${file.name}`} className="max-w-full max-h-48 rounded" />
                         ) : (
                           <p className="text-muted-foreground text-center text-sm">Waiting for processing...</p>
                         )}
                         <p className="text-xs text-muted-foreground truncate w-full text-center">{file.name}</p>
                      </div>
                  ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
