import { TemplateFile, TemplateFolder } from "../types";

export function findFilePath(
    file: TemplateFile,
    folder: TemplateFolder,
    pathSoFar: string[] = []
  ): string | null {
    for (const item of folder.items) {
      if ("folderName" in item) {
        const res = findFilePath(file, item, [...pathSoFar, item.folderName]);
        if (res) return res;
      } else {
        if (
          item.filename === file.filename &&
          item.fileExtension === file.fileExtension
        ) {
          return [
            ...pathSoFar,
            item.filename + (item.fileExtension ? "." + item.fileExtension : ""),
          ].join("/");
        }
      }
    }
    return null;
  }

export const generateFileId = (file: TemplateFile, rootFolder: TemplateFolder) => {
    // Find the file's full path in the folder structure (already includes filename)
    const fullPath = findFilePath(file, rootFolder)?.replace(/^\/+/, '') || '';
    
    // If path was found, use it directly (it already includes the filename)
    if (fullPath) {
        return fullPath;
    }
    
    // Fallback: construct ID from filename and extension
    const extension = file.fileExtension?.trim();
    const extensionSuffix = extension ? `.${extension}` : '';
    return `${file.filename}${extensionSuffix}`;
}