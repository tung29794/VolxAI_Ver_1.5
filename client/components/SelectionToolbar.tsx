import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, ImagePlus, PenTool } from "lucide-react";

interface SelectionToolbarProps {
  selectedText: string;
  onAIRewrite: () => void;
  onFindImage: () => void;
  onWriteMore: () => void;
  isLoading?: boolean;
  position?: { top: number; left: number } | null;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedText,
  onAIRewrite,
  onFindImage,
  onWriteMore,
  isLoading = false,
  position: externalPosition = null,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(externalPosition);

  useEffect(() => {
    // If external position is provided, use it
    if (externalPosition) {
      setPosition(externalPosition);
      return;
    }

    // Fallback: calculate position from document selection
    const handleSelection = () => {
      const selection = window.getSelection();

      if (selection && selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position toolbar BELOW the selected text (after selection ends)
        setPosition({
          top: rect.bottom + 10, // Below the selection with 10px padding
          left: rect.left + rect.width / 2 - 150, // Center the toolbar
        });
      }
    };

    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, [selectedText, externalPosition]);

  if (!position || !selectedText) return null;

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
      }}
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2 backdrop-blur-sm bg-white/95"
    >
      <Button
        size="sm"
        variant="outline"
        onClick={onAIRewrite}
        disabled={isLoading}
        title="AI Rewrite - Rewrite selected text with AI"
        className="flex items-center gap-1"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4 text-blue-600" />
        )}
        <span className="hidden sm:inline text-xs">AI Rewrite</span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={onFindImage}
        disabled={isLoading}
        title="Find Image - Search images for this keyword"
        className="flex items-center gap-1"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ImagePlus className="w-4 h-4 text-green-600" />
        )}
        <span className="hidden sm:inline text-xs">Find Image</span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={onWriteMore}
        disabled={isLoading}
        title="Write More - Generate more content based on selection"
        className="flex items-center gap-1"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PenTool className="w-4 h-4 text-purple-600" />
        )}
        <span className="hidden sm:inline text-xs">Write More</span>
      </Button>
    </div>
  );
};
