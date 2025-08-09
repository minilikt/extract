'use server';

/**
 * @fileOverview Cuts out a selected section of an animated GIF, making it transparent.
 *
 * - cropGif - A function that handles the GIF cutout process.
 * - CropGifInput - The input type for the cropGif function.
 * - CropGifOutput - The return type for the cropGif function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import sharp from 'sharp';

const CropGifInputSchema = z.object({
  gifDataUri: z
    .string()
    .describe(
      "An animated GIF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/gif;base64,<encoded_data>'."
    ),
  crop: z.object({
    x: z.number().describe('The x-coordinate of the top-left corner of the cutout area.'),
    y: z.number().describe('The y-coordinate of the top-left corner of the cutout area.'),
    width: z.number().describe('The width of the cutout area.'),
    height: z.number().describe('The height of the cutout area.'),
  }),
});
export type CropGifInput = z.infer<typeof CropGifInputSchema>;

const CropGifOutputSchema = z.object({
  croppedGifDataUri: z.string().describe('The processed GIF with the cutout as a data URI.'),
});
export type CropGifOutput = z.infer<typeof CropGifOutputSchema>;


export async function cropGif(input: CropGifInput): Promise<CropGifOutput> {
  return cropGifFlow(input);
}

const cropGifFlow = ai.defineFlow(
  {
    name: 'cropGifFlow',
    inputSchema: CropGifInputSchema,
    outputSchema: CropGifOutputSchema,
  },
  async (input) => {
    try {
      const { gifDataUri, crop } = input;
      
      const base64Data = gifDataUri.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Invalid Data URI format.');
      }
      const inputBuffer = Buffer.from(base64Data, 'base64');
      
      const cutoutMask = await sharp({
        create: {
          width: crop.width,
          height: crop.height,
          channels: 4, 
          background: { r: 0, g: 0, b: 0, alpha: 1 } 
        }
      }).png().toBuffer();

      const processedBuffer = await sharp(inputBuffer, { animated: true })
        .composite([
          {
            input: cutoutMask,
            left: crop.x,
            top: crop.y,
            blend: 'dest-out'
          }
        ])
        .gif()
        .toBuffer();

      const croppedGifDataUri = `data:image/gif;base64,${processedBuffer.toString('base64')}`;

      return { croppedGifDataUri };

    } catch (error) {
        console.error("Error in cropGifFlow:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to process GIF: ${error.message}`);
        }
        throw new Error('An unknown error occurred during GIF processing.');
    }
  }
);
