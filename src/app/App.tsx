import { useState, useReducer } from "react";

import SubjectCreate from "../screens/SubjectCreate";
import AnchorCanvas from "../screens/AnchorCanvas";
import SubjectDashboard from "../screens/SubjectDashboard";

import { reducer } from "../state/subjectReducer";
import { useWatcherSocket } from "../hooks/useWatcherSocket";

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

  // NEW: global observable state for watcher-driven UI
  const [state, dispatch] = useReducer(reducer, initialState);

  // NEW: connect Python watcher → reducer
  useWatcherSocket(dispatch);

  if (!subject) {
    return <SubjectCreate onCreated={setSubject} />;
  }

  return (
    <>
      <AnchorCanvas
        subjectId={subject.subjectId}
        sex={subject.sex}
        ethnicity={subject.ethnicity}
        timelineFolderAbs={subject.timelineFolderAbs}
      />

      <SubjectDashboard state={state} />
    </>
  );
}
