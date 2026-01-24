"use client"

import React, { useCallback, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { SidebarInset } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { usePlayground } from "@/features/playground/hooks/usePlayground"
import { useFileExplorer } from "@/features/playground/hooks/useFileExplorer"
import TemplateFileTree from "@/features/playground/components/template-file-tree"
import type { TemplateFile, TemplateFolder } from "@/features/playground/types"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable"
import {FileText, FolderOpen, AlertCircle, Save, X, Settings, Bot} from "lucide-react"
import {toast} from "sonner"
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs"
import { findFilePath } from "@/features/playground/lib"
import { PlaygroundEditor } from "@/features/playground/components/playground-editor"
import { useWebContainer } from "@/features/webContainers/hooks/useWebContainer"
import dynamic from 'next/dynamic';

const WebContainerPreview = dynamic(
  () => import('@/features/webContainers/components/webcontainer-preview'),
  { ssr: false }
);
import ToggleAI from "@/features/playground/components/toggle-ai"
import { useAISuggestions } from "@/features/ai/hooks/useAISuggestion"



const Page = () => {
    const { id } = useParams<{ id: string }>();
    const [isPreviewVisible, setIsPreviewVisible] = React.useState(true);
    const {playgroundData, templateData, isLoading, error, saveTemplateData} = usePlayground(id);

    // Create refs for editor and monaco that can be shared with ToggleAI
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);

    const aiSuggestions = useAISuggestions();
    const {
        activeFileId,
        closeAllFiles,
        openFile,
        closeFile,
        editorContent,
        updateFileContent,
        handleAddFile,
        handleAddFolder,
        handleDeleteFile,
        handleDeleteFolder,
        handleRenameFile,
        handleRenameFolder,
        openFiles,
        setTemplateData,
        setActiveFileId,
        setPlaygroundId,
        setOpenFiles,
    } = useFileExplorer();

    const {
        serverUrl,
        isLoading: containerLoading,
        error: containerError,
        instance,
        writeFileSync,
    } = useWebContainer({ templateData });

    useEffect(() => {
        setPlaygroundId(id);
    }, [id, setPlaygroundId]);

    useEffect(() => {
        if (templateData) {
            setTemplateData(templateData);
        }
    }, [templateData, setTemplateData]);

    const activeFile = openFiles.find((file) => file.id === activeFileId);
    const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

    const handleFileSelect = (file: TemplateFile) => {
        // Ensure templateData is in the zustand store before opening file
        if (templateData && !useFileExplorer.getState().templateData) {
            setTemplateData(templateData);
        }
        openFile(file);
    };

    const handleSave = useCallback(
        async (fileId?: string) => {
            const targetFileId = fileId || activeFileId;
            if (!targetFileId) return;

            const fileToSave = openFiles.find((f) => f.id === targetFileId);
            if (!fileToSave) return;

            // Get the latest template data from the zustand store
            const latestTemplateData = useFileExplorer.getState().templateData || templateData;
            if (!latestTemplateData) return;

            try {
                const filePath = findFilePath(fileToSave, latestTemplateData);
                if (!filePath) {
                    toast.error(
                        `Could not find path for file: ${fileToSave.filename}.${fileToSave.fileExtension}`
                    );
                    return;
                }

                // Update file content in template data (clone for immutability)
                const updatedTemplateData = JSON.parse(
                    JSON.stringify(latestTemplateData)
                );
                const updateFileContentInTree = (items: any[]): any[] =>
                    items.map((item) => {
                        if ("folderName" in item) {
                            return { ...item, items: updateFileContentInTree(item.items) };
                        } else if (
                            item.filename === fileToSave.filename &&
                            item.fileExtension === fileToSave.fileExtension
                        ) {
                            return { ...item, content: fileToSave.content };
                        }
                        return item;
                    });
                updatedTemplateData.items = updateFileContentInTree(
                    updatedTemplateData.items
                );

                // Write to WebContainer if available
                if (writeFileSync) {
                    await writeFileSync(filePath, fileToSave.content);
                }

                // Also write directly to WebContainer instance filesystem
                if (instance && instance.fs) {
                    try {
                        await instance.fs.writeFile(filePath, fileToSave.content);
                        console.log(`✅ Updated ${filePath} in WebContainer`);
                    } catch (err) {
                        console.error("Error writing to WebContainer fs:", err);
                    }
                }

                // Use saveTemplateData to persist changes
                await saveTemplateData(updatedTemplateData);
                setTemplateData(updatedTemplateData);

                // Update open files
                const updatedOpenFiles = openFiles.map((f) =>
                    f.id === targetFileId
                        ? {
                            ...f,
                            content: fileToSave.content,
                            originalContent: fileToSave.content,
                            hasUnsavedChanges: false,
                        }
                        : f
                );
                setOpenFiles(updatedOpenFiles);

                toast.success(
                    `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`
                );
            } catch (error) {
                console.error("Error saving file:", error);
                toast.error(
                    `Failed to save ${fileToSave.filename}.${fileToSave.fileExtension}`
                );
                throw error;
            }
        },
        [
            activeFileId,
            openFiles,
            templateData,
            saveTemplateData,
            setTemplateData,
            setOpenFiles,
            writeFileSync,
            instance,
        ]
    );

    // Add keyboard shortcut for Ctrl+S / Cmd+S to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault(); // Prevent browser's default save dialog
                if (activeFileId) {
                    handleSave();
                    toast.info("Saving...");
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFileId, handleSave]);

    const handleSaveAll = useCallback(async () => {
        const unsavedFiles = openFiles.filter((f) => f.hasUnsavedChanges);

        if (unsavedFiles.length === 0) {
            toast.info("No unsaved changes");
            return;
        }

        try {
            await Promise.all(unsavedFiles.map((f) => handleSave(f.id)));
            toast.success(`Saved ${unsavedFiles.length} file(s)`);
        } catch (error) {
            toast.error("Failed to save some files");
        }
    }, [openFiles, handleSave]);

    const wrappedHandleAddFile = useCallback(
        (newFile: TemplateFile, parentPath: string) => {
            return handleAddFile(
                newFile,
                parentPath,
                writeFileSync || (async () => {}),
                instance as any,
                saveTemplateData
            );
        },
        [handleAddFile, saveTemplateData, writeFileSync, instance]
    );

    const wrappedHandleAddFolder = useCallback(
        (newFolder: TemplateFolder, parentPath: string) => {
            return handleAddFolder(
                newFolder,
                parentPath,
                instance as any,
                saveTemplateData
            );
        },
        [handleAddFolder, saveTemplateData, instance]
    );

    const wrappedHandleDeleteFile = useCallback(
        (file: TemplateFile, parentPath: string) => {
            return handleDeleteFile(file, parentPath, saveTemplateData);
        },
        [handleDeleteFile, saveTemplateData]
    );

    const wrappedHandleDeleteFolder = useCallback(
        (folder: TemplateFolder, parentPath: string) => {
            return handleDeleteFolder(folder, parentPath, saveTemplateData);
        },
        [handleDeleteFolder, saveTemplateData]
    );

    const wrappedHandleRenameFile = useCallback(
        (
            file: TemplateFile,
            newFilename: string,
            newExtension: string,
            parentPath: string
        ) => {
            return handleRenameFile(
                file,
                newFilename,
                newExtension,
                parentPath,
                saveTemplateData
            );
        },
        [handleRenameFile, saveTemplateData]
    );

    const wrappedHandleRenameFolder = useCallback(
        (folder: TemplateFolder, newFolderName: string, parentPath: string) => {
            return handleRenameFolder(
                folder,
                newFolderName,
                parentPath,
                saveTemplateData
            );
        },
        [handleRenameFolder, saveTemplateData]
    );

    return (
        <TooltipProvider>
            {templateData && (
                <TemplateFileTree
                    data={templateData!}
                    onFileSelect={handleFileSelect}
                    selectedFile={activeFile}
                    title="File Explorer"
                    onAddFile={wrappedHandleAddFile}
                    onAddFolder={wrappedHandleAddFolder}
                    onDeleteFile={wrappedHandleDeleteFile}
                    onDeleteFolder={wrappedHandleDeleteFolder}
                    onRenameFile={wrappedHandleRenameFile}
                    onRenameFolder={wrappedHandleRenameFolder}
                />
            )}

            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    
                    <div className="flex flex-1 items-center gap-2">
                        <div className="flex flex-col flex-1">
                            <h1 className="text-sm font-medium">
                            {playgroundData?.title || "Code Playground"}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {openFiles.length} file(s) open
                                {hasUnsavedChanges && " • Unsaved changes"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => handleSave()} disabled={!activeFile || !activeFile.hasUnsavedChanges}>
                                        <Save className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Save (Ctrl + S)</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={!hasUnsavedChanges}>
                                        <Save className="h-4 w-4" /> All
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Save All (Ctrl + S)</TooltipContent>
                            </Tooltip>

                            {/* TODO: Add AI suggestions toggle */}
                           <ToggleAI
                           isEnabled={aiSuggestions.isEnabled}
                           onToggle={aiSuggestions.toggleEnabled}
                           suggestionLoading={aiSuggestions.isLoading}
                           editorRef={editorRef}
                           monacoRef={monacoRef}
                           activeFile={activeFile}
                           onUpdateFileContent={updateFileContent}
                           />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                        <Settings className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsPreviewVisible(!isPreviewVisible)}>
                                        {isPreviewVisible ? "Hide" : "Show"} Preview
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={closeAllFiles}>
                                        Close All Files
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>
                <div className="h-[calc(100vh-4rem)]">
                    {openFiles.length > 0 ? (
                        <div className="h-full flex flex-col">
                            <div className="border-b bg-muted/30">
                                <Tabs value={activeFileId || ""} onValueChange={setActiveFileId}>
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <TabsList className="h-8 bg-transparent p-0">
                                            {openFiles.map((file) => (
                                                <TabsTrigger 
                                                    key={file.id} 
                                                    value={file.id} 
                                                    className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="size-3" />
                                                        <span>
                                                            {file.filename}.{file.fileExtension}
                                                        </span>
                                                        {file.hasUnsavedChanges && (
                                                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                                                        )}
                                                        <span 
                                                            className="ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                closeFile(file.id);
                                                            }}
                                                        >
                                                            <X className="size-3" />
                                                        </span>
                                                    </div>
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>

                                        {
                                            openFiles.length > 1 && (
                                                <Button size="sm" variant="ghost" onClick={closeAllFiles} className="h-6 px-2 text-xs">
                                                    Close All
                                                </Button>
                                            )
                                        }
                                    </div>
                                </Tabs>
                            </div>
                            
                            <div className="flex-1">
                                {/* @ts-ignore - ResizablePanelGroup direction prop type issue */}
                                <ResizablePanelGroup direction="horizontal" className="h-full">
                                    <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100}>
                                        <PlaygroundEditor
                                            activeFile={activeFile}
                                            content={activeFile?.content || ""}
                                            onContentChange={(value) =>
                                                activeFileId && updateFileContent(activeFileId, value)
                                            }

                                            suggestion={aiSuggestions.suggestion}
                                            suggestionLoading={aiSuggestions.isLoading}
                                            suggestionPosition={aiSuggestions.position}
                                            onAcceptSuggestion={(editor, monaco) =>
                                                aiSuggestions.acceptSuggestion(editor, monaco)
                                            }
                                            onRejectSuggestion={(editor) =>
                                                aiSuggestions.rejectSuggestion(editor)
                                            }
                                            onTriggerSuggestion={(type, editor) =>
                                                aiSuggestions.fetchSuggestion(type, editor)
                                            }
                                            editorRef={editorRef}
                                            monacoRef={monacoRef}
                                        />
                                    </ResizablePanel>
                                    {isPreviewVisible && templateData && (
                                        <>
                                            <ResizableHandle />
                                            <ResizablePanel defaultSize={50}>
                                                <WebContainerPreview
                                                    templateData={templateData}
                                                    serverUrl={serverUrl || ""}
                                                    isLoading={containerLoading}
                                                    error={containerError}
                                                    instance={instance}
                                                    writeFileSync={writeFileSync}
                                                    forceResetup={false}
                                                    
                                                    

                                                />
                                            </ResizablePanel>
                                        </>
                                    )}
                                </ResizablePanelGroup>

                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full items-center justify-center text-sm text-muted-foreground gap-4">
                            <FileText className="size-16 text-gray-300" />
                            <div className="text-center">
                                <p className="text-lg font-medium">No files opened</p>
                                <p className="text-sm text-muted-foreground">Select a file from the sidebar to start editing</p>
                            </div>
                        </div>
                    )}
                </div>
            </SidebarInset>
        </TooltipProvider>
    )
}

export default Page