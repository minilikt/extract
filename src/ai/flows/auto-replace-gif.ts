
'use server';

/**
 * @fileOverview Automatically detects and replaces a logo or text in a GIF.
 *
 * - autoReplaceGif - A function that handles the automated detection and replacement.
 * - AutoReplaceGifInput - The input type for the function.
 * - AutoReplaceGifOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { replaceGifSection, type ReplaceGifSectionInput } from './replace-gif-section';
import gifFrames from 'gif-frames';
import { Readable } from 'stream';

// 1. Define Input and Output Schemas
const AutoReplaceGifInputSchema = z.object({
  gifDataUri: z
    .string()
    .describe(
      "An animated GIF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/gif;base64,<encoded_data>'"
    ),
});
export type AutoReplaceGifInput = z.infer<typeof AutoReplaceGifInputSchema>;

const AutoReplaceGifOutputSchema = z.object({
  processedGifDataUri: z.string().describe('The processed GIF as a data URI.'),
});
export type AutoReplaceGifOutput = z.infer<typeof AutoReplaceGifOutputSchema>;

const BoundingBoxSchema = z.object({
    x: z.number().describe('The x-coordinate of the top-left corner of the bounding box.'),
    y: z.number().describe('The y-coordinate of the top-left corner of the bounding box.'),
    width: z.number().describe('The width of the bounding box.'),
    height: z.number().describe('The height of the bounding box.'),
});

// Helper to convert a Readable stream to a Buffer
function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

// 2. Define the main exported function
export async function autoReplaceGif(input: AutoReplaceGifInput): Promise<AutoReplaceGifOutput> {
  return autoReplaceFlow(input);
}


// 3. Define the AI Prompt for detection
const detectionPrompt = ai.definePrompt({
  name: 'autoGifRegionDetectorPrompt',
  input: { 
    schema: z.object({
      gifFrameDataUri: z.string(),
    })
  },
  output: { schema: BoundingBoxSchema },
  prompt: `You are an expert at analyzing images and identifying regions to remove.
    
    Analyze the provided image frame from a GIF. Your task is to find the most prominent logo, watermark, or piece of text in the image.
    
    Identify the bounding box of the area to be removed. Provide the precise x and y coordinates of the top-left corner, and the width and height of this area. If there is no obvious logo or text to remove, you can return a bounding box with width and height of 0.
    
    Image: {{media url=gifFrameDataUri}}`,
});


// 4. Define the main Genkit Flow
const autoReplaceFlow = ai.defineFlow(
  {
    name: 'autoReplaceFlow',
    inputSchema: AutoReplaceGifInputSchema,
    outputSchema: AutoReplaceGifOutputSchema,
  },
  async (input) => {
    // Step 1: Extract the first frame of the GIF to send to the multimodal model.
    const base64Data = input.gifDataUri.split(';base64,').pop();
    if (!base64Data) {
      throw new Error('Invalid Data URI format.');
    }
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    const frameData = await gifFrames({ url: inputBuffer, frames: 0, outputType: 'png' });
    const firstFrameBuffer = await streamToBuffer(frameData[0].getImage());
    const firstFrameDataUri = `data:image/png;base64,${firstFrameBuffer.toString('base64')}`;

    // Step 2: Call the AI prompt to get the bounding box for replacement.
    const { output: boundingBox } = await detectionPrompt({
        gifFrameDataUri: firstFrameDataUri,
    });
    
    if (!boundingBox) {
        throw new Error("AI failed to detect a region to replace.");
    }

    if (boundingBox.width === 0 || boundingBox.height === 0) {
        // If the AI decides there's nothing to replace, just return the original.
        return { processedGifDataUri: input.gifDataUri };
    }

    // Step 3: Call the existing replacement flow with the detected coordinates.
    const replacementInput: ReplaceGifSectionInput = {
        gifDataUri: input.gifDataUri,
        replacementArea: {
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
        }
    };

    const result = await replaceGifSection(replacementInput);

    return { processedGifDataUri: result.processedGifDataUri };
  }
);
