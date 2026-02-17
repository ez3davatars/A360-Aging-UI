export {};

type A360Config = {
  projectRoot?: string;
  excelPath?: string;
  comfyOutputDir?: string;
  wsHost?: string;
  wsPort?: number;
};

declare global {
  interface Window {
    configAPI?: {
      getConfig?: () => A360Config;
      getConfigPath?: () => string;
    };

    promptAPI?: {
      ensureDir?: (dir: string) => Promise<void> | void;
      savePromptFile?: (filePath: string, contents: string) => Promise<void> | void;
    };

    imageAPI?: {
      loadImageBase64?: (filePath: string) => Promise<string | null>;
    };

    shellAPI?: {
      openPath?: (path: string) => Promise<void> | void;
    };

    runPython?: (script: string, args: string[]) => Promise<string>;

    savePng?: (absPath: string, base64: string) => string;
  }
}
