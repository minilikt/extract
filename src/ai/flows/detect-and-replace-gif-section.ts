'use server';

/**
 * @fileOverview Detects a region in a GIF based on a text prompt and replaces it with a white box.
 *
 * - detectAndReplaceGifSection - A function that handles the automated detection and replacement.
 * - DetectAndReplaceGifSectionInput - The input type for the function.
 * - DetectAndReplaceGifSectionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { replaceGifSection, ReplaceGifSectionInputSchema } from './replace-gif-section';
import sharp from 'sharp';
import gifFrames from 'gif-frames';
import { Readable } from 'stream';


// 1. Define Input and Output Schemas
const DetectAndReplaceGifSectionInputSchema = z.object({
  gifDataUri: z
    .string()
    .describe(
      "An animated GIF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/gif;base64,<encoded_data>'"
    ),
  prompt: z.string().describe('A text prompt describing the section to replace (e.g., "remove the logo").'),
});
export type DetectAndReplaceGifSectionInput = z.infer<typeof DetectAndReplaceGifSectionInputSchema>;

const DetectAndReplaceGifSectionOutputSchema = z.object({
  processedGifDataUri: z.string().describe('The processed GIF as a data URI.'),
});
export type DetectAndReplaceGifSectionOutput = z.infer<typeof DetectAndReplaceGifSectionOutputSchema>;


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
export async function detectAndReplaceGifSection(input: DetectAndReplaceGifSectionInput): Promise<DetectAndReplaceGifSectionOutput> {
  return detectAndReplaceFlow(input);
}


// 3. Define the AI Prompt for detection
const detectionPrompt = ai.definePrompt({
  name: 'gifRegionDetectorPrompt',
  input: { 
    schema: z.object({
      gifFrameDataUri: z.string(),
      prompt: z.string(),
    })
  },
  output: { schema: BoundingBoxSchema },
  prompt: `You are an expert at analyzing images and identifying regions based on user requests.
    
    Analyze the provided image frame from a GIF. The user wants to remove a specific part of it, described by the prompt.
    
    Your task is to identify the bounding box of the area to be removed. Provide the precise x and y coordinates of the top-left corner, and the width and height of this area.
    
    User Prompt: {{{prompt}}}
    Image: {{media url=gifFrameDataUri}}`,
});


// 4. Define the main Genkit Flow
const detectAndReplaceFlow = ai.defineFlow(
  {
    name: 'detectAndReplaceFlow',
    inputSchema: DetectAndReplaceGifSectionInputSchema,
    outputSchema: DetectAndReplaceGifSectionOutputSchema,
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
        prompt: input.prompt,
    });
    
    if (!boundingBox) {
        throw new Error("AI failed to detect a region to replace.");
    }

    // Step 3: Call the existing replacement flow with the detected coordinates.
    const result = await replaceGifSection({
        gifDataUri: input.gifDataUri,
        replacementArea: {
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
        }
    });

    return { processedGifDataUri: result.processedGifDataUri };
  }
);
