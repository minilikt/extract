
'use server';

/**
 * @fileOverview Detects a region in a GIF based on a chat conversation and replaces it with a white box.
 *
 * - chatAndReplaceGifSection - A function that handles the conversational detection and replacement.
 * - ChatAndReplaceGifSectionInput - The input type for the function.
 * - ChatAndReplaceGifSectionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { replaceGifSection, type ReplaceGifSectionInput } from './replace-gif-section';
import gifFrames from 'gif-frames';
import { Readable } from 'stream';

// 1. Define Schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ChatAndReplaceGifSectionInputSchema = z.object({
  gifDataUri: z
    .string()
    .describe(
      "An animated GIF, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/gif;base64,<encoded_data>'"
    ),
  messages: z.array(MessageSchema).describe('The conversation history between the user and the model.'),
});
export type ChatAndReplaceGifSectionInput = z.infer<typeof ChatAndReplaceGifSectionInputSchema>;

const ChatAndReplaceGifSectionOutputSchema = z.object({
  processedGifDataUri: z.string().nullable().describe('The processed GIF as a data URI, or null if no replacement was made.'),
  modelResponse: z.string().describe('The text response from the model.'),
});
export type ChatAndReplaceGifSectionOutput = z.infer<typeof ChatAndReplaceGifSectionOutputSchema>;

const BoundingBoxSchema = z.object({
    x: z.number().describe('The x-coordinate of the top-left corner of the bounding box. If you are not replacing anything, set to -1.'),
    y: z.number().describe('The y-coordinate of the top-left corner of the bounding box. If you are not replacing anything, set to -1.'),
    width: z.number().describe('The width of the bounding box. If you are not replacing anything, set to -1.'),
    height: z.number().describe('The height of the bounding box. If you are not replacing anything, set to -1.'),
});

const ToolOutputSchema = z.object({
    response: z.string().describe("Your conversational response to the user's message."),
    boundingBox: BoundingBoxSchema.nullable().describe("The bounding box of the area to replace. If the user hasn't confirmed the replacement, this should be null.")
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
export async function chatAndReplaceGifSection(input: ChatAndReplaceGifSectionInput): Promise<ChatAndReplaceGifSectionOutput> {
  return chatAndReplaceFlow(input);
}


// 3. Define the AI Prompt for the chat
const chatPrompt = ai.definePrompt({
  name: 'gifChatRegionDetectorPrompt',
  input: {
    schema: z.object({
      gifFrameDataUri: z.string(),
      messages: z.array(MessageSchema),
    })
  },
  output: { schema: ToolOutputSchema },
  prompt: `You are an expert at analyzing images and helping users modify them based on a conversation.
    
    The user has uploaded a GIF and wants to replace a part of it. Your job is to talk with the user to figure out exactly what they want to remove. 
    
    - Engage in a conversation to clarify their request.
    - When you are confident you know what to remove, ask for their confirmation.
    - **Only when the user confirms**, provide the bounding box (x, y, width, height) of the area to be replaced.
    - If you are just having a conversation or asking for clarification, return a null boundingBox.
    - If the user decides not to replace anything, or you can't identify the object, return a null boundingBox.
    - Always provide a friendly, conversational response to the user.

    The user's conversation history is provided below. The most recent message is last.
    
    {{#each messages}}
    {{role}}: {{content}}
    {{/each}}
    
    Here is the first frame of the GIF for your analysis:
    Image: {{media url=gifFrameDataUri}}`,
});


// 4. Define the main Genkit Flow
const chatAndReplaceFlow = ai.defineFlow(
  {
    name: 'chatAndReplaceFlow',
    inputSchema: ChatAndReplaceGifSectionInputSchema,
    outputSchema: ChatAndReplaceGifSectionOutputSchema,
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

    // Step 2: Call the AI prompt to get the response and maybe a bounding box.
    const { output } = await chatPrompt({
        gifFrameDataUri: firstFrameDataUri,
        messages: input.messages,
    });
    
    if (!output) {
        throw new Error("AI failed to respond.");
    }
    
    const { response, boundingBox } = output;

    // Step 3: If we have a valid bounding box, call the replacement flow.
    if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
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

        return { 
            modelResponse: response,
            processedGifDataUri: result.processedGifDataUri,
        };
    }

    // Step 4: If no bounding box, just return the model's text response.
    return {
        modelResponse: response,
        processedGifDataUri: null,
    };
  }
);
