'use server';

/**
 * @fileOverview Replaces a selected section of an animated GIF with a white box.
 *
 * - replaceGifSection - A function that handles the GIF modification process.
 * - ReplaceGifSectionInput - The input type for the replaceGifSection function.
 * - ReplaceGifSectionOutput - The return type for the replaceGifSection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import sharp from 'sharp';
import gifFrames from 'gif-frames';
import GifEncoder from 'gif-encoder-2';
import { Readable } from 'stream';

export const ReplaceGifSectionInputSchema = z.object({
  gifDataUri: z
    .string()
    .describe(
      "An animated GIF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/gif;base64,<encoded_data>'"
    ),
  replacementArea: z.object({
    x: z.number().describe('The x-coordinate of the top-left corner of the area to replace.'),
    y: z.number().describe('The y-coordinate of the top-left corner of the area to replace.'),
    width: z.number().describe('The width of the area to replace.'),
    height: z.number().describe('The height of the area to replace.'),
  }),
});
export type ReplaceGifSectionInput = z.infer<typeof ReplaceGifSectionInputSchema>;

const ReplaceGifSectionOutputSchema = z.object({
  processedGifDataUri: z.string().describe('The processed GIF as a data URI.'),
});
export type ReplaceGifSectionOutput = z.infer<typeof ReplaceGifSectionOutputSchema>;

// Helper to convert a Readable stream to a Buffer
function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}


export async function replaceGifSection(input: ReplaceGifSectionInput): Promise<ReplaceGifSectionOutput> {
  return replaceGifSectionFlow(input);
}

const replaceGifSectionFlow = ai.defineFlow(
  {
    name: 'replaceGifSectionFlow',
    inputSchema: ReplaceGifSectionInputSchema,
    outputSchema: ReplaceGifSectionOutputSchema,
  },
  async (input) => {
    try {
      const { gifDataUri, replacementArea } = input;
      
      const base64Data = gifDataUri.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Invalid Data URI format.');
      }
      const inputBuffer = Buffer.from(base64Data, 'base64');
      
      const whiteRectangle = Buffer.from(
        `<svg><rect x="0" y="0" width="${replacementArea.width}" height="${replacementArea.height}" fill="white" /></svg>`
      );

      const frameData = await gifFrames({ url: inputBuffer, frames: 'all', outputType: 'png', cumulative: true });

      const firstFrameBuffer = await streamToBuffer(frameData[0].getImage());
      const { width, height } = await sharp(firstFrameBuffer).metadata();

      const encoder = new GifEncoder(width!, height!);
      encoder.start();
      encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
      encoder.setDelay(100); // frame delay in ms
      encoder.setQuality(10); // image quality. 10 is default.
      
      for (const frame of frameData) {
        const frameBuffer = await streamToBuffer(frame.getImage());
        const modifiedFrameBuffer = await sharp(frameBuffer)
            .composite([
                {
                    input: whiteRectangle,
                    top: replacementArea.y,
                    left: replacementArea.x,
                },
            ])
            .raw()
            .toBuffer();
        
        const pixels = new Uint8ClampedArray(modifiedFrameBuffer);
        encoder.addFrame(pixels as any);
      }

      encoder.finish();
      const processedBuffer = encoder.out.getData();
      
      const processedGifDataUri = `data:image/gif;base64,${processedBuffer.toString('base64')}`;

      return { processedGifDataUri };

    } catch (error) {
        console.error("Error in replaceGifSectionFlow:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to process GIF: ${error.message}`);
        }
        throw new Error('An unknown error occurred during GIF processing.');
    }
  }
);
