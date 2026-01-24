"use client"
import React, { useRef, useEffect, useCallback } from 'react'
import Editor, { type Monaco, type EditorProps } from "@monaco-editor/react"
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from "@/features/playground/lib/editor-config"
import type { TemplateFile } from "@/features/playground/types"

interface PlaygroundEditorProps {
    activeFile?: {
        filename: string;
        fileExtension: string;
        content: string;
        id: string;
        hasUnsavedChanges: boolean;
        originalContent: string;
    };
    content: string;
    onContentChange: (value: string) => void;
    suggestion: string | null;
    suggestionLoading: boolean;
    suggestionPosition: { line: number; column: number } | null;
    onAcceptSuggestion: (editor: any, monaco: any) => void;
    onRejectSuggestion: (editor: any) => void;
    onTriggerSuggestion: (type: string, editor: any) => void;
}

const PlaygroundEditor = ({ activeFile, content, onContentChange, suggestion, suggestionLoading, suggestionPosition, onAcceptSuggestion, onRejectSuggestion, onTriggerSuggestion }: PlaygroundEditorProps) => {
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const inlineCompletionProviderRef = useRef<any>(null);
    const currentSuggestionRef = useRef<{
        text: string;
        position: { line: number; column: number };
        id: string;
    } | null>(null);
    const isAcceptingSuggestionRef = useRef(false);
    const suggestionAcceptedRef = useRef(false);
    const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tabCommandRef = useRef<any>(null);

    // Generate unique ID for each suggestion
    const generateSuggestionId = () => `suggestion-${Date.now()}-${Math.random()}`;

    const createInlineCompletionProvider = useCallback((monaco: Monaco) => {
        return {
            provideInlineCompletions: async (position: any) => {
                //Don't provide completions if we're currently accepting or have already accepted
                if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
                    return { items: [] };
                }
              if (!suggestion || !suggestionPosition) {
                return { items: [] };
              }

              const suggestionid = generateSuggestionId();
              currentSuggestionRef.current = {
                text: suggestion,
                position: suggestionPosition,
                id: suggestionid,
              }

              const cleansuggestiontext = currentSuggestionRef.current?.text.replace(/\r/g, "") || "";

              return {
                items:
                [
                    {
                        insertText: cleansuggestiontext,
                        range: new monaco.Range(suggestionPosition?.line || 0, suggestionPosition?.column || 0, suggestionPosition?.line || 0, suggestionPosition?.column || 0),
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        label: "AI Suggestion",
                        detail: "AI-generated code suggestion",
                        documentation: "Press Tab to accept",
                        sortText: "0000",
                        filterText: "",
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
                    },
                ]
              };
            },
            freeInlineCompletions: () => {
                console.log("freeInlineCompletions called");
                if (currentSuggestionRef.current) {
                    currentSuggestionRef.current = null;
                }
            }
        };
    }, [suggestion, suggestionPosition]);

    //clear current suggestion
    const clearCurrentSuggestion = useCallback(() => {
        console.log("Clearing current suggestion");
        currentSuggestionRef.current = null;
        suggestionAcceptedRef.current = false;
        if (editorRef.current) {
            editorRef.current.trigger("ai", "editor.action.inlineSuggest.hide", null);
        }
    }, []);

    // accept current suggestion with acceptance prevention
    const acceptCurrentSuggestion = useCallback(() => {
        if (!editorRef.current || !monacoRef.current || !currentSuggestionRef.current) return false;
        if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) return false;

        isAcceptingSuggestionRef.current = true;
        suggestionAcceptedRef.current = true;

        try {
            const editor = editorRef.current;
            const monaco = monacoRef.current;
            const cleansuggestiontext = currentSuggestionRef.current.text.replace(/\r/g, "");
            const currentposition = editor.getPosition();
            const suggestionpos = currentSuggestionRef.current.position;

            //safety: prevent duplicates if already inserted
            const modelTextAtCursor = editor.getModel().getValueInRange(
                new monaco.Range(currentposition.lineNumber, currentposition.column, currentposition.lineNumber, currentposition.column + cleansuggestiontext.length)
            );
            
            // Verify we're still at the suggestion position
            if (
                currentposition.lineNumber !== suggestionpos.line ||
                currentposition.column < suggestionpos.column ||
                currentposition.column > suggestionpos.column + 5
            ) {
                console.log("Position changed, cannot accept suggestion");
                return false;
            }

            if (modelTextAtCursor === cleansuggestiontext) {
                console.log("suggestion already inserted, at cursor");
                return false;
            }
            
            // Create range from suggestion position to current position
            const range = new monaco.Range(suggestionpos.line, suggestionpos.column, currentposition.lineNumber, currentposition.column);

            editor.executeEdits("ai-suggestion",[
                {
                    range: range,
                    text: cleansuggestiontext,
                    forceMoveMarkers: true,
                },
            ]);
            
            const lines = cleansuggestiontext.split("\n");
            const endLine = suggestionpos.line + lines.length - 1;
            const endColumn = lines.length === 1 ? suggestionpos.column + cleansuggestiontext.length : lines[lines.length - 1].length + 1;

            editor.setPosition({ lineNumber: endLine, column: endColumn });

            clearCurrentSuggestion();
            onAcceptSuggestion(editor, monaco);

            return true;
        } catch (error) {
            console.error("Error accepting suggestion:", error);
            return false;
        } finally {
            isAcceptingSuggestionRef.current = false;
            setTimeout(() => {
                suggestionAcceptedRef.current = false;
            }, 1000);
        }
    }, [clearCurrentSuggestion, onAcceptSuggestion]);

    const hasActiveSuggestionAtPosition = useCallback(() => {
        if (!editorRef.current || !currentSuggestionRef.current) return false;

        const position = editorRef.current.getPosition();
        const currentSuggestion = currentSuggestionRef.current;

        return (
            position.lineNumber === currentSuggestion.position.line &&
            position.column >= currentSuggestion.position.column &&
            position.column <= currentSuggestion.position.column + 2
        );
    }, []);


    useEffect(() => {
        if (!editorRef.current || !monacoRef.current) return;

        if (inlineCompletionProviderRef.current) {
            inlineCompletionProviderRef.current.dispose();
        }

        currentSuggestionRef.current = null;

        if (suggestion) {
            const language = getEditorLanguage(activeFile?.fileExtension || "");
            const provider = createInlineCompletionProvider(monacoRef.current);

            inlineCompletionProviderRef.current = monacoRef.current.languages.registerInlineCompletionsProvider(language, provider);

            setTimeout(() => {
                editorRef.current?.trigger("ai", "editor.action.inlineSuggest.trigger", null);
            }, 50);
        }
        return () => {
            if (inlineCompletionProviderRef.current) {
                inlineCompletionProviderRef.current.dispose();
                inlineCompletionProviderRef.current = null;
            }
        }

    }, [suggestion, suggestionPosition, activeFile, createInlineCompletionProvider]);

    const updateEditorLanguage = useCallback(() => {
        if (!activeFile || !monacoRef.current || !editorRef.current) return;
        
        try {
            const model = editorRef.current.getModel();
            if (!model) return;
            
            const language = getEditorLanguage(activeFile.fileExtension || "");
            monacoRef.current.editor.setModelLanguage(model, language);
        } catch (error) {
            console.warn("Failed to set editor language:", error);
        }
    }, [activeFile]);

    const handleEditorDidMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        configureMonaco(monaco);

        editor.updateOptions({
            ...defaultEditorOptions,
            inlineSuggest: {
                enabled: true,
            },
            suggest: {
                preview: false
            },
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false
            },
            cursorSmoothCaretAnimation: "on",
        });
        
        if (tabCommandRef.current) {
            tabCommandRef.current.dispose();
        }

        tabCommandRef.current = editor.addCommand(monaco.KeyCode.Tab, () => {
            if (isAcceptingSuggestionRef.current || suggestionAcceptedRef.current) {
                return;
            }
            if (currentSuggestionRef.current) {
                const accepted = acceptCurrentSuggestion();
                if (accepted) {
                    return;
                }
            }
            editor.trigger("keyboard", "tab", null);
        });

        editor.addCommand(monaco.KeyCode.Escape, () => {
            if (currentSuggestionRef.current) {
                onRejectSuggestion(editor);
                clearCurrentSuggestion();
            }
        });

        editor.onDidChangeCursorPosition(() => {
            if (suggestionTimeoutRef.current) {
                clearTimeout(suggestionTimeoutRef.current);
            }
            if (!isAcceptingSuggestionRef.current && !suggestionLoading && !currentSuggestionRef.current) {
                suggestionTimeoutRef.current = setTimeout(() => {
                    onTriggerSuggestion("completion", editor);
                }, 300);
            }
        });

        editor.onDidChangeModelContent((e: any) => {
            if (isAcceptingSuggestionRef.current) return;
            if (e.changes.length > 0 && !suggestionAcceptedRef.current) {
                const change = e.changes[0];

                if (
                    currentSuggestionRef.current &&
                    (change.text === currentSuggestionRef.current.text ||
                    change.text === currentSuggestionRef.current.text.replace(/\r/g, ""))
                ) {
                    return;
                }
                clearCurrentSuggestion();
                
                const triggers = ["\n", "{", ".", "=", "(", ",", ":", ";"];
                if (triggers.includes(change.text)) {
                    setTimeout(() => {
                        if (editorRef.current && !currentSuggestionRef.current && !suggestionLoading) {
                            onTriggerSuggestion("completion", editorRef.current);
                        }
                    }, 100);
                }
            }
        });
                           
        updateEditorLanguage();
    };

    useEffect(() => {
        updateEditorLanguage();
    }, [activeFile, updateEditorLanguage]);

    //cleanup on unmount
    useEffect(() => {
        return () => {
            if (suggestionTimeoutRef.current) {
                clearTimeout(suggestionTimeoutRef.current);
            }
            if (inlineCompletionProviderRef.current) {
                inlineCompletionProviderRef.current.dispose();
            }
            if (tabCommandRef.current) {
                tabCommandRef.current.dispose();
            }
        };
    }, []);

    if (!activeFile) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Select a file to start editing</p>
            </div>
        );
    }

    return (
        <div className="h-full relative">
            {suggestionLoading && (
                <div className="absolute top-2 right-2 z-10 bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    AI thinking...
                </div>
            )}

            {currentSuggestionRef.current && !suggestionLoading && (
                <div className="absolute top-2 right-2 z-10 bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Press Tab to accept
                </div>
            )}

            <Editor
                height="100%"
                value={content}
                onChange={(value) => onContentChange(value || "")}
                onMount={handleEditorDidMount}
                language={getEditorLanguage(activeFile?.fileExtension || "")}
                options={defaultEditorOptions as unknown as EditorProps["options"]}
            />
        </div>
    );
};

export { PlaygroundEditor };
export default PlaygroundEditor;
