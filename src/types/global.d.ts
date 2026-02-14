export {};

declare global {
  interface Window {
    savePng: (path: string, base64Data: string) => Promise<void>;
    runPython: (scriptPath: string, args?: string[]) => Promise<void>;

    imageAPI: {
      loadImageBase64: (filePath: string) => Promise<string | null>;
    };

    promptAPI: {
      savePromptFile: (filePath: string, content: string) => Promise<boolean>;
      pathExists: (filePath: string) => boolean;
      ensureDir: (dirPath: string) => boolean;
      readFile: (filePath: string) => string;
    };

    comfyAPI: {
      runWorkflow: (workflow: any) => Promise<string>;
    };
  }
}
