export { };

type A360Config = {
  datasetRoot: string;

  subjectRoot?: string;
  scriptsRoot?: string;

  excelPath?: string;
  comfyOutputDir?: string;

  timelineCode?: string;
  timelineFolderName?: string;

  baseGenerator?: string;
  defaultWorkflow?: string;

  wsHost?: string;
  wsPort?: number;

  pythonPath?: string;
  pythonTimeoutMs?: number;
};

declare global {
  interface Window {
    configAPI: {
      getConfig?: () => A360Config;
      getConfigPath?: () => string;
    };

    promptAPI: {
      ensureDir?: (dir: string) => Promise<void> | void;
      savePromptFile?: (
        filePath: string,
        contents: string
      ) => Promise<void> | void;
      pathExists?: (filePath: string) => boolean;
      readFile?: (filePath: string) => string;
    };

    imageAPI: {
      loadImageBase64?: (filePath: string) => Promise<string | null>;
    };

    shellAPI: {
      openPath?: (path: string) => Promise<void> | void;
      openExternal?: (url: string) => Promise<void> | void;
    };

    runPython: (script: string, args: string[]) => Promise<string>;

    savePng?: (absPath: string, base64: string) => string;
  }
}
