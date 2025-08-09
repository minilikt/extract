
"use client";

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/media-sifter/header';
import { Download, Loader2, FileUp } from 'lucide-react';
import { autoReplaceGif } from '@/ai/flows/auto-replace-gif';
import { useToast } from "@/hooks/use-toast";
import { saveAs } from 'file-saver';


export default function AutoTestPage2() {
  const [imgSrc, setImgSrc] = useState('');
  const [processedGif, setProcessedGif] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setProcessedGif(null);
      const reader = new FileReader();
      reader.addEventListener('load', async (event) => {
        const dataUri = event.target?.result?.toString() || '';
        setImgSrc(dataUri);
        
        if (dataUri) {
          setIsLoading(true);
          try {
            const result = await autoReplaceGif({ gifDataUri: dataUri });
      
            if (result.processedGifDataUri) {
                setProcessedGif(result.processedGifDataUri);
                toast({ title: 'Success!', description: 'Your GIF has been automatically processed.' });
            } else {
              throw new Error("Processing returned no data.");
            }
          } catch (error) {
            console.error("Error processing GIF:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ title: "Processing Failed", description: `Could not process the GIF. ${errorMessage}`, variant: "destructive" });
          } finally {
            setIsLoading(false);
          }
        }
      });
      reader.readAsDataURL(file);
    }
    // Reset file input to allow re-uploading the same file
    e.target.value = '';
  }

  function handleDownloadProcessed() {
    if (!processedGif) return;
    saveAs(processedGif, 'processed-auto-2.gif');
  }

  return (
    <main className="container mx-auto px-4 min-h-screen flex flex-col">
       <Header />
      <div className="flex-grow flex flex-col gap-8 pb-8 items-center">
        <div className="p-6 bg-card rounded-lg border shadow-sm w-full max-w-lg space-y-6">
            <div className="space-y-2 text-center">
                <Label htmlFor="gif-upload">Upload a GIF to automatically replace the most prominent logo or text.</Label>
                <Button asChild variant="outline">
                    <label className="cursor-pointer flex items-center justify-center">
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload GIF
                        <Input id="gif-upload" type="file" accept="image/gif" onChange={onFileChange} className="hidden" disabled={isLoading} />
                    </label>
                </Button>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start w-full max-w-4xl">
            <div className="flex flex-col gap-4 items-center">
                <h2 className="text-2xl font-bold">Original</h2>
                <div className="p-4 bg-card rounded-lg border shadow-sm w-full h-[300px] flex items-center justify-center">
                    {isLoading && !imgSrc && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
                    {imgSrc ? (
                        <img src={imgSrc} alt="Original GIF" className="max-w-full max-h-full" />
                    ): (
                       !isLoading && <p className="text-muted-foreground">Upload a GIF to see it here</p>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-4 items-center">
                <h2 className="text-2xl font-bold">Processed</h2>
                <div className="p-4 bg-card rounded-lg border shadow-sm w-full h-[300px] flex items-center justify-center">
                    {isLoading && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
                    {!isLoading && processedGif && <img alt="Processed GIF" src={processedGif} className="max-w-full max-h-full" />}
                    {!isLoading && !processedGif && <p className="text-muted-foreground">Processed version will appear here</p>}
                </div>
                {!isLoading && processedGif && (
                  <Button onClick={handleDownloadProcessed} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Processed GIF
                  </Button>
                )}
            </div>
          </div>
      </div>
    </main>
  );
}
