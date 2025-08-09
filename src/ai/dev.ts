import { config } from 'dotenv';
config();

import '@/ai/flows/extract-media-urls.ts';
import '@/ai/flows/replace-gif-section.ts';
import '@/ai/flows/detect-and-replace-gif-section.ts';
import '@/ai/flows/auto-replace-gif.ts';
import '@/ai/flows/chat-gif-replace.ts';
import '@/ai/flows/replace-gif-color.ts';
