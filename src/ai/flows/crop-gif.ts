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

const cropGifPrompt = ai.definePrompt({
    name: 'cropGifPrompt',
    input: { schema: CropGifInputSchema },
    output: { schema: CropGifOutputSchema },
    prompt: `You are an expert image editor specializing in animated GIFs. Your task is to crop the provided GIF according to the specified dimensions.

Crop the following GIF:
{{media url=gifDataUri}}

Crop dimensions (in pixels):
- X: {{{crop.x}}}
- Y: {{{crop.y}}}
- Width: {{{crop.width}}}
- Height: {{{crop.height}}}

Instructions:
1.  Precisely crop the GIF to the given dimensions.
2.  Preserve the animation and all frames of the original GIF.
3.  Ensure the output is a valid, animated GIF.
4.  Return the result as a data URI.`,
});

const cropGifFlow = ai.defineFlow(
  {
    name: 'cropGifFlow',
    inputSchema: CropGifInputSchema,
    outputSchema: CropGifOutputSchema,
  },
  async (input) => {
    const llmResponse = await cropGifPrompt(input);
    const output = llmResponse.output;
    if (!output) {
      throw new Error('Failed to get a response from the model.');
    }
    return { croppedGifDataUri: output.croppedGifDataUri };
  }
);
