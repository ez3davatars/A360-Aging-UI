export type WatcherStage = "PROMPT_OUTPUT" | "ANCHOR" | "COMFY_OUTPUT";

export type WatcherStatus =
  | "WAITING"
  | "DETECTED"
  | "VALIDATED"
  | "STORED"
  | "INGESTING"
  | "INGESTED"
  | "ERROR";

export type WatcherEvent = {
  subjectId: string;
  stage: WatcherStage;
  image: string;
  status: WatcherStatus;
  path?: string;
  timestamp: string;
};
