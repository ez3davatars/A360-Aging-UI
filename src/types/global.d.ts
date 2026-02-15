export {};

declare global {
  interface Window {
    // Electron preload bridge
    savePng: (path: string, base64Data: string) => string;
    runPython: (scriptPath: string, args?: string[]) => Promise<string>;

    configAPI: {
      getConfigPath: () => string;
      getConfig: () => {
        projectRoot: string;
        excelPath: string;
        comfyOutputDir: string;
        timelineCode: string;
        timelineFolderName: string;
        baseGenerator?: string;
        defaultWorkflow?: string;
        wsHost?: string;
        wsPort?: number;
      } | null;
    };

    shellAPI: {
      openPath: (path: string) => Promise<string>;
      openExternal: (url: string) => Promise<void>;
    };

    imageAPI: {
      loadImageBase64: (filePath: string) => Promise<string | null>;
    };

    promptAPI: {
      savePromptFile: (filePath: string, content: string) => Promise<boolean>;
      pathExists: (filePath: string) => boolean;
      ensureDir: (dirPath: string) => boolean;
      readFile: (filePath: string) => string;
    };
  }
}
