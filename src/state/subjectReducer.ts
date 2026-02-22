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

function bucketForStage(stage: string): keyof SubjectState {
  return stage === "PROMPT_OUTPUT"
    ? "promptOutputs"
    : stage === "ANCHOR"
      ? "anchors"
      : "comfyOutputs";
}

export function reducer(state: AppState, event: WatcherEvent): AppState {
  const { subjectId, stage, image, status, path } = event;

  if (!subjectId || !image) {
    console.warn("[Reducer] Missing subjectId or image in event", event);
    return state;
  }

  // Normalize image key: A20 -> A20.png
  const normalizedImage = image.endsWith(".png") ? image : `${image}.png`;

  const subject =
    state.subjects[subjectId] ?? {
      promptOutputs: {},
      anchors: {},
      comfyOutputs: {},
    };

  const bucket = bucketForStage(stage);

  const prev = (subject[bucket] as any)[normalizedImage] as ImageState | undefined;
  const nextPath = path ?? prev?.path;

  const nextSubject: SubjectState = {
    ...subject,
    [bucket]: {
      ...subject[bucket],
      [normalizedImage]: { status, path: nextPath },
    },
  };

  // Convenience: if we get A20/A70 through COMFY_OUTPUT, also surface it under anchors.
  if (bucket === "comfyOutputs" && (normalizedImage === "A20.png" || normalizedImage === "A70.png")) {
    const key = normalizedImage;
    const prevA = nextSubject.anchors[key];
    nextSubject.anchors = {
      ...nextSubject.anchors,
      [key]: { status, path: nextPath ?? prevA?.path },
    };
  }

  return {
    ...state,
    subjects: {
      ...state.subjects,
      [subjectId]: nextSubject,
    },
  };
}
