
"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/media-sifter/header';
import { Download, Loader2, Send, FileUp } from 'lucide-react';
import { chatAndReplaceGifSection } from '@/ai/flows/chat-gif-replace';
import { useToast } from "@/hooks/use-toast";
import { saveAs } from 'file-saver';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Message = {
    role: 'user' | 'model';
    content: string;
}

export default function ChatTestPage() {
  const [gifSrc, setGifSrc] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [processedGif, setProcessedGif] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setProcessedGif(null);
      setMessages([]);
      setCurrentMessage('');
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const dataUri = reader.result?.toString() || '';
        setGifSrc(dataUri);
        setMessages([{ role: 'model', content: "I've loaded your GIF. What would you like to replace?" }]);
      });
      reader.readAsDataURL(file);
    }
  }

  async function handleSendMessage() {
    if (!currentMessage.trim() || !gifSrc) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: currentMessage }];
    setMessages(newMessages);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const result = await chatAndReplaceGifSection({
        gifDataUri: gifSrc,
        messages: newMessages,
      });
      
      setMessages(prev => [...prev, { role: 'model', content: result.modelResponse }]);

      if (result.processedGifDataUri) {
          setProcessedGif(result.processedGifDataUri);
          toast({ title: 'Replacement Complete!', description: "I've updated the GIF based on our conversation." });
      }

    } catch (error) {
      console.error("Error processing GIF:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Processing Failed", description: `Could not process the GIF. ${errorMessage}`, variant: "destructive" });
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I ran into an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownloadProcessed() {
    if (!processedGif) return;
    saveAs(processedGif, 'processed-chat.gif');
  }

  const handleReset = () => {
      setGifSrc('');
      setProcessedGif(null);
      setMessages([]);
      setCurrentMessage('');
  }

  return (
    <main className="container mx-auto px-4 min-h-screen flex flex-col">
       <Header />
      <div className="flex-grow grid md:grid-cols-2 gap-8 pb-8 items-start">
        
        {/* Left Column: GIF previews */}
        <div className="flex flex-col gap-4 items-center sticky top-4">
            <div className="flex flex-col gap-4 items-center w-full">
                <h2 className="text-2xl font-bold">Original</h2>
                <div className="p-4 bg-card rounded-lg border shadow-sm w-full h-[300px] flex items-center justify-center">
                    {gifSrc ? (
                        <img src={gifSrc} alt="Original GIF" className="max-w-full max-h-full" />
                    ): (
                        <div className="text-center text-muted-foreground">
                            <p>Upload a GIF to start</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-4 items-center w-full">
                <h2 className="text-2xl font-bold">Processed</h2>
                <div className="p-4 bg-card rounded-lg border shadow-sm w-full h-[300px] flex items-center justify-center">
                    {isLoading && !processedGif && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
                    {processedGif && <img alt="Processed GIF" src={processedGif} className="max-w-full max-h-full" />}
                    {!processedGif && !isLoading && <p className="text-muted-foreground">Result will appear here</p>}
                </div>
                {processedGif && (
                  <Button onClick={handleDownloadProcessed} variant="outline" disabled={isLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Processed GIF
                  </Button>
                )}
            </div>
        </div>
        
        {/* Right Column: Chat Interface */}
        <div className="p-4 bg-card rounded-lg border shadow-sm w-full flex flex-col h-[calc(100vh-12rem)] max-h-[800px]">
            {!gifSrc ? (
                <div className="flex-grow flex items-center justify-center">
                     <Button asChild>
                        <label className="cursor-pointer">
                            <FileUp className="mr-2 h-4 w-4" />
                            Upload GIF to Start Chat
                            <Input id="gif-upload" type="file" accept="image/gif" onChange={onFileChange} className="hidden" />
                        </label>
                    </Button>
                </div>
            ) : (
                <>
                    <ScrollArea className="flex-grow  mb-4 pr-4" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' && 'justify-end')}>
                                    {msg.role === 'model' && (
                                        <Avatar className="w-8 h-8 border">
                                            <AvatarFallback>AI</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn(
                                        "p-3 rounded-lg max-w-[80%]",
                                        msg.role === 'model' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                                    )}>
                                        <p className="text-sm">{msg.content}</p>
                                    </div>
                                    {msg.role === 'user' && (
                                        <Avatar className="w-8 h-8 border">
                                            <AvatarFallback>U</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                             {isLoading && (
                                <div className="flex items-start gap-3">
                                    <Avatar className="w-8 h-8 border">
                                        <AvatarFallback>AI</AvatarFallback>
                                    </Avatar>
                                    <div className="p-3 rounded-lg bg-muted">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="flex gap-2 border-t pt-4">
                        <Textarea 
                            placeholder="Type your message..." 
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            disabled={isLoading}
                            className="flex-grow"
                            rows={1}
                        />
                        <Button onClick={handleSendMessage} disabled={isLoading || !currentMessage.trim()}>
                            <Send className="w-4 h-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                        <Button onClick={handleReset} variant="outline" disabled={isLoading}>Reset</Button>
                    </div>
                </>
            )}
        </div>

      </div>
    </main>
  );
}

