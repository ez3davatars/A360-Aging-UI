import { useState, useReducer } from "react";

import SubjectCreate from "../screens/SubjectCreate";
import AnchorCanvas from "../screens/AnchorCanvas";
import SubjectDashboard from "../screens/SubjectDashboard";

import { reducer } from "../state/subjectReducer";
import { useWatcherSocket } from "../hooks/useWatcherSocket";
import { AppShell } from "../components/layout/AppShell";

type Subject = {
  subjectId: string;
  sex: string;
  ethnicity: string;
  fitzpatrickTone: string;
  notes: string;
  basePathRel: string;
  subjectFolderAbs: string;
  timelineFolderAbs: string;
  timelineFolderRel: string;
};

const initialState = {
  subjects: {},
};

export default function App() {
  // Step 1: create subject
  const [subject, setSubject] = useState<Subject | null>(null);

  // Global observable state for watcher-driven UI
  const [state, dispatch] = useReducer(reducer, initialState);

  // Connect Python watcher → reducer
  useWatcherSocket(dispatch);

  const Sidebar = (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center space-x-2 px-2 mb-6">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="font-bold text-white">A</span>
        </div>
        <span className="font-bold text-xl tracking-tight text-white/90">A360</span>
      </div>

      <div className="space-y-1">
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Menu
        </div>

        <button
          onClick={() => { }}
          className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-white bg-white/10 font-medium transition-all duration-200"
        >
          Dashboard
        </button>

        <button
          onClick={() => setSubject(null)}
          className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          New Subject
        </button>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={subject ? Sidebar : undefined}>
      {!subject ? (
        <div className="flex items-center justify-center min-h-full">
          <SubjectCreate onCreated={setSubject} />
        </div>
      ) : (
        <div className="space-y-6">
          <AnchorCanvas
            subjectId={subject.subjectId}
            sex={subject.sex}
            ethnicity={subject.ethnicity}
            fitzpatrickTone={subject.fitzpatrickTone}
            timelineFolderAbs={subject.timelineFolderAbs}
          />

          <SubjectDashboard
            state={state}
            activeSubjectId={subject.subjectId}
            timelineFolderAbs={subject.timelineFolderAbs.replace(/[\\/]+$/, "")}
          />

        </div>
      )}
    </AppShell>
  );
}
