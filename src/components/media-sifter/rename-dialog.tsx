"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, type ReactNode } from "react";

interface RenameDialogProps {
  headers: string[];
  pattern: string;
  onPatternChange: (pattern: string) => void;
  children: ReactNode;
}

export function RenameDialog({ headers, pattern, onPatternChange, children }: RenameDialogProps) {
  const [localPattern, setLocalPattern] = useState(pattern);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBadgeClick = (header: string) => {
    const newPattern = `${localPattern}{${header}}`;
    setLocalPattern(newPattern);
    inputRef.current?.focus();
  };

  const handleSave = () => {
    onPatternChange(localPattern);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize File Names</DialogTitle>
          <DialogDescription>
            Create a template for renaming files upon download. Click on a column header to add it as a placeholder.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rename-pattern" className="text-right">
              Pattern
            </Label>
            <Input
              id="rename-pattern"
              ref={inputRef}
              value={localPattern}
              onChange={(e) => setLocalPattern(e.target.value)}
              className="col-span-3"
            />
          </div>
          {headers.length > 0 && (
            <div className="col-span-4">
                <p className="text-sm text-muted-foreground mb-2">Available columns:</p>
                <div className="flex flex-wrap gap-2">
                    {headers.map((header) => (
                        <Badge 
                            key={header}
                            variant="secondary"
                            onClick={() => handleBadgeClick(header)}
                            className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                            {header}
                        </Badge>
                    ))}
                </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button type="submit" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save changes</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
