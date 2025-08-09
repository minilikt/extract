
'use server';

/**
 * @fileOverview Replaces a specified color in an animated GIF with another color.
 *
 * - replaceGifColor - A function that handles the GIF color replacement process.
 * - ReplaceGifColorInput - The input type for the function.
 * - ReplaceGifColorOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import sharp from 'sharp';
import gifFrames from 'gif-frames';
import GifEncoder from 'gif-encoder-2';
import { Readable } from 'stream';
import * as colorDiff from 'color-diff';

const ColorSchema = z.object({
  R: z.number().min(0).max(255),
  G: z.number().min(0).max(255),
  B: z.number().min(0).max(255),
});

const ReplaceGifColorInputSchema = z.object({
  gifDataUri: z
    .string()
    .describe(
      "An animated GIF, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  sourceColor: ColorSchema,
  targetColor: ColorSchema,
  fuzz: z.number().min(0).max(100).default(20).describe('The tolerance for color matching (0-100).'),
});
export type ReplaceGifColorInput = z.infer<typeof ReplaceGifColorInputSchema>;

const ReplaceGifColorOutputSchema = z.object({
  processedGifDataUri: z.string().describe('The processed GIF as a data URI.'),
});
export type ReplaceGifColorOutput = z.infer<typeof ReplaceGifColorOutputSchema>;

// Helper to convert a Readable stream to a Buffer
function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function replaceGifColor(input: ReplaceGifColorInput): Promise<ReplaceGifColorOutput> {
  return replaceGifColorFlow(input);
}

const replaceGifColorFlow = ai.defineFlow(
  {
    name: 'replaceGifColorFlow',
    inputSchema: ReplaceGifColorInputSchema,
    outputSchema: ReplaceGifColorOutputSchema,
  },
  async (input) => {
    try {
      const { gifDataUri, sourceColor, targetColor, fuzz } = input;
      
      const base64Data = gifDataUri.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Invalid Data URI format.');
      }
      const inputBuffer = Buffer.from(base64Data, 'base64');
      
      const frameData = await gifFrames({ url: inputBuffer, frames: 'all', outputType: 'png', cumulative: true });

      const firstFrameBuffer = await streamToBuffer(frameData[0].getImage());
      const metadata = await sharp(firstFrameBuffer).metadata();
      const { width, height } = metadata;

      if (!width || !height) {
          throw new Error("Could not determine GIF dimensions.");
      }

      const encoder = new GifEncoder(width, height, 'octree');
      encoder.start();
      encoder.setRepeat(0); 
      encoder.setDelay(frameData[0].frameInfo.delay * 10); // Use delay from first frame
      encoder.setQuality(10); 
      
      for (const frame of frameData) {
        const frameBuffer = await streamToBuffer(frame.getImage());
        // Ensure frame has alpha channel for consistency
        const rawBuffer = await sharp(frameBuffer).ensureAlpha().raw().toBuffer();
        
        for (let i = 0; i < rawBuffer.length; i += 4) {
            const r = rawBuffer[i];
            const g = rawBuffer[i + 1];
            const b = rawBuffer[i + 2];
            // alpha channel is rawBuffer[i+3] - we ignore it for color diff but preserve it.

            const colorDifference = colorDiff.diff(sourceColor, { R: r, G: g, B: b });

            if (colorDifference < fuzz) {
                rawBuffer[i] = targetColor.R;
                rawBuffer[i+1] = targetColor.G;
                rawBuffer[i+2] = targetColor.B;
            }
        }
        
        encoder.addFrame(rawBuffer);
        encoder.setDelay(frame.frameInfo.delay * 10);
      }

      encoder.finish();
      const processedBuffer = encoder.out.getData();
      
      const processedGifDataUri = `data:image/gif;base64,${processedBuffer.toString('base64')}`;

      return { processedGifDataUri };

    } catch (error) {
        console.error("Error in replaceGifColorFlow:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to process GIF: ${error.message}`);
        }
        throw new Error('An unknown error occurred during GIF processing.');
    }
  }
);
