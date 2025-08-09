'use server';

/**
 * @fileOverview Extracts valid image and GIF URLs from a CSV file using AI.
 *
 * - extractMediaUrls - A function that handles the extraction process.
 * - ExtractMediaUrlsInput - The input type for the extractMediaUrls function.
 * - ExtractMediaUrlsOutput - The return type for the extractMediaUrls function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractMediaUrlsInputSchema = z.object({
  csvData: z
    .string()
    .describe('The content of the uploaded CSV file as a string.'),
});
export type ExtractMediaUrlsInput = z.infer<typeof ExtractMediaUrlsInputSchema>;

const ExtractMediaUrlsOutputSchema = z.object({
  mediaUrls: z.array(z.string()).describe('An array of extracted media URLs.'),
});
export type ExtractMediaUrlsOutput = z.infer<typeof ExtractMediaUrlsOutputSchema>;

export async function extractMediaUrls(input: ExtractMediaUrlsInput): Promise<ExtractMediaUrlsOutput> {
  return extractMediaUrlsFlow(input);
}

const extractMediaUrlsPrompt = ai.definePrompt({
  name: 'extractMediaUrlsPrompt',
  input: {schema: ExtractMediaUrlsInputSchema},
  output: {schema: ExtractMediaUrlsOutputSchema},
  prompt: `You are an expert in extracting URLs for images and GIFs from CSV data.

  Given the following CSV data, extract all valid URLs that point to images or GIFs.  Be very strict in determining whether a URL is actually an image or GIF -- do not include URLs that are not.

  CSV Data:
  {{csvData}}
  `, // VERY IMPORTANT -- DO NOT URL-ESCAPE THIS CSV DATA.  It is CSV data, not HTML output.
});

const extractMediaUrlsFlow = ai.defineFlow(
  {
    name: 'extractMediaUrlsFlow',
    inputSchema: ExtractMediaUrlsInputSchema,
    outputSchema: ExtractMediaUrlsOutputSchema,
  },
  async input => {
    const {output} = await extractMediaUrlsPrompt(input);
    return output!;
  }
);
