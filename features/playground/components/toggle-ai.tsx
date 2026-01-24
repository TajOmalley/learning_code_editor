"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Code, 
  FileText, 
  Import, 
  Loader2,
  Power,
  PowerOff,
  Braces,
  Variable
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { AIChatSidePanel } from "@/features/ai-chat/ai-chat-sidepanel";


interface ToggleAIProps {
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
  
  suggestionLoading: boolean;
  loadingProgress?: number;
  activeFeature?: string;
  
  // Editor integration props
  editorRef?: React.MutableRefObject<any>;
  monacoRef?: React.MutableRefObject<any>;
  activeFile?: { id: string; filename: string; content: string };
  onUpdateFileContent?: (fileId: string, content: string) => void;
}

const ToggleAI: React.FC<ToggleAIProps> = ({
  isEnabled,
  onToggle,

  suggestionLoading,
  loadingProgress = 0,
  activeFeature,
  
  // Editor integration props
  editorRef,
  monacoRef,
  activeFile,
  onUpdateFileContent,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  // Debug: Log activeFile changes
  useEffect(() => {
    console.log("ToggleAI - activeFile:", activeFile);
  }, [activeFile]);

  // Update cursor position when editor changes
  useEffect(() => {
    if (editorRef?.current) {
      const editor = editorRef.current;
      const updateCursor = () => {
        const position = editor.getPosition();
        if (position) {
          setCursorPosition({ line: position.lineNumber, column: position.column });
        }
      };
      
      // Initial position
      updateCursor();
      
      // Listen for cursor changes
      const disposable = editor.onDidChangeCursorPosition(updateCursor);
      return () => disposable?.dispose();
    }
  }, [editorRef]);

  // Handler for code insertion from AI chat panel
  const handleInsertCode = (code: string, fileName?: string, position?: { line: number; column: number }) => {
    if (!editorRef?.current || !monacoRef?.current) {
      console.warn("Editor not available");
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    try {
      // Get current position or use provided position
      const insertPosition = position || editor.getPosition();
      
      if (!insertPosition) {
        console.warn("No insert position available");
        return;
      }

      // Insert the code at the cursor position
      const operation = {
        range: new monaco.Range(
          insertPosition.line,
          insertPosition.column,
          insertPosition.line,
          insertPosition.column
        ),
        text: code,
        forceMoveMarkers: true,
      };

      editor.executeEdits("ai-insert", [operation]);
      
      // Update file content if handler is provided
      if (activeFile && onUpdateFileContent) {
        const newContent = editor.getValue();
        onUpdateFileContent(activeFile.id, newContent);
      }

      // Move cursor to end of inserted code
      const lines = code.split("\n");
      const lastLine = lines[lines.length - 1];
      const newPosition = {
        lineNumber: insertPosition.line + lines.length - 1,
        column: lines.length === 1 ? insertPosition.column + lastLine.length : lastLine.length + 1,
      };
      editor.setPosition(newPosition);
      editor.focus();

      console.log("Code inserted successfully");
    } catch (error) {
      console.error("Error inserting code:", error);
    }
  };

  // Handler for running code from AI chat panel
  const handleRunCode = (code: string, language: string) => {
    console.log("Run code:", { code, language });
    // TODO: Implement code execution in WebContainer
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="sm" 
            variant={isEnabled ? "default" : "outline"}
            className={cn(
              "relative gap-2 h-8 px-3 text-sm font-medium transition-all duration-200",
              isEnabled 
                ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-50 border-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200" 
                : "bg-background hover:bg-accent text-foreground border-border",
              suggestionLoading && "opacity-75"
            )}
            onClick={(e) => e.preventDefault()}
          >
            {suggestionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            <span>AI</span>
            {isEnabled ? (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">AI Assistant</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                isEnabled 
                  ? "bg-zinc-900 text-zinc-50 border-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-200" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isEnabled ? "Active" : "Inactive"}
            </Badge>
          </DropdownMenuLabel>
          
          {suggestionLoading && activeFeature && (
            <div className="px-3 pb-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{activeFeature}</span>
                  <span>{Math.round(loadingProgress)}%</span>
                </div>
                <Progress 
                  value={loadingProgress} 
                  className="h-1.5"
                />
              </div>
            </div>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => onToggle(!isEnabled)}
            className="py-2.5 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {isEnabled ? (
                  <Power className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <PowerOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {isEnabled ? "Disable" : "Enable"} AI
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Toggle AI assistance
                  </div>
                </div>
              </div>
              <div className={cn(
                "w-8 h-4 rounded-full border transition-all duration-200 relative",
                isEnabled 
                  ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-50 dark:border-zinc-50" 
                  : "bg-muted border-border"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full bg-background transition-all duration-200 absolute top-0.5",
                  isEnabled ? "left-4" : "left-0.5"
                )} />
              </div>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsChatOpen(true)}
            className="py-2.5 cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Open Chat</div>
                <div className="text-xs text-muted-foreground">
                  Chat with AI assistant
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AIChatSidePanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onInsertCode={handleInsertCode}
        onRunCode={handleRunCode}
        activeFileName={activeFile?.filename}
        activeFileContent={activeFile?.content || ""}
        activeFileLanguage="typescript"
        cursorPosition={cursorPosition}
        theme="dark"
      />
    </>
  );
};

export default ToggleAI;
