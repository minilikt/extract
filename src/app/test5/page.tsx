
"use client";

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/media-sifter/header';
import { Download, Loader2, Wand2, FileUp, Trash2 } from 'lucide-react';
import { replaceGifColor } from '@/ai/flows/replace-gif-color';
import { useToast } from "@/hooks/use-toast";
import { saveAs } from 'file-saver';
import { Slider } from '@/components/ui/slider';
import JSZip from 'jszip';

type GifFile = {
  id: string;
  name: string;
  originalSrc: string;
  processedSrc: string | null;
  isLoading: boolean;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        R: parseInt(result[1], 16),
        G: parseInt(result[2], 16),
        B: parseInt(result[3], 16),
      }
    : { R: 0, G: 0, B: 0};
};

export default function ColorReplacerTestPage() {
  const [gifFiles, setGifFiles] = useState<GifFile[]>([]);
  const [sourceColor, setSourceColor] = useState('#ff0000'); // Default to red
  const [targetColor, setTargetColor] = useState('#0000ff'); // Default to blue
  const [fuzz, setFuzz] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
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

  async function handleProcess() {
    if (gifFiles.length === 0) {
      toast({ title: 'No GIFs uploaded', description: 'Please upload one or more GIF files.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    toast({ title: 'Processing started...', description: `Replacing colors for ${gifFiles.length} GIFs.` });

    for (const file of gifFiles) {
        if (file.processedSrc) continue;

        setGifFiles(prev => prev.map(f => f.id === file.id ? { ...f, isLoading: true } : f));

        try {
            const result = await replaceGifColor({
                gifDataUri: file.originalSrc,
                sourceColor: hexToRgb(sourceColor),
                targetColor: hexToRgb(targetColor),
                fuzz: fuzz
            });

            if (result.processedGifDataUri) {
                setGifFiles(prev => prev.map(f => f.id === file.id ? { ...f, processedSrc: result.processedGifDataUri, isLoading: false } : f));
            } else {
                throw new Error("Processing returned no data.");
            }
        } catch (error) {
            console.error(`Error processing GIF ${file.name}:`, error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ title: `Processing Failed for ${file.name}`, description: `${errorMessage}`, variant: "destructive" });
            setGifFiles(prev => prev.map(f => f.id === file.id ? { ...f, isLoading: false } : f));
        }
    }
    
    setIsLoading(false);
    toast({ title: 'Success!', description: 'All GIFs have been processed.' });
  }

  function handleDownloadProcessed() {
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

  const handleClear = () => {
    setGifFiles([]);
  }

  const processedCount = gifFiles.filter(f => f.processedSrc).length;

  return (
    <main className="container mx-auto px-4 min-h-screen flex flex-col">
       <Header />
      <div className="flex-grow flex flex-col gap-8 pb-8 items-center">
        <div className="p-6 bg-card rounded-lg border shadow-sm w-full max-w-2xl space-y-6 sticky top-4 z-10">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                    <label className="cursor-pointer">
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload GIFs
                        <Input id="gif-upload" type="file" accept="image/gif" onChange={onFileChange} multiple className="hidden" />
                    </label>
                </Button>
                 {gifFiles.length > 0 && (
                     <Button onClick={handleClear} variant="destructive" size="icon" className="w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Clear All</span>
                     </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="source-color">1. Color to Replace</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="source-color" 
                      type="color" 
                      value={sourceColor} 
                      onChange={(e) => setSourceColor(e.target.value)}
                      className="h-10 w-12 p-1"
                    />
                    <Input
                      type="text"
                      value={sourceColor}
                      onChange={(e) => setSourceColor(e.target.value)}
                      className="h-10 flex-1"
                      aria-label="Source color hex value"
                    />
                  </div>
              </div>
               <div className="space-y-2">
                  <Label htmlFor="target-color">2. New Color</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="target-color" 
                      type="color" 
                      value={targetColor}
                      onChange={(e) => setTargetColor(e.target.value)}
                      className="h-10 w-12 p-1"
                    />
                    <Input
                      type="text"
                      value={targetColor}
                      onChange={(e) => setTargetColor(e.target.value)}
                      className="h-10 flex-1"
                      aria-label="Target color hex value"
                    />
                  </div>
              </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="fuzz-slider">3. Color Tolerance ({fuzz})</Label>
                 <Slider
                    id="fuzz-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={[fuzz]}
                    onValueChange={(value) => setFuzz(value[0])}
                />
                <p className="text-xs text-muted-foreground">A higher value means more shades of the color will be replaced.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleProcess} disabled={isLoading || gifFiles.length === 0} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Replace Color in {gifFiles.length > 0 ? `${gifFiles.length} GIFs` : ''}
              </Button>
              <Button onClick={handleDownloadProcessed} disabled={isLoading || processedCount === 0} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download ({processedCount})
              </Button>
            </div>
        </div>

        {gifFiles.length > 0 && (
          <div className="w-full max-w-6xl space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-center">Original GIFs</h2>
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
              <h2 className="text-2xl font-bold mb-4 text-center">Processed GIFs</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {gifFiles.map((file) => (
                      <div key={`processed-${file.id}`} className="p-2 bg-card rounded-lg border shadow-sm flex flex-col items-center justify-center gap-2 min-h-[10rem]">
                         {file.isLoading ? (
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
