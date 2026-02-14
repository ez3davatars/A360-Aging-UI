import { WatcherEvent } from "../shared/watcherEvents";

export type ImageState = {
  status: string;
  path?: string;
};

export type SubjectState = {
  promptOutputs: Record<string, ImageState>;
  anchors: Record<string, ImageState>;
  comfyOutputs: Record<string, ImageState>;
};

export type AppState = {
  subjects: Record<string, SubjectState>;
};

export const initialState: AppState = {
  subjects: {},
};

export function reducer(
  state: AppState,
  event: WatcherEvent
): AppState {
  const { subjectId, stage, image, status, path } = event;

  const subject =
    state.subjects[subjectId] ?? {
      promptOutputs: {},
      anchors: {},
      comfyOutputs: {},
    };

  const bucket =
    stage === "PROMPT_OUTPUT"
      ? "promptOutputs"
      : stage === "ANCHOR"
      ? "anchors"
      : "comfyOutputs";

  return {
    ...state,
    subjects: {
      ...state.subjects,
      [subjectId]: {
        ...subject,
        [bucket]: {
          ...subject[bucket],
          [image]: { status, path },
        },
      },
    },
  };
}
