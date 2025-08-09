
"use client";

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/media-sifter/header';
import { Download, Loader2, Wand2 } from 'lucide-react';
import { replaceGifColor } from '@/ai/flows/replace-gif-color';
import { useToast } from "@/hooks/use-toast";
import { saveAs } from 'file-saver';
import { Slider } from '@/components/ui/slider';

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
  const [imgSrc, setImgSrc] = useState('');
  const [sourceColor, setSourceColor] = useState('#ff0000'); // Default to red
  const [targetColor, setTargetColor] = useState('#0000ff'); // Default to blue
  const [fuzz, setFuzz] = useState(20);
  const [processedGif, setProcessedGif] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setProcessedGif(null);
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  async function handleProcess() {
    if (!imgSrc) {
      toast({ title: 'No GIF uploaded', description: 'Please upload a GIF file.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    setProcessedGif(null);

    try {
      const result = await replaceGifColor({
        gifDataUri: imgSrc,
        sourceColor: hexToRgb(sourceColor),
        targetColor: hexToRgb(targetColor),
        fuzz: fuzz
      });

      if (result.processedGifDataUri) {
          setProcessedGif(result.processedGifDataUri);
          toast({ title: 'Success!', description: 'Your GIF has been processed.' });
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

  function handleDownloadProcessed() {
    if (!processedGif) return;
    saveAs(processedGif, 'processed-color.gif');
  }

  return (
    <main className="container mx-auto px-4 min-h-screen flex flex-col">
       <Header />
      <div className="flex-grow flex flex-col gap-8 pb-8 items-center">
        <div className="p-6 bg-card rounded-lg border shadow-sm w-full max-w-lg space-y-6">
            <div className="space-y-2">
                <Label htmlFor="gif-upload">1. Upload GIF</Label>
                <Input id="gif-upload" type="file" accept="image/gif" onChange={onFileChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="source-color">2. Color to Replace</Label>
                  <Input 
                    id="source-color" 
                    type="color" 
                    value={sourceColor} 
                    onChange={(e) => setSourceColor(e.target.value)}
                    className="h-12"
                   />
              </div>
               <div className="space-y-2">
                  <Label htmlFor="target-color">3. New Color</Label>
                  <Input 
                    id="target-color" 
                    type="color" 
                    value={targetColor}
                    onChange={(e) => setTargetColor(e.target.value)}
                    className="h-12"
                   />
              </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="fuzz-slider">4. Color Tolerance ({fuzz})</Label>
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

            <Button onClick={handleProcess} disabled={isLoading || !imgSrc} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Replace Color
            </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start w-full max-w-4xl">
            <div className="flex flex-col gap-4 items-center">
                <h2 className="text-2xl font-bold">Original</h2>
                <div className="p-4 bg-card rounded-lg border shadow-sm w-full h-[300px] flex items-center justify-center">
                    {imgSrc ? (
                        <img src={imgSrc} alt="Original GIF" className="max-w-full max-h-full" />
                    ): (
                        <p className="text-muted-foreground">Upload a GIF to see it here</p>
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
