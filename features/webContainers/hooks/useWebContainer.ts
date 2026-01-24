import { useState, useEffect, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import { TemplateFolder } from '@/features/playground/types';

interface UseWebContainerProps {
  templateData: TemplateFolder | null;
}

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

// Singleton instance - only one WebContainer per app
let webContainerInstancePromise: Promise<WebContainer> | null = null;
let webContainerInstance: WebContainer | null = null;

export const useWebContainer = ({ templateData }: UseWebContainerProps): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        // Use existing instance if available
        if (webContainerInstance) {
          console.log('Reusing existing WebContainer instance');
          if (mounted) {
            setInstance(webContainerInstance);
            setIsLoading(false);
          }
          return;
        }

        // Use existing promise if boot is in progress
        if (webContainerInstancePromise) {
          console.log('Waiting for existing WebContainer boot to complete');
          const existingInstance = await webContainerInstancePromise;
          if (mounted) {
            setInstance(existingInstance);
            setIsLoading(false);
          }
          return;
        }

        // Create new instance
        console.log('Booting new WebContainer instance');
        webContainerInstancePromise = WebContainer.boot();
        const newInstance = await webContainerInstancePromise;
        webContainerInstance = newInstance;
        
        if (!mounted) return;
        
        setInstance(newInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize WebContainer:', err);
        webContainerInstancePromise = null; // Reset on error
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize WebContainer');
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
      // Don't teardown the instance - keep it alive for reuse
    };
  }, []);

  const writeFileSync = useCallback(async (path: string, content: string): Promise<void> => {
    if (!instance) {
      throw new Error('WebContainer instance is not available');
    }

    try {
      const pathParts = path.split('/');
      const folderPath = pathParts.slice(0, -1).join('/');

      if (folderPath) {
        await instance.fs.mkdir(folderPath, { recursive: true });
      }

      await instance.fs.writeFile(path, content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
      console.error(`Failed to write file at ${path}:`, err);
      throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
    }
  }, [instance]);

  const destroy = useCallback(() => {
    if (instance) {
      console.log('Destroying WebContainer instance');
      instance.teardown();
      webContainerInstance = null;
      webContainerInstancePromise = null;
      setInstance(null);
      setServerUrl(null);
    }
  }, [instance]);

  return { serverUrl, isLoading, error, instance, writeFileSync, destroy };
};
