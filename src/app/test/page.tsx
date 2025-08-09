"use client";

import { useState, useRef, type ChangeEvent } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/media-sifter/header';
import { Download, Loader2 } from 'lucide-react';
import { cropGif } from '@/ai/flows/crop-gif';
import { useToast } from "@/hooks/use-toast";
import { saveAs } from 'file-saver';

import 'react-image-crop/dist/ReactCrop.css';

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export default function TestPage() {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [processedGif, setProcessedGif] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  const aspect = 1;

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      setProcessedGif(null);
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }

  async function handleProcess() {
    if (!completedCrop || !imgRef.current) {
      toast({ title: 'No area selected', description: 'Please select an area to cut out.', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    setProcessedGif(null);
    
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const cropData = {
      x: Math.round(completedCrop.x * scaleX),
      y: Math.round(completedCrop.y * scaleY),
      width: Math.round(completedCrop.width * scaleX),
      height: Math.round(completedCrop.height * scaleY),
    };

    try {
      const result = await cropGif({
        gifDataUri: imgSrc,
        crop: cropData,
      });
      if (result.croppedGifDataUri) {
          setProcessedGif(result.croppedGifDataUri);
          toast({ title: 'Success!', description: 'Your GIF has been processed.' });
      } else {
        throw new Error("Processing returned no data.");
      }
    } catch (error) {
      console.error("Error processing GIF:", error);
      toast({ title: "Processing Failed", description: "Could not process the GIF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownloadProcessed() {
    if (!processedGif) return;
    saveAs(processedGif, 'processed.gif');
  }

  return (
    <main className="container mx-auto px-4 min-h-screen flex flex-col">
       <Header />
      <div className="flex-grow flex flex-col gap-8 pb-8 items-center">
        <div className="p-4 bg-card rounded-lg border shadow-sm w-full max-w-md">
            <div className="flex flex-col gap-4 items-center">
                <Input type="file" accept="image/gif" onChange={onFileChange} />
            </div>
        </div>

        {imgSrc && (
          <div className="grid md:grid-cols-2 gap-8 items-start w-full">
            <div className="flex flex-col gap-4 items-center">
                <h2 className="text-2xl font-bold">Original</h2>
                <div className="p-4 bg-card rounded-lg border shadow-sm">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                    >
                        <img
                        ref={imgRef}
                        alt="Crop me"
                        src={imgSrc}
                        onLoad={onImageLoad}
                        className="max-w-full max-h-[50vh]"
                        />
                    </ReactCrop>
                </div>
                <Button onClick={handleProcess} disabled={isLoading || !completedCrop}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cutout Selection
                </Button>
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
        )}
      </div>
    </main>
  );
}
