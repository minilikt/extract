'use server';

/**
 * @fileOverview Crops an animated GIF.
 *
 * - cropGif - A function that handles the GIF cropping process.
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
    x: z.number().describe('The x-coordinate of the top-left corner of the crop area.'),
    y: z.number().describe('The y-coordinate of the top-left corner of the crop area.'),
    width: z.number().describe('The width of the crop area.'),
    height: z.number().describe('The height of the crop area.'),
  }),
});
export type CropGifInput = z.infer<typeof CropGifInputSchema>;

const CropGifOutputSchema = z.object({
  croppedGifDataUri: z.string().describe('The cropped GIF as a data URI.'),
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
      
      // 1. Decode the Data URI
      const base64Data = gifDataUri.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Invalid Data URI format.');
      }
      const inputBuffer = Buffer.from(base64Data, 'base64');
      
      // 2. Crop the image using sharp
      const croppedBuffer = await sharp(inputBuffer, { animated: true })
        .extract({
          left: crop.x,
          top: crop.y,
          width: crop.width,
          height: crop.height,
        })
        .toBuffer();

      // 3. Encode the result back to a Data URI
      const croppedGifDataUri = `data:image/gif;base64,${croppedBuffer.toString('base64')}`;

      return { croppedGifDataUri };

    } catch (error) {
        console.error("Error in cropGifFlow:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to crop GIF: ${error.message}`);
        }
        throw new Error('An unknown error occurred during GIF cropping.');
    }
  }
);
